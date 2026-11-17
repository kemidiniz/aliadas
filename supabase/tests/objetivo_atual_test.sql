\echo '--- Contrato atual 037–039: objetivo, revisão humana, contas e fotos'
begin;
reset role;
update public.professional_profiles set available=false;
insert into auth.users(id,email) values('37000000-0000-4000-8000-000000000001','a37@example.invalid'),('37000000-0000-4000-8000-000000000002','b37@example.invalid'),('37000000-0000-4000-8000-000000000003','c37@example.invalid');
insert into public.profiles(id,apelido,de_onde_vem,onde_esta,areas,formas_conexao,status) values
('37000000-0000-4000-8000-000000000001','Pessoa atual','perfil profissional','estudando','{perfil profissional}','{mensagem}','pendente'),
('37000000-0000-4000-8000-000000000002','Aliada atual','perfil profissional','estudando','{perfil profissional}','{mensagem}','pendente'),
('37000000-0000-4000-8000-000000000003','Terceira atual','perfil profissional','estudando','{perfil profissional}','{mensagem}','pendente');
set role authenticated;select set_config('request.jwt.claim.sub','37000000-0000-4000-8000-000000000001',true);
select public.mvp_save_profile('{"name":"Pessoa atual","situacao":"buscando","area_principal":"saude","habilidades":[],"available":false,"channels":["email"],"ai_consent":true,"ai_consent_version":"habilidades-v1"}','{"email":"contato37@example.invalid"}',true);
reset role;
select tst.ok(public.mvp_pode_buscar(auth.uid()),'conta pendente pode buscar sem aprovação, interesses, habilidades ou disponibilidade para receber');
set role authenticated;
select tst.bloqueia($$select public.mvp_save_profile('{"name":"Pessoa atual","situacao":"buscando","area_principal":"saude","habilidades":[],"available":true}','{}',true)$$,'quem oferece ajuda precisa selecionar habilidade');
select tst.bloqueia($$select public.mvp_admin_participants()$$,'participante não consulta gestão de contas');
select tst.bloqueia($$select public.mvp_admin_set_active('37000000-0000-4000-8000-000000000002',false)$$,'participante não pausa outra conta');
select tst.bloqueia($$select public.mvp_claim_objective(gen_random_uuid())$$,'participante não assume worker');
select tst.bloqueia($$select public.mvp_finish_objective(gen_random_uuid(),'{}','fake',0,0,null)$$,'participante não falsifica resultado de IA');
select public.mvp_start_objective('Preparar uma entrevista de emprego',true,'habilidades-v1') as obj \gset
select tst.ok((select count(*)=1 from public.conversation_objectives where id=:'obj'),'dona lê objetivo');
select tst.ok((select count(*)=0 from public.conversation_requests where objective_id=:'obj'),'sugerir habilidades não cria busca nem escolhe pessoa');
select tst.bloqueia($$update public.conversation_objectives set mode='ia'$$,'dona não fabrica processamento generativo');
reset role;
select tst.ok((select count(*)=1 from public.conversation_jobs where objective_id=:'obj'),'gatilho cria job de habilidades');
select public.mvp_claim_objective(:'obj') as payload \gset
select tst.ok(:'payload'::jsonb->'a' ? 'situacao' and not (:'payload'::jsonb ? 'candidates') and not (:'payload'::jsonb->'a' ? 'profile_id'),'worker recebe só categorias próprias; nenhum pool de pessoas');
select public.mvp_finish_objective((:'payload'::jsonb->>'job_id')::uuid,'{"habilidades_sugeridas":["entrevistas","curriculo_linkedin"]}','stub-local',12,4,null);
set role authenticated;select set_config('request.jwt.claim.sub','37000000-0000-4000-8000-000000000002',true);
select tst.ok((select count(*)=0 from public.conversation_objectives where id=:'obj'),'outra pessoa não lê o texto do objetivo');
select tst.bloqueia(format('select public.mvp_find_for_objective(%L,array[%L])',:'obj','entrevistas'),'outra pessoa não confirma habilidades pelo ID');
select public.mvp_save_profile('{"name":"Aliada atual","situacao":"trabalho","area_principal":"saude","habilidades":["entrevistas"],"available":true,"channels":["email"],"ai_consent":false}','{"email":"aliada37@example.invalid"}',true);
set role authenticated;select set_config('request.jwt.claim.sub','37000000-0000-4000-8000-000000000001',true);
select tst.bloqueia(format('select public.mvp_find_for_objective(%L,array[%L])',:'obj','programacao'),'não substitui habilidade da IA sem escolha manual');
select public.mvp_find_for_objective(:'obj',array['entrevistas']) as found \gset
select tst.ok((select candidate_id='37000000-0000-4000-8000-000000000002' from public.conversation_requests where id=(:'found'::jsonb->>'request_id')::uuid),'seleção humana encontra habilidade exata, mesmo candidata sem consentimento de IA');
select tst.ok((select habilidades_necessarias='{entrevistas}' from public.conversation_requests where id=(:'found'::jsonb->>'request_id')::uuid),'pedido mantém somente habilidades confirmadas');
select tst.ok((public.mvp_find_for_objective(:'obj',array['entrevistas'])->>'request_id')=(:'found'::jsonb->>'request_id'),'repetir clique não cria pedido extra');
savepoint conferir_proxima;
select tst.ok(public.mvp_next_suggestion((:'found'::jsonb->>'request_id')::uuid) is null,'ver outra não repete a única candidata nem chama IA');
select tst.ok((select count(*)=1 from public.conversation_requests where objective_id=:'obj'),'trocar indicação não cria nova busca');
rollback to conferir_proxima;
select tst.bloqueia($$select public.mvp_shared_contacts('37000000-0000-4000-8000-000000000002')$$,'conhecer ID não libera contatos');
select public.mvp_invite_reviewed((:'found'::jsonb->>'request_id')::uuid,'37000000-0000-4000-8000-000000000002','Olá, topa conversar?') as inv \gset
select tst.bloqueia(format('select public.mvp_shared_contacts(%L)',:'inv'),'convite pendente não libera contatos');
set role authenticated;select set_config('request.jwt.claim.sub','37000000-0000-4000-8000-000000000002',true);
select public.mvp_respond(:'inv',true);
select tst.ok(public.mvp_shared_contacts(:'inv')->>'email'='contato37@example.invalid','contato autorizado aparece após aceite mútuo');
set role authenticated;select set_config('request.jwt.claim.sub','37000000-0000-4000-8000-000000000001',true);
select public.mvp_start_objective('Preparar nova entrevista profissional',true,'habilidades-v1') as obj2 \gset
reset role;
select public.mvp_claim_objective(:'obj2') as payload2 \gset
select public.mvp_finish_objective((:'payload2'::jsonb->>'job_id')::uuid,'{"habilidades_sugeridas":["inventada"]}','stub-local',3,2,null);
select tst.ok((select state='pronta' and mode='regra' and suggested_skills='{}' from public.conversation_objectives where id=:'obj2'),'resposta inventada permite escolha manual sem fingir IA');
set role authenticated;select set_config('request.jwt.claim.sub','37000000-0000-4000-8000-000000000001',true);
select public.mvp_retry_objective(:'obj2');
reset role;select public.mvp_claim_objective(:'obj2') as payload3 \gset
select public.mvp_finish_objective((:'payload3'::jsonb->>'job_id')::uuid,'{"habilidades_sugeridas":["networking"]}','stub-local',3,2,null);
set role authenticated;select set_config('request.jwt.claim.sub','37000000-0000-4000-8000-000000000001',true);
select public.mvp_retry_objective(:'obj2');
reset role;select public.mvp_claim_objective(:'obj2') as payload4 \gset
select tst.ok(:'payload4'::jsonb->'excluded_skills' ? 'networking','pedir outras exclui sugestões anteriores');
select public.mvp_finish_objective((:'payload4'::jsonb->>'job_id')::uuid,'{"habilidades_sugeridas":["networking"]}','stub-local',3,2,null);
select tst.ok((select error_code='saida_invalida' from public.conversation_jobs where id=(:'payload4'::jsonb->>'job_id')::uuid),'servidor também rejeita repetição de habilidade');
set role authenticated;select set_config('request.jwt.claim.sub','37000000-0000-4000-8000-000000000001',true);
select tst.bloqueia(format('select public.mvp_retry_objective(%L)',:'obj2'),'no máximo duas novas tentativas por objetivo');
select public.mvp_start_objective('Organizar meus estudos profissionais',false,null) as obj3 \gset
select tst.bloqueia($$select public.mvp_start_objective('Quarto objetivo profissional',false,null)$$,'limite de três objetivos em 24 horas');
select tst.bloqueia($$select public.mvp_save_photo('37000000-0000-4000-8000-000000000002/aaaaaaaa-0000-4000-8000-000000000001.webp')$$,'não salva foto da pasta alheia');
insert into storage.objects(bucket_id,name) values('fotos','37000000-0000-4000-8000-000000000001/aaaaaaaa-0000-4000-8000-000000000001.webp');
select public.mvp_save_photo('37000000-0000-4000-8000-000000000001/aaaaaaaa-0000-4000-8000-000000000001.webp');
select tst.ok((select foto_path is not null from public.profiles where id=auth.uid()),'foto salva independentemente do formulário');
reset role;
update public.profiles set status='pausado' where id='37000000-0000-4000-8000-000000000001';
set role authenticated;select set_config('request.jwt.claim.sub','37000000-0000-4000-8000-000000000001',true);
reset role;
select tst.ok(not public.mvp_pode_buscar(auth.uid()),'conta pausada continua sem poder buscar');
set role authenticated;
select tst.bloqueia($$select public.mvp_start_objective('Buscar um emprego profissional',false,null)$$,'conta pausada não inicia processamento');
reset role;
select set_config('request.jwt.claim.sub', (select user_id::text from public.principal_administrator), true);
set role authenticated;
select tst.ok(jsonb_typeof(public.mvp_admin_participants())='array','administradora vê participantes sem fila de aprovação');
select public.mvp_admin_set_active('37000000-0000-4000-8000-000000000003',false);
reset role;
select tst.ok((select status='pausado' from public.profiles where id='37000000-0000-4000-8000-000000000003'),'gestão autorizada pausa conta');
set role authenticated;
select public.mvp_admin_set_active('37000000-0000-4000-8000-000000000003',true);
reset role;
select tst.ok((select status='aprovado' from public.profiles where id='37000000-0000-4000-8000-000000000003'),'gestão autorizada reativa conta');
select set_config('request.jwt.claim.sub', '37000000-0000-4000-8000-000000000003', true);
set role authenticated;
select tst.bloqueia($$select public.mvp_admin_participants()$$,'reativar conta não concede poderes de embaixadora');
reset role;
select tst.ok(not exists(select 1 from public.conversation_jobs where objective_id=:'obj3'),'escolha sem IA não cria job nem chamada');
update public.profiles set status='pendente' where id='37000000-0000-4000-8000-000000000001';
with objetivos as (
 insert into public.conversation_objectives(owner_id,description,state) select '37000000-0000-4000-8000-000000000001','Teste local da cota global','pronta' from generate_series(1,30) returning id
) insert into public.conversation_jobs(objective_id,objective_attempt,state,started_at) select id,1,'concluida',now() from objetivos;
insert into public.conversation_objectives(owner_id,description,ai_authorized) values('37000000-0000-4000-8000-000000000001','Preparar entrevista de emprego',true) returning id as limite_obj \gset
select tst.ok(public.mvp_claim_objective(:'limite_obj') is null,'trinta execuções bloqueiam nova chamada, inclusive do fluxo novo');
select tst.ok((select mode='regra' and state='pronta' from public.conversation_objectives where id=:'limite_obj'),'cota global libera escolha manual em vez de erro de fluxo');
set role anon;
select tst.bloqueia('select * from public.conversation_objectives','visitante não lê objetivos');
reset role;
rollback;
\echo 'TESTES ATUAIS DE RLS PASSARAM'
