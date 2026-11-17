-- 033 · Tarefas e destino correto de convites no painel; só agregados, sem dados privados.
create or replace function public.mvp_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare aconteceram integer;uteis integer;
begin
 if not public.mvp_permissao('ver_visao_geral') then raise exception 'sem permissão para a visão geral';end if;
 select count(*),count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened and f.utility>=4))
  into aconteceram,uteis from public.conversation_invites i where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened);
 return jsonb_build_object(
  'pending_profiles',(select count(*) from public.profiles where status='pendente'),
  'pending_invites',(select count(*) from public.conversation_invites where state='pendente'),
  'conversations_happened',aconteceram,
  'useful_rate',case when aconteceram>0 then round(uteis::numeric/aconteceram,4) end,
  'open_reports',(select count(*) from public.reports where status in ('aberta','em_analise')),
  'feedback_new',(select count(*) from public.feedback where status='novo'),
  'unanswered_questions',case when public.mvp_permissao('ver_feedback') then (select count(*) from public.feedback where tipo='duvida' and status<>'respondido') else 0 end);
end;$$;

create or replace function public.mvp_ai_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare mes timestamptz:=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
 if not public.mvp_permissao('ver_ia_automacoes') then raise exception 'sem permissão para IA e automações';end if;
 return jsonb_build_object(
  'pending_invites',(select count(*) from public.conversation_invites where state='pendente'),
  'pending_by_goal',(select coalesce(jsonb_object_agg(goal,n),'{}'::jsonb) from (select goal,count(*) n from public.conversation_invites where state='pendente' and goal is not null group by goal) q),
  'jobs_month',(select count(*) from public.conversation_jobs where created_at>=mes),
  'jobs_failed_month',(select count(*) from public.conversation_jobs where created_at>=mes and state='falha'),
  'tokens_month',jsonb_build_object('input',(select coalesce(sum(input_tokens),0) from public.conversation_jobs where created_at>=mes),'output',(select coalesce(sum(output_tokens),0) from public.conversation_jobs where created_at>=mes)),
  'requests_without_match',(select coalesce(jsonb_object_agg(goal,n),'{}'::jsonb) from (select goal,count(*) n from public.conversation_requests where state='sem_candidata' group by goal) x));
end;$$;

