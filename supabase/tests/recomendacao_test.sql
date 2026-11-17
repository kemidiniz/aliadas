\echo '--- Recomendação por habilidades (execuções locais simuladas)'
reset role;
\set h1 '20000000-0000-0000-0000-000000000001'
\set h2 '20000000-0000-0000-0000-000000000002'
\set h3 '20000000-0000-0000-0000-000000000003'
\set h4 '20000000-0000-0000-0000-000000000004'
insert into auth.users(id,email) values(:'h1','h1@exemplo.invalid'),(:'h2','h2@exemplo.invalid'),(:'h3','h3@exemplo.invalid'),(:'h4','h4@exemplo.invalid');
set role authenticated;select set_config('request.jwt.claim.sub', :'h1', false);
select public.mvp_save_profile('{"name":"busca local","situacao":"estudo","area_principal":"tecnologia","interesses":["tecnologia"],"habilidades":[],"can_help":[],"channels":["meet"],"ai_consent":true,"ai_consent_version":"habilidades-v1"}', '{}', true);
select set_config('request.jwt.claim.sub', :'h2', false);
select public.mvp_save_profile('{"name":"ajuda local dois","situacao":"trabalho","area_principal":"negocios","interesses":["negocios"],"habilidades":["entrevistas","curriculo_linkedin"],"can_help":[],"channels":["meet"],"ai_consent":true,"ai_consent_version":"habilidades-v1"}', '{}', true);
select set_config('request.jwt.claim.sub', :'h3', false);
select public.mvp_save_profile('{"name":"ajuda local tres","situacao":"trabalho","area_principal":"saude","interesses":["saude"],"habilidades":["entrevistas"],"can_help":[],"channels":["meet"],"ai_consent":true,"ai_consent_version":"habilidades-v1"}', '{}', true);
select set_config('request.jwt.claim.sub', :'h4', false);
select public.mvp_save_profile('{"name":"sem consentimento","situacao":"trabalho","area_principal":"direito","interesses":["direito"],"habilidades":["entrevistas"],"can_help":[],"channels":["meet"],"ai_consent":false}', '{}', true);
reset role;
update public.profiles set status='aprovado' where id in(:'h1',:'h2',:'h3',:'h4');
set role authenticated;select set_config('request.jwt.claim.sub', :'h1', false);
select public.mvp_create_request('entrevista','Quero preparar uma entrevista. Maria: maria@exemplo.invalid +5511999999999') as hr \gset
select tst.ok((select candidate_id=:'h2' and mode='regra' from public.conversation_requests where id=:'hr'), 'plano B prioriza mais habilidades úteis');
select tst.bloqueia($$select * from public.conversation_recommendation_pool$$,'participante não lê mapa privado código-pessoa');
select tst.bloqueia($$select public.mvp_skill_metrics()$$,'participante não lê métricas de habilidades');
reset role;
select tst.ok((select count(*)=2 from public.conversation_recommendation_pool where request_id=:'hr'), 'pool contém só consentidas com habilidades');
select tst.ok(not exists(select 1 from public.conversation_recommendation_pool where request_id=:'hr' and candidate_id=:'h4'), 'sem consentimento não entra no pool da IA');
select tst.ok((select count(*)=1 from public.conversation_jobs where request_id=:'hr'), 'gatilho cria um trabalho para o pedido');
set role service_role;
select public.mvp_claim_job(:'hr') as hp \gset
select tst.ok(jsonb_array_length(:'hp'::jsonb->'candidates')=2,'claim entrega duas candidatas codificadas');
select tst.ok(position('ajuda local' in :'hp')=0 and position(:'h2' in :'hp')=0,'claim não inclui nomes ou ids de pessoas');
select tst.ok(public.mvp_claim_job(:'hr') is null,'claim é idempotente');
reset role;
select codigo as hc from public.conversation_recommendation_pool where request_id=:'hr' and candidate_id=:'h3' \gset
select codigo as hc2 from public.conversation_recommendation_pool where request_id=:'hr' and candidate_id=:'h2' \gset
select id as hj from public.conversation_jobs where request_id=:'hr' \gset
set role service_role;
select public.mvp_finish_job(:'hj',jsonb_build_object('habilidades_necessarias',array['entrevistas'],'recomendadas',jsonb_build_array(jsonb_build_object('codigo',:'hc','habilidades_que_ajudam',array['entrevistas']),jsonb_build_object('codigo',:'hc2','habilidades_que_ajudam',array['entrevistas']))),'stub-local',10,20,null);
reset role;
select tst.ok((select mode='ia' and candidate_id=:'h3' and habilidades_que_ajudam='{entrevistas}' from public.conversation_requests where id=:'hr'), 'IA pode indicar pessoa diferente da primeira da regra');
select tst.ok((select state='concluida' and input_tokens=10 and output_tokens=20 from public.conversation_jobs where id=:'hj'), 'consumo do stub fica registrado como teste local');
set role authenticated;select set_config('request.jwt.claim.sub', :'h1', false);
select public.mvp_next_suggestion(:'hr') as hn \gset
select tst.ok(:'hn'=:'h2' and (select mode='ia' from public.conversation_requests where id=:'hr'),'próxima respeita a ordem da IA sem chamar o provedor');
select public.mvp_next_suggestion(:'hr') as hn2 \gset
select tst.ok(:'hn2'=:'h4' and (select mode='regra' from public.conversation_requests where id=:'hr'), 'esgotada IA, plano B inclui não consentida sem expô-la ao provedor');
select tst.ok(public.mvp_next_suggestion(:'hr') is null, 'esgotadas as indicações, não inventa pessoa');
select tst.ok((select count(*)=1 from public.conversation_requests where owner_id=auth.uid()), 'ver outra não cria pedido nem consome limite');
reset role;
select tst.ok((select count(*)=1 from public.conversation_jobs where request_id=:'hr'), 'ver outra não cria trabalho de IA');
-- Saída inventada não é persistida; mantém o plano B.
set role authenticated;select set_config('request.jwt.claim.sub', :'h1', false);
select public.mvp_create_request('entrevista','') as badr \gset
set role service_role;
select public.mvp_claim_job(:'badr') as badp \gset
select public.mvp_finish_job((:'badp'::jsonb->>'job_id')::uuid,'{"habilidades_necessarias":["entrevistas"],"recomendadas":[{"codigo":"C99","habilidades_que_ajudam":["entrevistas"]}]}','stub-local',2,3,null);
reset role;
select tst.ok((select error_code='saida_invalida' from public.conversation_jobs where request_id=:'badr'), 'banco rejeita código inventado');
select tst.ok((select mode='regra' and candidate_id=:'h2' from public.conversation_requests where id=:'badr'), 'resposta inválida mantém plano B');
-- Revogação durante execução impede resultado.
set role authenticated;select set_config('request.jwt.claim.sub', :'h1', false);
select public.mvp_create_request('entrevista','') as revr \gset
set role service_role;select public.mvp_claim_job(:'revr') as revp \gset
reset role;
update public.professional_profiles set ai_consent=false where profile_id=:'h1';
set role service_role;
select public.mvp_finish_job((:'revp'::jsonb->>'job_id')::uuid,'{"habilidades_necessarias":["entrevistas"],"recomendadas":[]}','stub-local',1,1,null);
reset role;
select tst.ok((select error_code='consentimento_revogado' from public.conversation_jobs where request_id=:'revr'), 'revogar consentimento impede publicar resultado');
set role authenticated;select set_config('request.jwt.claim.sub', :'h1', false);
select tst.bloqueia($$select public.mvp_create_request('entrevista','')$$,'limite de três pedidos inclui IA e plano B');
select set_config('request.jwt.claim.sub', :'h4', false);
select tst.ok((select count(*)=0 from public.conversation_requests where id=:'hr'), 'terceira pessoa não lê texto de apoio');
select tst.bloqueia(format('select public.mvp_invite_context(%L)', :'hr'),'ID conhecido não libera contexto de pedido alheio');
reset role;
-- Simula carga somente no Postgres descartável; não toca em produção.
do $$declare uid uuid;k integer;begin
 for k in 10..25 loop
 uid:=('20000000-0000-0000-0000-'||lpad(k::text,12,'0'))::uuid;
 insert into auth.users(id,email) values(uid,'carga-local-'||k||'@exemplo.invalid');
 perform set_config('request.jwt.claim.sub',uid::text,false);
 perform public.mvp_save_profile('{"name":"pool local","situacao":"trabalho","area_principal":"saude","interesses":["saude"],"habilidades":["entrevistas"],"can_help":[],"channels":["meet"],"ai_consent":true,"ai_consent_version":"habilidades-v1"}', '{}',true);
 update public.profiles set status='aprovado' where id=uid;
 end loop;
end;$$;
update public.professional_profiles set ai_consent=true,ai_consent_version='habilidades-v1' where profile_id=:'h4';
insert into public.conversation_jobs(request_id,state,started_at,finished_at,model) select :'hr','concluida',now(),now(),'carga-stub-local' from generate_series(1,30);
set role authenticated;select set_config('request.jwt.claim.sub', :'h4', false);
select public.mvp_create_request('entrevista','') as quotar \gset
reset role;
select tst.ok((select count(*)=15 from public.conversation_recommendation_pool where request_id=:'quotar'), 'pool limita a quinze candidatas consentidas');
set role service_role;select tst.ok(public.mvp_claim_job(:'quotar') is null,'trigésima geração bloqueia nova chamada');
reset role;
select tst.ok((select error_code='limite_global' from public.conversation_jobs where request_id=:'quotar'), 'cota global registra impedimento');
select tst.ok((select mode='regra' and candidate_id is not null from public.conversation_requests where id=:'quotar'), 'sem cota continua indicação por habilidades');
delete from public.conversation_jobs where model='carga-stub-local';
set role authenticated;select set_config('request.jwt.claim.sub', :'h4', false);
select public.mvp_create_request('entrevista','') as skillr \gset
set role service_role;select public.mvp_claim_job(:'skillr') as skillp \gset
select public.mvp_finish_job((:'skillp'::jsonb->>'job_id')::uuid,'{"habilidades_necessarias":["programacao"],"recomendadas":[{"codigo":"C1","habilidades_que_ajudam":["programacao"]}]}','stub-local',1,1,null);
reset role;
select tst.ok((select error_code='saida_invalida' from public.conversation_jobs where request_id=:'skillr'), 'banco rejeita habilidade que candidata não possui');
