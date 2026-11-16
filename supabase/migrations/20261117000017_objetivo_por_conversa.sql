-- 017 · O objetivo pertence à conversa, não ao perfil.
-- ADITIVA: themes e intentions continuam preenchidos (derivados) para não perder dados
-- nem quebrar leituras antigas.

-- 1. Perfil: "posso ajudar com" e "quero conversar sobre".
alter table public.professional_profiles
 add column can_help text[] not null default '{}' check(cardinality(can_help)<=8 and can_help <@ array['situacao','entrevista','apresentacao','portfolio','carreira','rede','projeto','outro']),
 add column want_talk text[] not null default '{}' check(cardinality(want_talk)<=8 and want_talk <@ array['situacao','entrevista','apresentacao','portfolio','carreira','rede','projeto','outro']);
-- Conversão sem perda: quem compartilhava pode ajudar com seus temas; quem buscava quer conversar sobre eles.
update public.professional_profiles set
 can_help=case when intentions @> array['compartilhar'] then themes else '{}' end,
 want_talk=case when intentions @> array['buscar'] then themes else '{}' end;
alter table public.professional_profiles add constraint professional_profiles_algum_objetivo check(cardinality(can_help)+cardinality(want_talk)>0);

-- 2. Sugestões já mostradas em cada busca (para "ver outra sugestão" não repetir).
create table public.conversation_suggestions (
 request_id uuid not null references public.conversation_requests(id) on delete cascade,
 candidate_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(request_id,candidate_id)
);
alter table public.conversation_suggestions enable row level security;
revoke all on public.conversation_suggestions from anon,authenticated;
grant all on public.conversation_suggestions to service_role;
-- Sem política para participantes: uso interno das RPCs.

-- 3. Vários trabalhos de IA por busca (um por sugestão), presos à candidata.
alter table public.conversation_jobs drop constraint if exists conversation_jobs_request_id_key;
alter table public.conversation_jobs add column candidate_id uuid references public.profiles(id) on delete set null;
update public.conversation_jobs j set candidate_id=r.candidate_id from public.conversation_requests r where r.id=j.request_id;
create index conversation_jobs_request on public.conversation_jobs(request_id,created_at desc);

-- 4. Seleção determinística: o objetivo da busca precisa estar no "posso ajudar com" da outra pessoa.
create function public.mvp_pick_candidate(owner uuid,goal text,exclude uuid[]) returns uuid language sql stable security definer set search_path='' as $$
 select p.profile_id from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id
 join public.professional_profiles mine on mine.profile_id=owner
 where p.profile_id<>owner and p.available and pr.status='aprovado'
 and not (p.profile_id=any(coalesce(exclude,'{}')))
 and not public.mvp_blocked(owner,p.profile_id)
 and p.can_help @> array[goal] and p.channels && mine.channels
 and (exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email')) or p.slots && mine.slots)
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 order by (case when p.areas && mine.areas then 4 else 0 end + case when p.moment<>mine.moment then 1 else 0 end + case when p.slots && mine.slots then 2 else 0 end) desc,p.profile_id limit 1;
$$;
create or replace function public.mvp_match_request() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen uuid;
begin
 chosen:=public.mvp_pick_candidate(new.owner_id,new.goal,'{}');
 new.candidate_id:=chosen;new.state:=case when chosen is null then 'sem_candidata' else 'pronta' end;
 if chosen is not null then new.explanation:='Ela pode ajudar com o objetivo que você escolheu e vocês têm um canal em comum.';end if;
 return new;
end;$$;

-- Fila: cria o trabalho para a candidata atual e avisa o worker só com o id da busca.
create function public.mvp_queue_job(request uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;url text;secret text;
begin
 select * into r from public.conversation_requests where id=request;
 if r.candidate_id is null or not (select ai_consent from public.professional_profiles where profile_id=r.owner_id) or not (select ai_consent from public.professional_profiles where profile_id=r.candidate_id) then return;end if;
 insert into public.conversation_jobs(request_id,candidate_id) values(r.id,r.candidate_id);
 select decrypted_secret into url from vault.decrypted_secrets where name='mvp_worker_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='mvp_worker_secret';
 if url is not null and secret is not null then
  begin
  perform net.http_post(url:=url,headers:=jsonb_build_object('Content-Type','application/json','x-mvp-secret',secret),body:=jsonb_build_object('request_id',r.id),timeout_milliseconds:=10000);
  exception when others then update public.conversation_jobs set state='falha',error_code='fila_indisponivel',finished_at=now() where request_id=r.id and state='pendente';
  end;
 end if;
end;$$;
create or replace function public.mvp_enqueue() returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.mvp_queue_job(new.id);return new;end;$$;

-- 5. Nova busca: só o objetivo e o contexto (o contexto nunca vai para a IA).
drop function if exists public.mvp_create_request(text,text,text);
create function public.mvp_create_request(goal text,description text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;uid uuid:=auth.uid();
begin
 if uid is null or not public.eu_aprovada() or not exists(select 1 from public.professional_profiles where profile_id=uid and available) then raise exception 'complete o perfil e aguarde aprovação';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if (select count(*) from public.conversation_requests where owner_id=uid and created_at>now()-interval '24 hours')>=3 then raise exception 'limite de três solicitações em 24 horas';end if;
 insert into public.conversation_requests(owner_id,intention,goal,description) values(uid,'buscar',goal,nullif(btrim(description),'')) returning id into result;return result;
end;$$;

-- 6. "Ver outra sugestão": próxima candidata sem repetir; não conta no limite de buscas.
create function public.mvp_next_suggestion(request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;chosen uuid;
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or not public.eu_aprovada() or exists(select 1 from public.conversation_invites where request_id=r.id) then raise exception 'busca indisponível';end if;
 if r.candidate_id is not null then insert into public.conversation_suggestions(request_id,candidate_id) values(r.id,r.candidate_id) on conflict do nothing;end if;
 chosen:=public.mvp_pick_candidate(r.owner_id,r.goal,array(select candidate_id from public.conversation_suggestions where request_id=r.id));
 update public.conversation_jobs set state='falha',error_code='sugestao_trocada',finished_at=now() where request_id=r.id and state in ('pendente','executando');
 update public.conversation_requests set candidate_id=chosen,state=case when chosen is null then 'sem_candidata' else 'pronta' end,mode='basica',questions='[]',draft=null,
  explanation=case when chosen is null then explanation else 'Ela pode ajudar com o objetivo que você escolheu e vocês têm um canal em comum.' end where id=r.id;
 perform public.mvp_queue_job(r.id);
 return chosen;
end;$$;

-- 7. Perfil: grava as duas listas e deriva themes/intentions (compatibilidade).
create or replace function public.mvp_save_profile(p jsonb,c jsonb,terms boolean) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();help text[];talk text[];
begin
 if uid is null or terms is distinct from true then raise exception 'entre e aceite os termos';end if;
 if not public.mvp_text_safe(p->>'name') then raise exception 'não inclua contatos ou links no nome de apresentação';end if;
 if p ? 'can_help' or p ? 'want_talk' then
  help:=array(select distinct jsonb_array_elements_text(coalesce(p->'can_help','[]')));
  talk:=array(select distinct jsonb_array_elements_text(coalesce(p->'want_talk','[]')));
 else
  help:=case when p->'intentions' ? 'compartilhar' then array(select jsonb_array_elements_text(p->'themes')) else '{}' end;
  talk:=case when p->'intentions' ? 'buscar' then array(select jsonb_array_elements_text(p->'themes')) else '{}' end;
 end if;
 if cardinality(help)+cardinality(talk)=0 then raise exception 'escolha ao menos um assunto';end if;
 insert into public.profiles(id,apelido,foto_path,de_onde_vem,onde_esta,areas,formas_conexao)
 values(uid,btrim(p->>'name'),nullif(p->>'photo',''),btrim(p->>'occupation'),'estudando',array['perfil profissional'],array['mensagem'])
 on conflict(id) do update set apelido=excluded.apelido,foto_path=excluded.foto_path;
 insert into public.consents(profile_id,autodeclaracao,aceita_ser_recomendada,entende_contato_pos_aceite,sabe_que_pode_apagar,aceita_termo_conduta)
 values(uid,true,true,true,true,true) on conflict(profile_id) do nothing;
 insert into public.professional_profiles(profile_id,occupation,moment,areas,themes,intentions,can_help,want_talk,channels,slots,ai_consent,available)
 values(uid,btrim(p->>'occupation'),p->>'moment',array(select jsonb_array_elements_text(p->'areas')),
  array(select distinct x from unnest(help||talk) x),
  array_remove(array[case when cardinality(talk)>0 then 'buscar' end,case when cardinality(help)>0 then 'compartilhar' end],null),
  help,talk,array(select jsonb_array_elements_text(p->'channels')),array(select jsonb_array_elements_text(p->'slots')),coalesce((p->>'ai_consent')::boolean,false),coalesce((p->>'available')::boolean,true))
 on conflict(profile_id) do update set occupation=excluded.occupation,moment=excluded.moment,areas=excluded.areas,themes=excluded.themes,intentions=excluded.intentions,can_help=excluded.can_help,want_talk=excluded.want_talk,channels=excluded.channels,slots=excluded.slots,ai_consent=excluded.ai_consent,available=excluded.available,updated_at=now();
 insert into public.professional_contacts(profile_id,linkedin,whatsapp,email,meet)
 values(uid,nullif(btrim(c->>'linkedin'),''),nullif(btrim(c->>'whatsapp'),''),nullif(btrim(c->>'email'),''),nullif(btrim(c->>'meet'),''))
 on conflict(profile_id) do update set linkedin=excluded.linkedin,whatsapp=excluded.whatsapp,email=excluded.email,meet=excluded.meet;
end;$$;

-- 8. Worker: trabalho preso à candidata; só categorias (objetivo, áreas, momento e assuntos permitidos).
create or replace function public.mvp_claim_job(request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.conversation_jobs;r public.conversation_requests;a public.professional_profiles;b public.professional_profiles;
begin
 select * into r from public.conversation_requests where id=request;
 if not found then return null;end if;
 select * into j from public.conversation_jobs where request_id=request and state='pendente' and candidate_id is not distinct from r.candidate_id order by created_at desc limit 1 for update skip locked;
 if not found then return null;end if;
 select * into a from public.professional_profiles where profile_id=r.owner_id;
 select * into b from public.professional_profiles where profile_id=r.candidate_id;
 if a.ai_consent is distinct from true or b.ai_consent is distinct from true or public.mvp_blocked(r.owner_id,r.candidate_id) or not a.available or not b.available or (select count(*) from public.profiles where id in(r.owner_id,r.candidate_id) and status='aprovado')<>2 then
 update public.conversation_jobs set state='sem_consentimento',finished_at=now() where id=j.id;return null;end if;
 perform pg_advisory_xact_lock(726041);
 if (select count(*) from public.conversation_jobs where state<>'pendente' and created_at>now()-interval '24 hours')>=30 then
 update public.conversation_jobs set state='falha',error_code='limite_global',finished_at=now() where id=j.id;return null;end if;
 update public.conversation_jobs set state='executando' where id=j.id;
 return jsonb_build_object('job_id',j.id,'goal',r.goal,'a',jsonb_build_object('areas',a.areas,'moment',a.moment,'themes',a.want_talk),'b',jsonb_build_object('areas',b.areas,'moment',b.moment,'themes',b.can_help));
end;$$;
create or replace function public.mvp_finish_job(job uuid,result jsonb,model text,input_tokens integer,output_tokens integer,error_code text default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;jc uuid;
begin
 select cr.* into r from public.conversation_requests cr join public.conversation_jobs j on j.request_id=cr.id where j.id=job and j.state='executando' for update of cr;
 select j.candidate_id into jc from public.conversation_jobs j where j.id=job;
 if r.id is null then raise exception 'execução indisponível';end if;
 if error_code is null and jc is distinct from r.candidate_id then error_code:='sugestao_trocada';end if;
 if error_code is null and result is not null
 and (select ai_consent from public.professional_profiles where profile_id=r.owner_id)
 and (select ai_consent from public.professional_profiles where profile_id=r.candidate_id)
 and not public.mvp_blocked(r.owner_id,r.candidate_id) then
 if jsonb_typeof(result->'questions') is distinct from 'array' or jsonb_array_length(result->'questions')<>2 or length(result->>'explanation') not between 1 and 400 or length(result->>'draft') not between 1 and 400 then raise exception 'resposta inválida';end if;
 update public.conversation_requests set mode='generativa',explanation=result->>'explanation',questions=result->'questions',draft=result->>'draft' where id=r.id;
 else error_code:=coalesce(error_code,'consentimento_revogado');end if;
 update public.conversation_jobs set state=case when mvp_finish_job.error_code is null then 'concluida' else 'falha' end,error_code=left(mvp_finish_job.error_code,60),model=left(mvp_finish_job.model,80),input_tokens=greatest(mvp_finish_job.input_tokens,0),output_tokens=greatest(mvp_finish_job.output_tokens,0),finished_at=now() where id=job;
end;$$;
-- Estado visível à participante: o trabalho mais recente da busca.
create or replace function public.mvp_job_status(request_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.conversation_requests;j public.conversation_jobs;begin
 select * into r from public.conversation_requests r0 where r0.id=mvp_job_status.request_id and r0.owner_id=auth.uid();
 if not found then raise exception 'solicitação indisponível';end if;
 select * into j from public.conversation_jobs where conversation_jobs.request_id=r.id order by created_at desc limit 1;
 return jsonb_build_object('state',coalesce(j.state,'sem_ia'),'mode',r.mode,'has_candidate',r.candidate_id is not null,'error_code',case when j.error_code in ('limite_provedor','limite_global','ia_nao_configurada') then j.error_code when j.error_code is not null then 'indisponivel' end);
end;$$;

revoke all on function public.mvp_pick_candidate(uuid,text,uuid[]),public.mvp_queue_job(uuid),public.mvp_create_request(text,text),public.mvp_next_suggestion(uuid) from public,anon,authenticated;
grant execute on function public.mvp_pick_candidate(uuid,text,uuid[]),public.mvp_queue_job(uuid) to service_role;
grant execute on function public.mvp_create_request(text,text),public.mvp_next_suggestion(uuid) to authenticated,service_role;
