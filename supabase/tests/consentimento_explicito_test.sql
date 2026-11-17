\echo '--- Consentimento novo não é presumido'
reset role;
set role authenticated;select set_config('request.jwt.claim.sub', :'u3', false);
select public.mvp_save_profile('{"name":"pessoa tres","situacao":"trabalho","area_principal":"direito","interesses":["direito"],"habilidades":["entrevistas"],"channels":["email"],"ai_consent":true}','{}',true);
select tst.ok((select ai_consent_version<>'habilidades-v1' from public.professional_profiles where profile_id=auth.uid()),'cliente antigo não confirma a nova finalidade ao salvar outro campo');
select public.mvp_save_profile('{"name":"pessoa tres","situacao":"trabalho","area_principal":"direito","interesses":["direito"],"habilidades":["entrevistas"],"channels":["email"],"ai_consent":true,"ai_consent_version":"habilidades-v1"}','{}',true);
select tst.ok((select ai_consent_version='habilidades-v1' from public.professional_profiles where profile_id=auth.uid()),'confirmação explícita registra a finalidade por habilidades');
reset role;
