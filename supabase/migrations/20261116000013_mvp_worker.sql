-- Funções exclusivas da Edge Function. Não concede acesso a usuárias.
create function public.mvp_worker_secret() returns text language sql stable security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='mvp_worker_secret' limit 1;
$$;
create function public.mvp_claim_job(request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.conversation_jobs;r public.conversation_requests;a public.professional_profiles;b public.professional_profiles;
begin
 select * into j from public.conversation_jobs where request_id=request and state='pendente' for update skip locked;
 if not found then return null;end if;
 select * into r from public.conversation_requests where id=request;
 select * into a from public.professional_profiles where profile_id=r.owner_id;
 select * into b from public.professional_profiles where profile_id=r.candidate_id;
 if a.ai_consent is distinct from true or b.ai_consent is distinct from true or public.mvp_blocked(r.owner_id,r.candidate_id) or not a.available or not b.available or (select count(*) from public.profiles where id in(r.owner_id,r.candidate_id) and status='aprovado')<>2 then
 update public.conversation_jobs set state='sem_consentimento',finished_at=now() where id=j.id;return null;end if;
 perform pg_advisory_xact_lock(726041);
 if (select count(*) from public.conversation_jobs where state<>'pendente' and created_at>now()-interval '24 hours')>=30 then
 update public.conversation_jobs set state='falha',error_code='limite_global',finished_at=now() where id=j.id;return null;end if;
 update public.conversation_jobs set state='executando' where id=j.id;
 return jsonb_build_object('job_id',j.id,'goal',r.goal,'intention',r.intention,'a',jsonb_build_object('areas',a.areas,'moment',a.moment,'themes',a.themes),'b',jsonb_build_object('areas',b.areas,'moment',b.moment,'themes',b.themes));
end;$$;
create function public.mvp_finish_job(job uuid,result jsonb,model text,input_tokens integer,output_tokens integer,error_code text default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.conversation_requests;
begin
 select cr.* into r from public.conversation_requests cr join public.conversation_jobs j on j.request_id=cr.id where j.id=job and j.state='executando' for update of cr;
 if not found then raise exception 'execução indisponível';end if;
 if error_code is null and result is not null
 and (select ai_consent from public.professional_profiles where profile_id=r.owner_id)
 and (select ai_consent from public.professional_profiles where profile_id=r.candidate_id)
 and not public.mvp_blocked(r.owner_id,r.candidate_id) then
 if jsonb_typeof(result->'questions') is distinct from 'array' or jsonb_array_length(result->'questions')<>2 or length(result->>'explanation') not between 1 and 400 or length(result->>'draft') not between 1 and 400 then raise exception 'resposta inválida';end if;
 update public.conversation_requests set mode='generativa',explanation=result->>'explanation',questions=result->'questions',draft=result->>'draft' where id=r.id;
 else error_code:=coalesce(error_code,'consentimento_revogado');end if;
 update public.conversation_jobs set state=case when mvp_finish_job.error_code is null then 'concluida' else 'falha' end,error_code=left(mvp_finish_job.error_code,60),model=left(mvp_finish_job.model,80),input_tokens=greatest(mvp_finish_job.input_tokens,0),output_tokens=greatest(mvp_finish_job.output_tokens,0),finished_at=now() where id=job;
end;$$;
revoke all on function public.mvp_worker_secret(),public.mvp_claim_job(uuid),public.mvp_finish_job(uuid,jsonb,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.mvp_worker_secret(),public.mvp_claim_job(uuid),public.mvp_finish_job(uuid,jsonb,text,integer,integer,text) to service_role;

create function public.mvp_report(target uuid,reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or target=auth.uid() or not (
 exists(select 1 from public.conversation_requests where owner_id=auth.uid() and candidate_id=target)
 or exists(select 1 from public.conversation_invites where auth.uid() in(sender_id,recipient_id) and target in(sender_id,recipient_id))) then raise exception 'perfil indisponível';end if;
 insert into public.reports(denunciante_id,denunciado_id,motivo) values(auth.uid(),target,reason);
end;$$;
revoke all on function public.mvp_report(uuid,text) from public,anon;
grant execute on function public.mvp_report(uuid,text) to authenticated;
-- Interrompe automações legadas do Make na jornada nova; dados e funções ficam preservados.
drop trigger if exists perfil_novo_avisa_make on public.profiles;
drop trigger if exists feedback_novo_avisa_make on public.feedback;
drop trigger if exists feedback_aprovado_avisa_make on public.feedback;
