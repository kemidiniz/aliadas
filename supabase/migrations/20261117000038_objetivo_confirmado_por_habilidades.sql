-- 038 · IA sugere habilidades; a participante confirma antes da busca determinística.
create table public.conversation_objectives (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 description text not null check(char_length(btrim(description)) between 8 and 300),
 suggested_skills text[] not null default '{}' check(public.mvp_habilidades_valid(suggested_skills) and cardinality(suggested_skills)<=3),
 selected_skills text[] not null default '{}' check(public.mvp_habilidades_valid(selected_skills) and cardinality(selected_skills)<=3),
 excluded_skills text[] not null default '{}', attempts integer not null default 1 check(attempts between 1 and 3),
 state text not null default 'pendente' check(state in ('pendente','executando','pronta')),
 mode text not null default 'regra' check(mode in ('ia','regra')), ai_authorized boolean not null default false,
 confirmed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.conversation_objectives enable row level security;
revoke all on public.conversation_objectives from public,anon,authenticated;
grant select on public.conversation_objectives to authenticated;
grant all on public.conversation_objectives to service_role;
create policy "objetivos: somente dona" on public.conversation_objectives for select to authenticated using(owner_id=auth.uid());
create index conversation_objectives_owner_created on public.conversation_objectives(owner_id,created_at desc);
alter table public.conversation_requests add column objective_id uuid unique references public.conversation_objectives(id) on delete set null;
alter table public.conversation_jobs alter column request_id drop not null;
alter table public.conversation_jobs add column objective_id uuid references public.conversation_objectives(id) on delete cascade, add column objective_attempt integer, add column result_skills text[] not null default '{}' check(public.mvp_habilidades_valid(result_skills) and cardinality(result_skills)<=3);
alter table public.conversation_jobs add constraint conversation_jobs_target check(num_nonnulls(request_id,objective_id)=1);
create unique index conversation_jobs_objective_attempt on public.conversation_jobs(objective_id,objective_attempt) where objective_id is not null;

create function public.mvp_queue_objective() returns trigger language plpgsql security definer set search_path='' as $$
declare url text;secret text;begin
 if not new.ai_authorized then return new;end if;
 insert into public.conversation_jobs(objective_id,objective_attempt) values(new.id,new.attempts);
 select decrypted_secret into url from vault.decrypted_secrets where name='mvp_worker_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='mvp_worker_secret';
 if url is null or secret is null then
  update public.conversation_jobs set state='falha',error_code='ia_nao_configurada',finished_at=now() where objective_id=new.id and objective_attempt=new.attempts;
  update public.conversation_objectives set state='pronta',mode='regra' where id=new.id;return new;
 end if;
 begin perform net.http_post(url:=url,headers:=jsonb_build_object('Content-Type','application/json','x-mvp-secret',secret),body:=jsonb_build_object('objective_id',new.id),timeout_milliseconds:=20000);
 exception when others then
 update public.conversation_jobs set state='falha',error_code='fila_indisponivel',finished_at=now() where objective_id=new.id and objective_attempt=new.attempts;
 update public.conversation_objectives set state='pronta',mode='regra' where id=new.id;
 end;return new;
end;$$;
create trigger objective_queue after insert or update of attempts on public.conversation_objectives for each row execute function public.mvp_queue_objective();
create function public.mvp_start_objective(description text,use_ai boolean default false,consent_version text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();res uuid;begin
 if not public.mvp_account_active(uid) then raise exception 'Sua conta não está disponível para novas buscas.';end if;
 if char_length(btrim(coalesce(description,''))) not between 8 and 300 then raise exception 'Conte seu objetivo profissional em 8 a 300 caracteres.';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if (select count(*) from public.conversation_objectives where owner_id=uid and created_at>now()-interval '24 hours')>=3 then raise exception 'Limite de três objetivos em 24 horas.';end if;
 if use_ai then
  if consent_version is distinct from 'habilidades-v1' then raise exception 'Confirme o consentimento para usar a IA.';end if;
  update public.professional_profiles set ai_consent=true,ai_consent_version='habilidades-v1' where profile_id=uid;
  if not found then raise exception 'Complete primeiro seu perfil profissional.';end if;
 end if;
 insert into public.conversation_objectives(owner_id,description,ai_authorized,state) values(uid,btrim(description),use_ai,case when use_ai then 'pendente' else 'pronta' end) returning id into res;
 return res;
end;$$;
create function public.mvp_retry_objective(objective uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.conversation_objectives;begin
 select * into o from public.conversation_objectives where id=objective and owner_id=auth.uid() for update;
 if not found or not public.mvp_account_active(auth.uid()) or o.confirmed_at is not null or not o.ai_authorized or o.state<>'pronta' or o.attempts>=3 then raise exception 'Não é possível pedir outras habilidades agora.';end if;
 if not exists(select 1 from public.professional_profiles where profile_id=auth.uid() and ai_consent and ai_consent_version='habilidades-v1') then raise exception 'Confirme seu consentimento no perfil.';end if;
 update public.conversation_objectives set excluded_skills=array(select distinct unnest(o.excluded_skills||o.suggested_skills)),suggested_skills='{}',attempts=attempts+1,state='pendente',mode='regra',updated_at=now() where id=o.id;
end;$$;
create function public.mvp_claim_objective(objective uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.conversation_objectives;j public.conversation_jobs;p public.professional_profiles;code text;begin
 select * into o from public.conversation_objectives where id=objective for update;
 if not found or o.confirmed_at is not null then return null;end if;
 select * into j from public.conversation_jobs where objective_id=o.id and objective_attempt=o.attempts and state='pendente' for update skip locked;
 if not found then return null;end if;
 select * into p from public.professional_profiles where profile_id=o.owner_id;
 if not coalesce(p.ai_consent,false) or p.ai_consent_version<>'habilidades-v1' or not o.ai_authorized or not public.mvp_account_active(o.owner_id) then code:='consentimento_revogado';end if;
 perform pg_advisory_xact_lock(726041);
 if (select count(*) from public.conversation_jobs where started_at>now()-interval '24 hours' or (started_at is null and created_at>now()-interval '24 hours' and (state in ('executando','concluida') or coalesce(input_tokens,0)+coalesce(output_tokens,0)>0)))>=30 then code:='limite_global';end if;
 if code is not null then update public.conversation_jobs set state='falha',error_code=code,finished_at=now() where id=j.id;update public.conversation_objectives set state='pronta',mode='regra' where id=o.id;return null;end if;
 update public.conversation_jobs set state='executando',started_at=now() where id=j.id;
 update public.conversation_objectives set state='executando',updated_at=now() where id=o.id;
 return jsonb_build_object('job_id',j.id,'description',o.description,'excluded_skills',o.excluded_skills,'a',jsonb_build_object('situacao',p.situacao,'area_principal',p.area_principal,'ai_consent',true));
end;$$;
create function public.mvp_finish_objective(job uuid,result jsonb,model text,input_tokens integer,output_tokens integer,error_code text default null) returns void language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare o public.conversation_objectives;j public.conversation_jobs;skills text[]:='{}';begin
 select oo.* into o from public.conversation_objectives oo join public.conversation_jobs jj on jj.objective_id=oo.id where jj.id=job for update of oo;
 select * into j from public.conversation_jobs where id=job for update;
 if o.id is null or j.started_at is null then raise exception 'Execução indisponível.';end if;
 if j.state<>'executando' then return;end if;
 if o.confirmed_at is not null or j.objective_attempt<>o.attempts then error_code:=coalesce(error_code,'revisao_iniciada');end if;
 if not exists(select 1 from public.professional_profiles where profile_id=o.owner_id and ai_consent and ai_consent_version='habilidades-v1') then error_code:='consentimento_revogado';end if;
 if error_code is null then begin
  if result is null or (select count(*) from jsonb_object_keys(result))<>1 or jsonb_typeof(result->'habilidades_sugeridas') is distinct from 'array' then raise exception 'inválida';end if;
  skills:=array(select jsonb_array_elements_text(result->'habilidades_sugeridas'));
  if cardinality(skills)>3 or not public.mvp_habilidades_valid(skills) or skills && o.excluded_skills then raise exception 'inválida';end if;
 exception when others then error_code:='saida_invalida';skills:='{}';end;end if;
 update public.conversation_jobs set result_skills=case when error_code is null then skills else '{}' end,state=case when error_code is null then 'concluida' else 'falha' end,model=left(model,80),input_tokens=greatest(input_tokens,0),output_tokens=greatest(output_tokens,0),error_code=error_code,finished_at=now() where id=j.id;
 if o.confirmed_at is null and j.objective_attempt=o.attempts then
  update public.conversation_objectives set suggested_skills=case when error_code is null then skills else '{}' end,state='pronta',mode=case when error_code is null then 'ia' else 'regra' end,updated_at=now() where id=o.id;
 end if;
end;$$;
-- Nenhum dado de candidata vai à IA; o cruzamento usa somente habilidades confirmadas.
create function public.mvp_skill_candidates(owner uuid,needs text[],exclude uuid[] default '{}') returns table(candidate uuid,skills text[],matches integer,recent bigint) language sql volatile security definer set search_path='' as $$
 select e.candidate,e.habilidades,(select count(*)::int from unnest(e.habilidades) h where h=any(needs)),e.recent
 from public.mvp_eligible_candidates(owner,'outro',exclude) e where e.habilidades && needs
 order by 3 desc,4 asc,random();
$$;
create or replace function public.mvp_match_request() returns trigger language plpgsql security definer set search_path='' as $$
declare needs text[];begin
 if new.objective_id is not null then
  select selected_skills into needs from public.conversation_objectives where id=new.objective_id and owner_id=new.owner_id and confirmed_at is not null;
  if cardinality(needs) is null or cardinality(needs)=0 then raise exception 'Confirme as habilidades antes de encontrar sua aliada.';end if;
  select candidate into new.candidate_id from public.mvp_skill_candidates(new.owner_id,needs,'{}') limit 1;
  new.habilidades_necessarias:=needs;new.recommendation_version:='objetivo-v1';
  new.habilidades_que_ajudam:=array(select h from public.professional_profiles p,unnest(p.habilidades) h where p.profile_id=new.candidate_id and h=any(needs));
 else
  new.candidate_id:=public.mvp_pick_candidate(new.owner_id,new.goal,'{}');new.recommendation_version:='habilidades-v1';
  new.habilidades_necessarias:=public.mvp_goal_skills(new.goal);new.habilidades_que_ajudam:=public.mvp_candidate_skills(new.candidate_id,new.goal);
 end if;
 new.state:=case when new.candidate_id is null then 'sem_candidata' else 'pronta' end;new.mode:='regra';return new;
end;$$;
create function public.mvp_find_for_objective(objective uuid,skills text[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.conversation_objectives;res uuid;begin
 select * into o from public.conversation_objectives where id=objective and owner_id=auth.uid() for update;
 if not found or not public.mvp_account_active(auth.uid()) then raise exception 'Objetivo indisponível.';end if;
 if not public.mvp_habilidades_valid(skills) or cardinality(skills) not between 1 and 3 then raise exception 'Escolha de uma a três habilidades.';end if;
 if o.mode='ia' and cardinality(o.suggested_skills)>0 and not skills <@ o.suggested_skills then raise exception 'Escolha as habilidades sugeridas ou use a seleção manual.';end if;
 select id into res from public.conversation_requests where objective_id=o.id;
 if res is not null then return jsonb_build_object('request_id',res);end if;
 update public.conversation_objectives set selected_skills=skills,confirmed_at=now(),state='pronta' where id=o.id;
 if not public.mvp_pode_buscar(auth.uid()) then return jsonb_build_object('complete_profile',true);end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.conversation_requests where owner_id=auth.uid() and created_at>now()-interval '24 hours')>=3 then raise exception 'Limite de três buscas em 24 horas.';end if;
 insert into public.conversation_requests(owner_id,intention,goal,description,objective_id) values(auth.uid(),'buscar','outro',o.description,o.id) returning id into res;
 return jsonb_build_object('request_id',res);
end;$$;
-- Escolher manualmente também encerra uma chamada demorada, sem sobrescrever a revisão.
create function public.mvp_manual_objective(objective uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.conversation_objectives set state='pronta',mode='regra',suggested_skills='{}',confirmed_at=now() where id=objective and owner_id=auth.uid() and not exists(select 1 from public.conversation_requests where objective_id=objective);
 if not found then raise exception 'Objetivo indisponível.';end if;
end;$$;
-- Mantém a função antiga só para histórico; novas buscas não geram ranking por IA.
create or replace function public.mvp_queue_job(request uuid) returns void language plpgsql security definer set search_path='' as $$begin return;end;$$;

create or replace function public.mvp_next_suggestion(request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;chosen uuid;skills text[];ai boolean:=false;excluded uuid[];
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or not public.mvp_account_active(auth.uid()) or exists(select 1 from public.conversation_invites where request_id=r.id) then raise exception 'busca indisponível';end if;
 if r.objective_id is not null then
  if r.candidate_id is not null then insert into public.conversation_suggestions(request_id,candidate_id) values(r.id,r.candidate_id) on conflict do nothing;end if;
  excluded:=array(select candidate_id from public.conversation_suggestions where request_id=r.id);
  select candidate into chosen from public.mvp_skill_candidates(r.owner_id,r.habilidades_necessarias,excluded) limit 1;
  skills:=array(select h from public.professional_profiles p,unnest(p.habilidades) h where p.profile_id=chosen and h=any(r.habilidades_necessarias));
  update public.conversation_requests set candidate_id=chosen,habilidades_que_ajudam=skills,state=case when chosen is null then 'sem_candidata' else 'pronta' end,mode='regra',next_count=next_count+1,fallback_locked=true where id=r.id;
  return chosen;
 end if;
 if r.candidate_id is not null then insert into public.conversation_suggestions(request_id,candidate_id) values(r.id,r.candidate_id) on conflict do nothing;end if;
 excluded:=array(select candidate_id from public.conversation_suggestions where request_id=r.id);
 if r.mode='ia' then
  select p.candidate_id,p.habilidades_que_ajudam into chosen,skills from public.conversation_recommendation_pool p join public.mvp_eligible_candidates(r.owner_id,r.goal,excluded) e on e.candidate=p.candidate_id
   where p.request_id=r.id and p.posicao is not null and e.ai_consent and p.habilidades_que_ajudam <@ e.habilidades order by p.posicao limit 1;
  ai:=chosen is not null;
 end if;
 if chosen is null then chosen:=public.mvp_pick_candidate(r.owner_id,r.goal,excluded);skills:=public.mvp_candidate_skills(chosen,r.goal);end if;
 update public.conversation_jobs set state='falha',error_code='revisao_iniciada',finished_at=now() where request_id=r.id and state in ('pendente','executando');
 update public.conversation_requests set candidate_id=chosen,state=case when chosen is null then 'sem_candidata' else 'pronta' end,mode=case when ai then 'ia' else 'regra' end,
  habilidades_que_ajudam=coalesce(skills,'{}'),habilidades_necessarias=case when ai then habilidades_necessarias else public.mvp_goal_skills(r.goal) end,next_count=next_count+1,fallback_locked=true where id=r.id;
 return chosen;
end;$$;
create or replace function public.mvp_invite(request uuid,message text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;result uuid;
begin
 select * into r from public.conversation_requests where id=request and owner_id=auth.uid() for update;
 if not found or not public.mvp_account_active(auth.uid()) or not exists(select 1 from public.mvp_eligible_candidates(r.owner_id,r.goal,'{}') e where candidate=r.candidate_id and (r.objective_id is null or e.habilidades && r.habilidades_necessarias)) then raise exception 'convite indisponível';end if;
 update public.conversation_requests set fallback_locked=true where id=r.id;
 insert into public.conversation_invites(request_id,sender_id,recipient_id,message,goal) values(r.id,r.owner_id,r.candidate_id,message,r.goal) returning id into result;return result;
end;$$;

revoke all on function public.mvp_queue_objective(),public.mvp_start_objective(text,boolean,text),public.mvp_retry_objective(uuid),public.mvp_claim_objective(uuid),public.mvp_finish_objective(uuid,jsonb,text,integer,integer,text),public.mvp_skill_candidates(uuid,text[],uuid[]),public.mvp_find_for_objective(uuid,text[]),public.mvp_manual_objective(uuid) from public,anon,authenticated;
grant execute on function public.mvp_start_objective(text,boolean,text),public.mvp_retry_objective(uuid),public.mvp_find_for_objective(uuid,text[]),public.mvp_manual_objective(uuid) to authenticated;
grant execute on function public.mvp_claim_objective(uuid),public.mvp_finish_objective(uuid,jsonb,text,integer,integer,text),public.mvp_skill_candidates(uuid,text[],uuid[]) to service_role;
