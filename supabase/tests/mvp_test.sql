\echo '--- MVP profissional: permissões e fluxo'
\set u1 '10000000-0000-0000-0000-000000000001'
\set u2 '10000000-0000-0000-0000-000000000002'
\set u3 '10000000-0000-0000-0000-000000000003'
insert into auth.users(id,email) values(:'u1','um@exemplo.invalid'),(:'u2','dois@exemplo.invalid'),(:'u3','tres@exemplo.invalid');
set role anon;
select tst.bloqueia($$select public.mvp_create_request('carreira','')$$,'visitante não cria solicitação');
select tst.bloqueia($$select * from public.professional_contacts$$,'visitante não lê contatos profissionais');
select tst.bloqueia($$select public.mvp_claim_job(gen_random_uuid())$$,'visitante não aciona IA');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :'u1', false);
select public.mvp_save_profile('{"name":"pessoa um","occupation":"formação em saúde","moment":"inicio","areas":["saude"],"themes":["carreira"],"intentions":["buscar"],"channels":["email"],"slots":["1_tarde"],"ai_consent":false}', '{}', true);
select tst.ok((select email is null from public.professional_contacts where profile_id=auth.uid()),'e-mail de login não foi copiado como contato');
select tst.bloqueia($$select public.mvp_create_request('carreira','')$$,'perfil pendente não cria solicitação');
select tst.bloqueia($$update public.professional_profiles set ai_consent=true$$,'edição profissional direta bloqueada');
select tst.bloqueia($$select public.mvp_finish_job(gen_random_uuid(),'{}','fake',0,0,null)$$,'usuária não forja saída de IA');
select tst.bloqueia($$select public.mvp_metrics()$$,'participante não lê métricas administrativas');
select set_config('request.jwt.claim.sub', :'u2', false);
select public.mvp_save_profile('{"name":"pessoa dois","occupation":"educadora","moment":"experiente","areas":["saude","educacao"],"themes":["carreira"],"intentions":["compartilhar"],"channels":["email"],"slots":["1_tarde","2_manha"],"ai_consent":true}', '{"email":"compartilhar@exemplo.invalid","whatsapp":"+5511999999999"}', true);
select set_config('request.jwt.claim.sub', :'u3', false);
select public.mvp_save_profile('{"name":"pessoa tres","occupation":"profissional","moment":"inicio","areas":["direito"],"themes":["carreira"],"intentions":["buscar"],"channels":["email"],"slots":[],"ai_consent":false}', '{}', true);
reset role;
update public.profiles set status='aprovado' where id in(:'u1',:'u2',:'u3');
set role authenticated; select set_config('request.jwt.claim.sub', :'u1', false);
select public.mvp_create_request('carreira','texto privado que não vai para a IA') as request \gset
select tst.ok((select candidate_id=:'u2' and mode='basica' from public.conversation_requests where id=:'request'),'seleção determinística encontra uma candidata complementar');
select tst.ok(jsonb_array_length(public.mvp_cards())=1,'cartão mínimo disponível para a dona da recomendação');
select tst.ok((select count(*) from public.professional_contacts where profile_id=:'u2')=0,'não lê contatos conhecendo o UUID');
select tst.bloqueia(format('select public.mvp_shared_contacts(%L)', :'request'),'não confunde pedido com aceite de convite');
select tst.bloqueia(format('select public.mvp_invite(%L,%L)', :'request','me escreva em contato@exemplo.invalid'),'não compartilha contato por mensagem antes do aceite');
select public.mvp_invite(:'request','olá, vamos conversar sobre carreira?') as invite \gset
select tst.bloqueia(format('select public.mvp_shared_contacts(%L)', :'invite'),'contatos não liberados antes do aceite');
select tst.bloqueia(format('select public.mvp_respond(%L,true)', :'invite'),'remetente não aceita o próprio convite');
select tst.bloqueia(format('select public.mvp_feedback(%L,true,5::smallint,''clareza'')', :'invite'),'não avalia conversa ainda não aceita');
reset role;
select tst.ok((select count(*) from public.conversation_jobs where request_id=:'request')=0,'sem consentimento não cria trabalho para IA');
set role authenticated;select set_config('request.jwt.claim.sub', :'u3', false);
select tst.ok((select count(*) from public.conversation_requests where id=:'request')=0,'terceira pessoa não lê solicitação');
select tst.ok((select count(*) from public.conversation_invites where id=:'invite')=0,'terceira pessoa não lê convite');
select tst.bloqueia(format('select public.mvp_shared_contacts(%L)', :'invite'),'terceira pessoa não lê canais');
select tst.bloqueia(format('select public.mvp_respond(%L,true)', :'invite'),'terceira pessoa não aceita convite');
select tst.bloqueia(format('select public.mvp_invite(%L,''ataque'')', :'request'),'terceira pessoa não envia convite alheio');
select set_config('request.jwt.claim.sub', :'u2', false);
select public.mvp_respond(:'invite',true);
select tst.bloqueia(format('select public.mvp_respond(%L,true)', :'invite'),'aceite não pode ser repetido');
select set_config('request.jwt.claim.sub', :'u1', false);
select tst.ok(public.mvp_shared_contacts(:'invite')->>'email'='compartilhar@exemplo.invalid','aceite libera apenas e-mail preenchido e autorizado');
select tst.ok(public.mvp_shared_contacts(:'invite')->>'whatsapp' is null,'whatsapp preenchido mas não autorizado permanece oculto');
select tst.ok(public.mvp_shared_contacts(:'invite')->'common_slots'='["1_tarde"]'::jsonb,'calcula períodos em comum deterministicamente');
select tst.bloqueia(format('select public.mvp_schedule(%L,''amanhã'')', :'invite'),'proposta em texto livre não é mais oferecida');
select tst.bloqueia(format('select public.mvp_propose_times(%L,array[now()+interval ''20 days''])', :'invite'),'horário além de 14 dias é rejeitado');
select tst.bloqueia(format('select public.mvp_propose_times(%L,array[now()+interval ''1 day'',now()+interval ''2 days'',now()+interval ''3 days'',now()+interval ''4 days''])', :'invite'),'no máximo três horários');
select public.mvp_propose_times(:'invite',array[now()+interval '1 day',now()+interval '2 days']);
select tst.ok((select count(*) from public.conversation_time_proposals where invite_id=:'invite')=2,'participante lê as próprias propostas');
select id as proposta from public.conversation_time_proposals where invite_id=:'invite' order by inicio limit 1 \gset
select tst.bloqueia(format('select public.mvp_confirm_time(%L)', :'proposta'),'autora não confirma a própria proposta');
select set_config('request.jwt.claim.sub', :'u3', false);
select tst.ok((select count(*) from public.conversation_time_proposals)=0,'terceira pessoa não lê horários');
select tst.bloqueia(format('select public.mvp_confirm_time(%L)', :'proposta'),'terceira pessoa não confirma horário');
select set_config('request.jwt.claim.sub', :'u2', false);
select public.mvp_confirm_time(:'proposta');
select tst.ok((select horario_confirmado is not null and confirmado_em is not null from public.conversation_invites where id=:'invite'),'a outra participante confirma um horário');
select set_config('request.jwt.claim.sub', :'u1', false);
select public.mvp_feedback(:'invite',true,5::smallint,'clareza');
select tst.bloqueia(format('select public.mvp_feedback(%L,false,5::smallint,''clareza'')', :'invite'),'feedback incoerente é rejeitado');
select set_config('request.jwt.claim.sub', :'u2', false);
select public.mvp_feedback(:'invite',false,null,'nao_aconteceu');
select tst.ok((select count(*) from public.conversation_feedback where invite_id=:'invite')=1,'cada uma lê apenas sua própria avaliação');
reset role;
select tst.ok((select count(*) from public.conversation_feedback where invite_id=:'invite')=2,'respostas independentes foram preservadas');
-- Nova tentativa sem par disponível; sem inventar resultado de IA.
set role authenticated;select set_config('request.jwt.claim.sub', :'u1', false);
select public.mvp_create_request('carreira','') as second_request \gset
select tst.ok((select state='sem_candidata' from public.conversation_requests where id=:'second_request'),'não sugere novamente par com conexão ativa');
select public.mvp_create_request('projeto','');
select tst.bloqueia($$select public.mvp_create_request('carreira','')$$,'quarta solicitação em 24h bloqueada');
insert into public.conversation_blocks(owner_id,blocked_id) values(:'u1',:'u2');
select tst.bloqueia(format('select public.mvp_shared_contacts(%L)', :'invite'),'bloqueio revoga contatos após aceite');
select tst.ok((select count(*) from public.conversation_invites where id=:'invite')=0,'bloqueio oculta conversa');
select tst.bloqueia(format('insert into public.conversation_blocks(owner_id,blocked_id) values (%L,%L)', :'u2',:'u3'),'não bloqueia em nome de outra pessoa');
reset role;
-- Logs/worker: somente service_role. Criamos trabalho controlado localmente, sem API externa.
insert into public.conversation_jobs(request_id) values(:'second_request');
set role service_role;
select tst.ok(public.mvp_claim_job(:'second_request') is null,'worker não executa sem dupla e consentimentos');
reset role;
select tst.ok((select state='sem_consentimento' from public.conversation_jobs where request_id=:'second_request'),'worker registra impedimento sem dados pessoais');
select tst.ok((select count(*) from public.conversation_feedback where happened and utility>=4)=1,'utilidade exige confirmação e nota 4 ou 5');
-- Contrato completo do worker com resposta sintética marcada como teste local.
-- NÃO é uma execução real de IA e não serve como evidência do projeto final.
delete from public.conversation_blocks where owner_id=:'u1' and blocked_id=:'u2';
update public.professional_profiles set ai_consent=true where profile_id=:'u1';
insert into public.conversation_jobs(request_id,candidate_id) values(:'request',:'u2') returning id as job \gset
set role service_role;
select public.mvp_claim_job(:'request') as payload \gset
select tst.ok(:'payload'::jsonb->>'goal'='carreira','worker recebe objetivo categórico');
select tst.ok(not (:'payload'::jsonb ? 'intention') and :'payload'::jsonb->'b'->'themes'='["carreira"]'::jsonb,'worker recebe só o objetivo e os assuntos permitidos');
select tst.ok(not (:'payload'::jsonb ? 'description') and not (:'payload'::jsonb->'a' ? 'occupation'),'worker não recebe descrição ou ocupação livre');
select tst.ok(public.mvp_claim_job(:'request') is null,'claim idempotente não duplica execução');
select tst.bloqueia(format('select public.mvp_finish_job(%L,%L,''teste-local'',10,20,null)', :'job', '{"explanation":"teste","questions":[],"draft":"teste"}'),'worker rejeita estrutura incompleta');
select public.mvp_finish_job(:'job','{"explanation":"teste local, não gerado por IA","questions":["pergunta de teste um?","pergunta de teste dois?"],"draft":"rascunho de teste local"}','teste-local',10,20,null);
reset role;
select tst.ok((select mode='generativa' and jsonb_array_length(questions)=2 from public.conversation_requests where id=:'request'),'finalização válida grava resultado estruturado');
select tst.ok((select state='concluida' and input_tokens=10 and output_tokens=20 from public.conversation_jobs where id=:'job'),'consumo informado fica no log de teste local');
set role authenticated;select set_config('request.jwt.claim.sub', :'u3', false);
select tst.ok((select count(*) from public.conversation_jobs)=0,'participante não lê logs de outras pessoas');
select tst.bloqueia(format('select public.mvp_claim_job(%L)', :'request'),'participante não pode reclamar trabalho da fila');
reset role;
-- Gatilho real local (pg_net substituído por stub, SEM chamada de rede).
select vault.create_secret('https://exemplo.invalid/functions/v1/conversa-ia','mvp_worker_url');
select vault.create_secret('segredo-apenas-do-teste-local','mvp_worker_secret');
update public.professional_profiles set ai_consent=true where profile_id=:'u3';
set role authenticated;select set_config('request.jwt.claim.sub', :'u3', false);
select public.mvp_create_request('carreira','não enviar esta descrição') as queued \gset
reset role;
select tst.ok((select count(*) from public.conversation_jobs where request_id=:'queued' and state='pendente')=1,'solicitação com ambos consentindo enfileira automaticamente');
select tst.ok((select count(*) from net.chamadas where body=jsonb_build_object('request_id',:'queued'::uuid))=1,'gatilho envia somente id da solicitação ao worker');
set role service_role;
select public.mvp_claim_job(:'queued') as revoked_payload \gset
reset role;
update public.professional_profiles set ai_consent=false where profile_id=:'u3';
set role service_role;
select public.mvp_finish_job((:'revoked_payload'::jsonb->>'job_id')::uuid,'{"explanation":"teste","questions":["um?","dois?"],"draft":"teste"}','teste-local',1,2,null);
reset role;
select tst.ok((select mode='basica' from public.conversation_requests where id=:'queued'),'retirar consentimento durante a chamada impede publicar texto gerado');
select tst.ok((select error_code='consentimento_revogado' from public.conversation_jobs where request_id=:'queued'),'revogação fica registrada sem conteúdo privado');
-- Indicadores não transformam ausência de resposta em encontro.
set role authenticated;select set_config('request.jwt.claim.sub', :'u3', false);
select public.mvp_invite(:'queued','convite de teste para medir ausência de resposta') as unanswered_invite \gset
select set_config('request.jwt.claim.sub', :'u2', false);
select public.mvp_respond(:'unanswered_invite',true);
select set_config('request.jwt.claim.sub', :cur, false);
select public.mvp_metrics() as metrics \gset
select tst.ok((:'metrics'::jsonb->>'accepted')::integer=2 and (:'metrics'::jsonb->>'confirmed')::integer=1,'aceite sem feedback não é confirmado como conversa realizada');
select tst.ok((:'metrics'::jsonb->>'useful')::integer=1 and (:'metrics'::jsonb->>'responses')::integer=2,'utilidade e respostas não são duplicadas por convite');
select tst.ok((:'metrics'::jsonb->>'conflicting')::integer=1 and (:'metrics'::jsonb->>'average')::numeric=5,'divergência entre participantes fica visível e média usa notas válidas');
reset role;
-- 016/017: sala fixa, perfil com duas listas e "ver outra sugestão".
reset role;
select tst.ok(public.mvp_room_valid('https://meet.jit.si/aliadas-teste') and public.mvp_room_valid('https://us02web.zoom.us/j/123') and not public.mvp_room_valid('http://meet.google.com/abc-defg-hij') and not public.mvp_room_valid('https://exemplo.invalid/sala'),'sala aceita só https de provedores conhecidos');
select tst.ok((select can_help='{carreira}' and want_talk='{}' from public.professional_profiles where profile_id=:'u2'),'conversão: quem compartilhava pode ajudar com os temas');
\set u4 '10000000-0000-0000-0000-000000000004'
\set u5 '10000000-0000-0000-0000-000000000005'
insert into auth.users(id,email) values(:'u4','quatro@exemplo.invalid'),(:'u5','cinco@exemplo.invalid');
set role authenticated;
select set_config('request.jwt.claim.sub', :'u4', false);
select public.mvp_save_profile('{"name":"pessoa quatro","occupation":"designer","moment":"experiente","areas":["artes"],"can_help":["portfolio"],"want_talk":[],"channels":["email"],"slots":[],"ai_consent":false}', '{"meet":"https://meet.jit.si/sala-quatro"}', true);
select tst.ok((select intentions='{compartilhar}' and themes='{portfolio}' from public.professional_profiles where profile_id=auth.uid()),'listas novas derivam intenções e temas antigos');
select tst.bloqueia($$select public.mvp_save_profile('{"name":"x y","occupation":"designer","moment":"inicio","areas":["artes"],"can_help":[],"want_talk":[],"channels":["email"],"slots":[]}','{}',true)$$,'perfil precisa de ao menos um assunto');
select tst.bloqueia($$select public.mvp_save_profile('{"name":"x y","occupation":"designer","moment":"inicio","areas":["artes"],"can_help":["portfolio"],"channels":["email"],"slots":[]}','{"meet":"https://exemplo.invalid/sala"}',true)$$,'sala de provedor desconhecido é rejeitada');
select set_config('request.jwt.claim.sub', :'u5', false);
select public.mvp_save_profile('{"name":"pessoa cinco","occupation":"ilustradora","moment":"transicao","areas":["artes"],"can_help":["portfolio"],"want_talk":["carreira"],"channels":["email"],"slots":[],"ai_consent":false}', '{}', true);
reset role;
update public.profiles set status='aprovado' where id in(:'u4',:'u5');
set role authenticated;select set_config('request.jwt.claim.sub', :'u2', false);
select public.mvp_create_request('portfolio','') as busca \gset
select candidate_id as primeira from public.conversation_requests where id=:'busca' \gset
select tst.ok(:'primeira' in (:'u4',:'u5'),'busca encontra quem pode ajudar com o objetivo');
select public.mvp_next_suggestion(:'busca') as segunda \gset
select tst.ok(:'segunda' in (:'u4',:'u5') and :'segunda'<>:'primeira','ver outra sugestão não repete a anterior');
select tst.ok(public.mvp_next_suggestion(:'busca') is null,'sem mais compatíveis, não inventa sugestão');
select tst.ok((select count(*) from public.conversation_requests where owner_id=auth.uid() and created_at>now()-interval '24 hours')=1,'ver outra sugestão não consome o limite de buscas');
select set_config('request.jwt.claim.sub', :'u3', false);
select tst.bloqueia(format('select public.mvp_next_suggestion(%L)', :'busca'),'terceira pessoa não troca sugestão alheia');
select tst.bloqueia($$select * from public.conversation_suggestions$$,'histórico de sugestões não é legível por participantes');
reset role;
-- 018: desempate por menos convites recebidos e exclusão de quem tem 2 pendentes.
\set d1 '10000000-0000-0000-0000-000000000011'
\set d2 '10000000-0000-0000-0000-000000000012'
\set d3 '10000000-0000-0000-0000-000000000013'
\set d4 '10000000-0000-0000-0000-000000000014'
\set d5 '10000000-0000-0000-0000-000000000015'
insert into auth.users(id,email) values(:'d1','d1@exemplo.invalid'),(:'d2','d2@exemplo.invalid'),(:'d3','d3@exemplo.invalid'),(:'d4','d4@exemplo.invalid'),(:'d5','d5@exemplo.invalid');
set role authenticated;
select set_config('request.jwt.claim.sub', :'d1', false);
select public.mvp_save_profile('{"name":"quem pede","occupation":"estudante","moment":"inicio","areas":["direito"],"can_help":[],"want_talk":["rede"],"channels":["linkedin"],"slots":[]}', '{}', true);
select set_config('request.jwt.claim.sub', :'d2', false);
select public.mvp_save_profile('{"name":"ajuda dois","occupation":"advogada","moment":"experiente","areas":["direito"],"can_help":["rede"],"want_talk":[],"channels":["linkedin"],"slots":[]}', '{}', true);
select set_config('request.jwt.claim.sub', :'d3', false);
select public.mvp_save_profile('{"name":"ajuda tres","occupation":"juiza","moment":"experiente","areas":["direito"],"can_help":["rede"],"want_talk":[],"channels":["linkedin"],"slots":[]}', '{}', true);
select set_config('request.jwt.claim.sub', :'d4', false);
select public.mvp_save_profile('{"name":"outra quatro","occupation":"designer de testes","moment":"inicio","areas":["artes"],"can_help":[],"want_talk":["carreira"],"channels":["email"],"slots":[]}', '{}', true);
select set_config('request.jwt.claim.sub', :'d5', false);
select public.mvp_save_profile('{"name":"outra cinco","occupation":"designer de testes","moment":"inicio","areas":["artes"],"can_help":[],"want_talk":["carreira"],"channels":["email"],"slots":[]}', '{}', true);
reset role;
update public.profiles set status='aprovado' where id in(:'d1',:'d2',:'d3',:'d4',:'d5');
-- d2 recebeu 1 convite recente (recusado); d3 nenhum. Empatadas na pontuação.
insert into public.conversation_requests(id,owner_id,intention,goal) values('40000000-0000-0000-0000-000000000001',:'d4','buscar','situacao');
insert into public.conversation_invites(request_id,sender_id,recipient_id,message,state) values('40000000-0000-0000-0000-000000000001',:'d4',:'d2','oi','recusada');
set role authenticated;select set_config('request.jwt.claim.sub', :'d1', false);
select public.mvp_create_request('rede','') as emp \gset
select tst.ok((select candidate_id=:'d3' from public.conversation_requests where id=:'emp'),'empate: escolhe quem recebeu menos convites em 14 dias');
reset role;
-- d3 passa a ter 2 convites pendentes: sai da seleção.
insert into public.conversation_requests(id,owner_id,intention,goal) values('40000000-0000-0000-0000-000000000002',:'d4','buscar','situacao'),('40000000-0000-0000-0000-000000000003',:'d5','buscar','situacao');
insert into public.conversation_invites(request_id,sender_id,recipient_id,message) values('40000000-0000-0000-0000-000000000002',:'d4',:'d3','oi'),('40000000-0000-0000-0000-000000000003',:'d5',:'d3','oi');
set role authenticated;select set_config('request.jwt.claim.sub', :'d1', false);
select public.mvp_create_request('rede','') as sobrecarga \gset
select tst.ok((select candidate_id=:'d2' from public.conversation_requests where id=:'sobrecarga'),'quem tem 2 convites pendentes não é escolhida');
select tst.ok(public.mvp_next_suggestion(:'sobrecarga') is null,'ver outra sugestão não repete e não traz quem está sobrecarregada');
reset role;
-- 019: feedback novo avisa o Make uma única vez, só com {tabela, evento, id}.
select vault.create_secret('https://exemplo.invalid/webhook-feedback','make_feedback_novo_url');
set role anon;
insert into public.feedback (tipo, nota_facilidade, encontrou_aliadas, email) values ('avaliacao', 5, 'sim', 'pessoa@exemplo.invalid');
reset role;
select id as fb from public.feedback where email='pessoa@exemplo.invalid' \gset
select tst.ok((select count(*) from net.chamadas where url='https://exemplo.invalid/webhook-feedback')=1,'feedback novo dispara um único aviso ao Make');
select tst.ok((select body=jsonb_build_object('tabela','feedback','evento','insert','id',:'fb'::uuid) from net.chamadas where url='https://exemplo.invalid/webhook-feedback'),'aviso leva só tabela, evento e id, sem e-mail nem texto');
update public.feedback set status='aprovado' where id=:'fb';
select tst.ok((select count(*) from net.chamadas where url like '%exemplo.invalid/webhook%')=1,'aprovar resposta não dispara caminho antigo');
