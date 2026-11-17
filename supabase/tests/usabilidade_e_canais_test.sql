\echo '--- 040–041: canais e feedback de usabilidade'
begin;
reset role;
select tst.ok(not exists(select 1 from public.feedback where clareza_fluxo is not null or adequacao_ia is not null or acompanhar_convites is not null),'migration não inventa respostas para feedback histórico');
set role anon;
insert into public.feedback(tipo,nota_facilidade,encontrou_aliadas,clareza_fluxo,adequacao_ia,acompanhar_convites,email) values
('avaliacao',4,'nao','5','nao_usei','nao_cheguei','nova-medida-a@example.invalid'),
('avaliacao',5,'sim','3','4','5','nova-medida-b@example.invalid'),
('avaliacao',4,'em_parte',null,'sem_sugestoes',null,'nova-medida-c@example.invalid');
select tst.ok(true,'visitante envia três medidas opcionais sem conta e com opções não aplicáveis');
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,encontrou_aliadas,clareza_fluxo) values('avaliacao',4,'nao','0')$$,'nota zero não é aceita');
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,encontrou_aliadas,adequacao_ia) values('avaliacao',4,'nao','inventada')$$,'opção de IA inventada é recusada');
select tst.bloqueia($$insert into public.feedback(tipo,mensagem,email,adequacao_ia) values('duvida','Dúvida de teste','duvida-nova@example.invalid','5')$$,'medidas não são inseridas em dúvida para distorcer resultados');
select tst.bloqueia('select clareza_fluxo,adequacao_ia from public.feedback','visitante não lê respostas de outras participantes');
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,encontrou_aliadas,status) values('avaliacao',4,'nao','respondido')$$,'novos campos não dão permissão de definir status');
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.principal_administrator),true);
set role authenticated;
select public.mvp_feedback_metrics(current_date) as met \gset
select tst.ok(:'met'::jsonb->'usabilidade'->'clareza_fluxo'->>'media'='4.00','média de clareza usa apenas notas respondidas');
select tst.ok((:'met'::jsonb->'usabilidade'->'adequacao_ia'->>'notas')::int=1 and (:'met'::jsonb->'usabilidade'->'adequacao_ia'->>'media')::numeric=4,'não usou e não recebeu sugestões ficam fora da média da IA');
select tst.ok((:'met'::jsonb->'usabilidade'->'adequacao_ia'->>'nao_usei')::int=1 and (:'met'::jsonb->'usabilidade'->'adequacao_ia'->>'sem_sugestoes')::int=1,'não uso e ausência de sugestões têm contagens diferentes');
select tst.ok((:'met'::jsonb->'usabilidade'->'acompanhar_convites'->>'positivas')::int=1,'indicador de notas 4 e 5 tem denominador próprio');
reset role;
-- Duas contas apenas no banco local descartável: canal futuro não gera match.
insert into auth.users(id,email) values('40000000-0000-4000-8000-000000000001','canal-a@example.invalid'),('40000000-0000-4000-8000-000000000002','canal-b@example.invalid');
set role authenticated;select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select public.mvp_save_profile('{"name":"Busca local","situacao":"buscando","area_principal":"tecnologia","available":false,"habilidades":[],"channels":["email","meet"]}','{"email":"contato-canal@example.invalid"}',true);
select tst.bloqueia('select public.mvp_feedback_metrics(current_date)','participante comum não consulta métricas de feedback');
select tst.bloqueia($$select public.mvp_admin_search('canal')$$,'unificar a tela não libera busca de acessos a uma participante comum');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
select public.mvp_save_profile('{"name":"Canal futuro local","situacao":"trabalho","area_principal":"tecnologia","available":true,"habilidades":["entrevistas"],"channels":["meet"]}','{"meet":"https://meet.google.com/abc-defg-hij"}',true);
reset role;
select tst.ok(not public.mvp_pode_buscar('40000000-0000-4000-8000-000000000002'),'apenas Meet não satisfaz contatos necessários para buscar');
select tst.ok(not exists(select 1 from public.mvp_eligible_candidates('40000000-0000-4000-8000-000000000001','entrevista') where candidate='40000000-0000-4000-8000-000000000002'),'Meet em comum não cria uma indicação sem canal atual');
insert into public.conversation_requests(id,owner_id,intention,goal) values('40000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000001','buscar','entrevista');
update public.conversation_requests set candidate_id='40000000-0000-4000-8000-000000000002' where id='40000000-0000-4000-8000-000000000010';
insert into public.conversation_invites(id,request_id,sender_id,recipient_id,message,state) values('40000000-0000-4000-8000-000000000011','40000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','Conexão histórica local','aceita');
set role authenticated;select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select tst.ok(public.mvp_shared_contacts('40000000-0000-4000-8000-000000000011')->>'meet' is null,'Meet antigo não é disponibilizado na aliança');
select public.mvp_feedback_v2('40000000-0000-4000-8000-000000000011','ainda_nao',null,'{}');
select tst.ok(not exists(select 1 from public.conversation_feedback where invite_id='40000000-0000-4000-8000-000000000011'),'ainda não não é registrado como conversa realizada nem nota negativa');
select public.mvp_start_objective('Preparar entrevista de emprego',false,null) as novo_objetivo \gset
select tst.ok(:'novo_objetivo' is not null,'avaliação pendente não impede um novo objetivo');
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.principal_administrator),true);
set role authenticated;
select tst.ok(public.mvp_admin_participants('')='[]'::jsonb,'lista de participantes não é carregada sem busca');
select public.mvp_admin_search('Canal futuro') as encontrada \gset
select tst.ok(jsonb_array_length(:'encontrada'::jsonb)=1 and (:'encontrada'::jsonb->0->>'status')='pendente','busca unificada encontra conta e situação');
select tst.ok(position('***' in (:'encontrada'::jsonb->0->>'email'))>0 and not (:'encontrada'::jsonb->0 ? 'meet'),'busca principal mascara e-mail e não expõe contato Meet');
reset role;
select tst.ok((select meet is not null from public.professional_contacts where profile_id='40000000-0000-4000-8000-000000000002'),'link histórico do Meet preservado');
rollback;
\echo 'TESTES DE USABILIDADE E CANAIS PASSARAM'
