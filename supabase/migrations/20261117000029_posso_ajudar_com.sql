-- 029 · No perfil, só "Posso ajudar com"; o objetivo é escolhido na busca.
-- want_talk e intentions ficam no banco, sem uso na tela. Um perfil sem
-- nenhum assunto é válido: a pessoa só busca. (A regra antiga
-- professional_profiles_algum_objetivo já saiu na 024; aqui só confirmamos.)
alter table public.professional_profiles drop constraint if exists professional_profiles_algum_objetivo;

-- Para buscar: situação, área, interesses e pelo menos um contato.
create or replace function public.mvp_pode_buscar(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.professional_profiles p where p.profile_id=uid and p.available
  and p.situacao is not null and p.area_principal is not null and cardinality(p.interesses)>0
  and exists(select 1 from unnest(p.channels) ch where ch in ('linkedin','whatsapp','email')));
$$;

-- Cadastro: só "Posso ajudar com". intentions é derivada (buscar sempre; compartilhar se marcou algo).
create or replace function public.mvp_save_profile(p jsonb,c jsonb,terms boolean) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();help text[];intents text[];sit text;principal text;inter text[];todas text[];
begin
 if uid is null or terms is distinct from true then raise exception 'entre e aceite os termos';end if;
 if not public.mvp_text_safe(p->>'name') then raise exception 'não inclua contatos ou links no nome de apresentação';end if;
 if p ? 'can_help' then
  help:=array(select distinct jsonb_array_elements_text(coalesce(p->'can_help','[]')));
 else -- formato antigo: themes + intentions
  help:=case when p->'intentions' ? 'compartilhar' then array(select jsonb_array_elements_text(coalesce(p->'themes','[]'))) else '{}' end;
 end if;
 intents:=array_remove(array['buscar',case when cardinality(help)>0 then 'compartilhar' end],null);
 todas:=array(select jsonb_array_elements_text(coalesce(p->'areas','[]')));
 sit:=coalesce(nullif(p->>'situacao',''),public.mvp_situacao_de(p->>'moment'));
 principal:=coalesce(nullif(p->>'area_principal',''),todas[1]);
 inter:=case when p ? 'interesses' then array(select distinct jsonb_array_elements_text(p->'interesses')) else todas[1:5] end;
 if sit is null or principal is null then raise exception 'conte sua situação e sua área';end if;
 todas:=array(select distinct x from unnest(array[principal]||inter) x);
 insert into public.profiles(id,apelido,foto_path,de_onde_vem,onde_esta,areas,formas_conexao)
 values(uid,btrim(p->>'name'),nullif(p->>'photo',''),'perfil profissional','estudando',array['perfil profissional'],array['mensagem'])
 on conflict(id) do update set apelido=excluded.apelido,foto_path=excluded.foto_path;
 insert into public.consents(profile_id,autodeclaracao,aceita_ser_recomendada,entende_contato_pos_aceite,sabe_que_pode_apagar,aceita_termo_conduta)
 values(uid,true,true,true,true,true) on conflict(profile_id) do nothing;
 insert into public.professional_profiles(profile_id,occupation,moment,areas,situacao,area_principal,interesses,themes,intentions,can_help,want_talk,channels,slots,ai_consent,available)
 values(uid,nullif(btrim(p->>'occupation'),''),nullif(p->>'moment',''),todas,sit,principal,inter,help,intents,
  help,'{}',array(select jsonb_array_elements_text(coalesce(p->'channels','[]'))),array(select jsonb_array_elements_text(coalesce(p->'slots','[]'))),coalesce((p->>'ai_consent')::boolean,false),coalesce((p->>'available')::boolean,true))
 on conflict(profile_id) do update set occupation=coalesce(excluded.occupation,professional_profiles.occupation),moment=coalesce(excluded.moment,professional_profiles.moment),areas=excluded.areas,situacao=excluded.situacao,area_principal=excluded.area_principal,interesses=excluded.interesses,
  themes=excluded.themes,intentions=excluded.intentions,can_help=excluded.can_help,channels=excluded.channels,
  slots=case when p ? 'slots' then excluded.slots else professional_profiles.slots end,ai_consent=excluded.ai_consent,available=excluded.available,updated_at=now();
 insert into public.professional_contacts(profile_id,linkedin,whatsapp,email,meet,nome_completo)
 values(uid,nullif(btrim(c->>'linkedin'),''),nullif(btrim(c->>'whatsapp'),''),nullif(btrim(c->>'email'),''),nullif(btrim(c->>'meet'),''),nullif(btrim(c->>'nome_completo'),''))
 on conflict(profile_id) do update set linkedin=excluded.linkedin,whatsapp=excluded.whatsapp,email=excluded.email,
  meet=case when c ? 'meet' then excluded.meet else professional_contacts.meet end,
  nome_completo=case when c ? 'nome_completo' then excluded.nome_completo else professional_contacts.nome_completo end;
end;$$;

-- Ser indicada: perfil completo para buscar + o objetivo em "posso ajudar com".
create or replace function public.mvp_pick_candidate(owner uuid,goal text,exclude uuid[]) returns uuid language sql volatile security definer set search_path='' as $$
 select p.profile_id from public.professional_profiles p join public.profiles pr on pr.id=p.profile_id
 join public.professional_profiles mine on mine.profile_id=owner
 where p.profile_id<>owner and p.available and pr.status='aprovado'
 and not (p.profile_id=any(coalesce(exclude,'{}')))
 and not public.mvp_blocked(owner,p.profile_id)
 and p.can_help @> array[goal]
 and cardinality(p.interesses)>0
 and exists(select 1 from unnest(p.channels) ch where ch=any(mine.channels) and ch in ('linkedin','whatsapp','email'))
 and not exists(select 1 from public.conversation_invites i where i.state in ('pendente','aceita') and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and not exists(select 1 from public.conversation_feedback f join public.conversation_invites i on i.id=f.invite_id
  where f.utility<=2 and least(i.sender_id,i.recipient_id)=least(owner,p.profile_id) and greatest(i.sender_id,i.recipient_id)=greatest(owner,p.profile_id))
 and (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.state='pendente')<2
 order by (case when p.area_principal<>'decidindo' and (p.area_principal=any(mine.interesses) or p.area_principal=mine.area_principal) then 4 else 0 end
  + case when p.interesses && mine.interesses then 2 else 0 end) desc,
  (select count(*) from public.conversation_invites i where i.recipient_id=p.profile_id and i.created_at>now()-interval '14 days') asc,
  random()
 limit 1;
$$;

-- IA: o objetivo + situação, área e interesses de quem pede; + "posso ajudar com" de quem ajuda.
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
 return jsonb_build_object('job_id',j.id,'goal',r.goal,
  'a',jsonb_build_object('situacao',a.situacao,'area_principal',a.area_principal,'interesses',a.interesses),
  'b',jsonb_build_object('situacao',b.situacao,'area_principal',b.area_principal,'interesses',b.interesses,'themes',b.can_help));
end;$$;
