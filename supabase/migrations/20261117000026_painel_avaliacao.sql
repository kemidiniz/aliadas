-- 026 · Painel: indicadores da avaliação. Tudo da 020 continua; só acrescenta campos.
create or replace function public.mvp_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;mes timestamptz:=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 aconteceram integer;uteis integer;
begin
 if not public.is_curadora() then raise exception 'apenas curadoria';end if;
 select jsonb_build_object('requests',(select count(*) from public.conversation_requests),'invites',count(*),'accepted',count(*) filter(where i.state='aceita'),
 'confirmed',count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened)),
 'useful',count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened and f.utility>=4)),
 'responses',(select count(*) from public.conversation_feedback),'average',(select avg(utility) from public.conversation_feedback where happened),
 'conflicting',count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened) and exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and not f.happened)),
 'stale_invites',count(*) filter(where i.state='pendente' and i.created_at<now()-interval '3 days'),
 'expired_invites',count(*) filter(where i.state='expirado')) into result from public.conversation_invites i;
 -- conversa aconteceu: ao menos uma participante disse que sim; útil: nota 4 ou 5 entre elas
 select count(*),count(*) filter(where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened and f.utility>=4))
  into aconteceram,uteis from public.conversation_invites i where exists(select 1 from public.conversation_feedback f where f.invite_id=i.id and f.happened);
 return result||jsonb_build_object(
  'pending_profiles',(select count(*) from public.profiles where status='pendente'),
  'requests_without_match',(select coalesce(jsonb_object_agg(goal,n),'{}'::jsonb) from (select goal,count(*) n from public.conversation_requests where state='sem_candidata' group by goal) x),
  'open_reports',(select count(*) from public.reports where status in ('aberta','em_analise')),
  'feedback_month',(select count(*) from public.feedback where created_at>=mes),
  'tokens_month',jsonb_build_object('input',(select coalesce(sum(input_tokens),0) from public.conversation_jobs where created_at>=mes),'output',(select coalesce(sum(output_tokens),0) from public.conversation_jobs where created_at>=mes)),
  'jobs_failed_month',(select count(*) from public.conversation_jobs where created_at>=mes and state='falha'),
  'jobs_month',(select count(*) from public.conversation_jobs where created_at>=mes),
  'conversations_happened',aconteceram,
  'useful_rate',case when aconteceram>0 then round(uteis::numeric/aconteceram,4) end,
  'top_marks',(select coalesce(jsonb_object_agg(m,n),'{}'::jsonb) from (select m,count(*) n from public.conversation_feedback cross join unnest(marcas) m group by m order by n desc limit 4) x),
  'feedback_requests_pending',(select count(*) from public.conversation_feedback_requests where encerrado_em is null));
end;$$;
revoke all on function public.mvp_metrics() from public,anon;
grant execute on function public.mvp_metrics() to authenticated,service_role;
