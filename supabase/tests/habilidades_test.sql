\echo '--- Habilidades: catálogo e gravação'
reset role;
select tst.ok((select count(*)=26 from public.habilidades_referencia), 'catálogo tem 26 habilidades');
select tst.ok(public.mvp_habilidades_valid(array['entrevistas','networking']), 'ids conhecidos aceitos');
select tst.ok(not public.mvp_habilidades_valid(array['inventada']), 'id inventado rejeitado');
select tst.ok(not public.mvp_habilidades_valid(array['entrevistas','entrevistas']), 'duplicatas rejeitadas');
select tst.ok(not public.mvp_habilidades_valid(array['entrevistas','networking','programacao','analise_dados','portfolio','lideranca','gestao_projetos','negociacao','nocode']), 'mais de oito rejeitado');
set role authenticated; select set_config('request.jwt.claim.sub', :'u3', false);
select public.mvp_save_profile('{"name":"pessoa tres","situacao":"trabalho","area_principal":"direito","interesses":["direito"],"habilidades":["entrevistas","networking"],"can_help":[],"channels":["email"]}', '{}', true);
select tst.ok((select habilidades='{entrevistas,networking}' from public.professional_profiles where profile_id=auth.uid()), 'habilidades salvas pela dona');
select tst.bloqueia($$select public.mvp_save_profile('{"name":"pessoa tres","situacao":"trabalho","area_principal":"direito","habilidades":["inventada"]}','{}',true)$$, 'RPC rejeita habilidade inventada');
select tst.bloqueia($$update public.professional_profiles set habilidades='{programacao}'$$, 'não permite manipular habilidades fora da RPC');
reset role;
