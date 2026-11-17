\echo '--- Painel: dúvidas e convites por permissão'
reset role;
set role authenticated;select set_config('request.jwt.claim.sub', :'u3', false);
select tst.bloqueia($$select public.mvp_ai_metrics()$$,'participante não consulta convites agregados administrativos');
select set_config('request.jwt.claim.sub', :cur, false);
select tst.ok(public.mvp_metrics() ? 'unanswered_questions','visão geral inclui tarefas de dúvidas');
select tst.ok(public.mvp_ai_metrics() ? 'pending_by_goal','aba de IA inclui destino correto dos convites pendentes');
reset role;
