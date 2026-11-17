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
-- (horários propostos saíram na 028; as funções foram removidas)
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
-- 020: painel ampliado; usuária comum continua sem acesso.
set role authenticated;select set_config('request.jwt.claim.sub', :'d1', false);
select tst.bloqueia($$select public.mvp_metrics()$$,'participante não lê o painel ampliado');
select tst.ok((select count(*) from public.conversation_jobs)=0,'participante não lê execuções da IA');
select set_config('request.jwt.claim.sub', :cur, false);
select public.mvp_metrics() as painel \gset
select tst.ok(:'painel'::jsonb ?& array['pending_profiles','requests_without_match','stale_invites','open_reports','feedback_month','tokens_month','jobs_failed_month'],'painel traz os indicadores novos');
select tst.ok((:'painel'::jsonb->'requests_without_match'->>'carreira')::int>=1,'pedidos sem candidata agrupados por objetivo');
select tst.ok((:'painel'::jsonb->>'feedback_month')::int>=1 and (:'painel'::jsonb->'tokens_month'->>'input')::int>=0,'feedback e tokens do mês vêm de dados reais');
reset role;
-- 021: convites pendentes há mais de 7 dias expiram e não bloqueiam nova indicação.
select tst.ok((select quando='7 6 * * *' and comando like '%mvp_expire_invites%' from cron.agendamentos where nome='aliadas-expirar-convites'),'rotina diária agendada no pg_cron');
update public.conversation_invites set created_at=now()-interval '8 days' where recipient_id=:'d3';
select public.mvp_expire_invites() as expirados \gset
select tst.ok(:expirados=2 and (select count(*) from public.conversation_invites where recipient_id=:'d3' and state='expirado' and expirado_em is not null)=2,'convites pendentes há mais de 7 dias expiram');
select tst.ok((select expirados=2 from public.conversation_expiry_runs order by id desc limit 1),'execução registrada no log');
set role authenticated;select set_config('request.jwt.claim.sub', :'d4', false);
select tst.ok((select count(*) from public.conversation_expiry_runs)=0,'participante não lê o log da rotina');
select tst.bloqueia($$select public.mvp_expire_invites()$$,'participante não executa a rotina');
select tst.bloqueia(format('select public.mvp_respond(%L,true)', (select id from public.conversation_invites where sender_id=:'d4' and recipient_id=:'d3' limit 1)),'convite expirado não pode ser aceito');
reset role;
insert into public.conversation_requests(id,owner_id,intention,goal) values('40000000-0000-0000-0000-000000000004',:'d4','buscar','situacao');
insert into public.conversation_invites(request_id,sender_id,recipient_id,message) values('40000000-0000-0000-0000-000000000004',:'d4',:'d3','novo convite');
select tst.ok(true,'expirado não bloqueia um novo convite entre as mesmas pessoas');
set role authenticated;select set_config('request.jwt.claim.sub', :cur, false);
select tst.ok((select count(*) from public.conversation_expiry_runs)>=1,'curadoria lê o log da rotina');
reset role;
-- 022: listas novas, conversão, nome completo após aceite e regra de indicação.
select tst.ok(public.mvp_situacao_de('estudante')='estudo' and public.mvp_situacao_de('inicio')='trabalho' and public.mvp_situacao_de('transicao')='transicao' and public.mvp_situacao_de('experiente')='trabalho','conversão do momento para a situação');
select tst.ok((select situacao='trabalho' and area_principal='saude' and interesses='{saude}' and areas='{saude}' and moment='inicio' from public.professional_profiles where profile_id=:'u1'),'perfil antigo convertido sem perder momento nem áreas');
\set e1 '10000000-0000-0000-0000-000000000021'
\set e2 '10000000-0000-0000-0000-000000000022'
\set e3 '10000000-0000-0000-0000-000000000023'
\set e4 '10000000-0000-0000-0000-000000000024'
insert into auth.users(id,email) values(:'e1','e1@exemplo.invalid'),(:'e2','e2@exemplo.invalid'),(:'e3','e3@exemplo.invalid'),(:'e4','e4@exemplo.invalid');
set role authenticated;
select set_config('request.jwt.claim.sub', :'e1', false);
select public.mvp_save_profile('{"name":"pede um","situacao":"estudo","area_principal":"direito","interesses":["artes","comunicacao"],"can_help":[],"want_talk":["apresentacao"],"channels":["email"],"slots":["1_manha"]}', '{"email":"e1@exemplo.invalid"}', true);
select tst.ok((select occupation is null and moment is null and situacao='estudo' and areas @> '{direito,artes,comunicacao}' from public.professional_profiles where profile_id=auth.uid()),'cadastro novo sem texto livre nem momento');
select set_config('request.jwt.claim.sub', :'e2', false);
select public.mvp_save_profile('{"name":"ajuda dois","situacao":"trabalho","area_principal":"saude","interesses":["saude"],"can_help":["apresentacao"],"want_talk":[],"channels":["email"],"slots":["5_noite"]}', '{"email":"e2@exemplo.invalid","nome_completo":"Ajuda Dois da Silva"}', true);
reset role;
update public.profiles set status='aprovado' where id in(:'e1',:'e2');
set role authenticated;select set_config('request.jwt.claim.sub', :'e1', false);
select public.mvp_create_request('apresentacao','') as semhorario \gset
select tst.ok((select candidate_id=:'e2' from public.conversation_requests where id=:'semhorario'),'sem horário em comum, indica quem tem canal em comum');
reset role;
-- e3 tem área principal nos interesses de e1; e4 não. Empate nas regras antigas.
set role authenticated;
select set_config('request.jwt.claim.sub', :'e3', false);
select public.mvp_save_profile('{"name":"ajuda tres","situacao":"trabalho","area_principal":"artes","interesses":["engenharia"],"can_help":["apresentacao"],"want_talk":[],"channels":["email"],"slots":[]}', '{"email":"e3@exemplo.invalid"}', true);
select set_config('request.jwt.claim.sub', :'e4', false);
select public.mvp_save_profile('{"name":"ajuda quatro","situacao":"trabalho","area_principal":"engenharia","interesses":["engenharia"],"can_help":["apresentacao"],"want_talk":[],"channels":["email"],"slots":[]}', '{"email":"e4@exemplo.invalid"}', true);
reset role;
update public.profiles set status='aprovado' where id in(:'e3',:'e4');
set role authenticated;select set_config('request.jwt.claim.sub', :'e1', false);
select public.mvp_next_suggestion(:'semhorario') as pontuada \gset
select tst.ok(:'pontuada'=:'e3','pontuação escolhe quem tem a área de interesse de quem pede');
reset role;
-- nome completo: só depois do aceite
set role authenticated;select set_config('request.jwt.claim.sub', :'e1', false);
select public.mvp_create_request('apresentacao','') as pedido_nome \gset
select candidate_id as cand_nome from public.conversation_requests where id=:'pedido_nome' \gset
select public.mvp_invite(:'pedido_nome','oi, vamos conversar?') as convite_nome \gset
select tst.bloqueia(format('select public.mvp_shared_contacts(%L)', :'convite_nome'),'nome completo não aparece antes do aceite');
select tst.ok((select count(*) from public.professional_contacts where profile_id=:'e2')=0,'nome completo não é legível direto na tabela');
reset role;
select tst.ok(:'cand_nome' in (:'e2',:'e3',:'e4'),'nova busca indica outra pessoa compatível');
update public.conversation_invites set recipient_id=:'e2' where id=:'convite_nome' and recipient_id<>:'e2';
set role authenticated;select set_config('request.jwt.claim.sub', :'e2', false);
select public.mvp_respond(:'convite_nome',true);
select set_config('request.jwt.claim.sub', :'e1', false);
select tst.ok(public.mvp_shared_contacts(:'convite_nome')->>'nome_completo'='Ajuda Dois da Silva','nome completo liberado após o aceite');
select set_config('request.jwt.claim.sub', :'e2', false);
select public.mvp_save_profile('{"name":"ajuda dois","situacao":"trabalho","area_principal":"saude","interesses":["saude"],"can_help":["apresentacao"],"want_talk":[],"channels":["email"]}', '{"email":"e2@exemplo.invalid"}', true);
select tst.ok((select nome_completo='Ajuda Dois da Silva' from public.professional_contacts where profile_id=auth.uid()) and (select slots='{5_noite}' from public.professional_profiles where profile_id=auth.uid()),'salvar sem os campos antigos não apaga nome, sala nem horários');
reset role;
-- 023: objetivo no convite; texto só para "Outro" e nunca na IA.
\set f1 '10000000-0000-0000-0000-000000000031'
\set f2 '10000000-0000-0000-0000-000000000032'
insert into auth.users(id,email) values(:'f1','f1@exemplo.invalid'),(:'f2','f2@exemplo.invalid');
set role authenticated;
select set_config('request.jwt.claim.sub', :'f1', false);
select public.mvp_save_profile('{"name":"pede outro","situacao":"estudo","area_principal":"ciencias","interesses":["ciencias"],"can_help":[],"want_talk":["outro"],"channels":["whatsapp"],"ai_consent":true}', '{"whatsapp":"+5511988887777"}', true);
select set_config('request.jwt.claim.sub', :'f2', false);
select public.mvp_save_profile('{"name":"ajuda outro","situacao":"trabalho","area_principal":"ciencias","interesses":["ciencias"],"can_help":["outro","projeto"],"want_talk":[],"channels":["whatsapp"],"ai_consent":true}', '{"whatsapp":"+5511977776666"}', true);
reset role;
update public.profiles set status='aprovado' where id in(:'f1',:'f2');
set role authenticated;select set_config('request.jwt.claim.sub', :'f1', false);
select tst.bloqueia($$select public.mvp_create_request('outro','')$$,'"Outro" exige o texto do objetivo');
select tst.bloqueia($$select public.mvp_create_request('outro','fale comigo em teste@exemplo.invalid')$$,'texto de "Outro" recusa contatos');
select tst.bloqueia(format('select public.mvp_create_request(%L,%L)','outro',repeat('a',201)),'texto de "Outro" tem até 200 caracteres');
select public.mvp_create_request('projeto','este texto some') as sem_texto \gset
select tst.ok((select description is null from public.conversation_requests where id=:'sem_texto'),'outros objetivos não guardam contexto');
select public.mvp_create_request('outro','Montar um grupo de estudos de estatística') as com_texto \gset
select public.mvp_invite(:'com_texto','oi! topa conversar?') as convite_outro \gset
select set_config('request.jwt.claim.sub', :'f2', false);
select tst.ok((select goal='outro' and goal_text='Montar um grupo de estudos de estatística' from public.conversation_invites where id=:'convite_outro'),'quem recebe vê o objetivo e o texto de "Outro"');
reset role;
set role service_role;
select public.mvp_claim_job(:'com_texto') as job_outro \gset
reset role;
select tst.ok(:'job_outro' is null or position('estatística' in :'job_outro')=0,'texto de "Outro" nunca vai para a IA');
-- 024: cadastro em duas etapas.
\set g1 '10000000-0000-0000-0000-000000000041'
insert into auth.users(id,email) values(:'g1','g1@exemplo.invalid');
set role authenticated;select set_config('request.jwt.claim.sub', :'g1', false);
select tst.bloqueia($$select public.mvp_save_profile('{"name":"nova","situacao":"estudo","area_principal":"decidindo","modos":[]}','{}',true)$$,'primeiro acesso exige uma forma de participar');
select public.mvp_save_profile('{"name":"nova","situacao":"estudo","area_principal":"decidindo","modos":["ajudar","conversa"],"ai_consent":false}','{}',true);
select tst.ok((select intentions @> '{buscar,compartilhar}' and cardinality(can_help)=0 and cardinality(channels)=0 and cardinality(interesses)=0 from public.professional_profiles where profile_id=auth.uid()),'primeiro acesso salva só nome, situação, área e disposição');
reset role;
update public.profiles set status='aprovado' where id=:'g1';
set role authenticated;select set_config('request.jwt.claim.sub', :'g1', false);
select tst.bloqueia($$select public.mvp_create_request('carreira','')$$,'buscar exige completar contatos e interesses');
select public.mvp_save_profile('{"name":"nova","situacao":"estudo","area_principal":"decidindo","interesses":["artes"],"modos":["conversa"],"can_help":["rede"],"want_talk":["carreira"],"channels":["email"]}','{"email":"g1@exemplo.invalid"}',true);
select tst.ok((select intentions='{buscar}' and can_help='{}' and want_talk='{carreira}' from public.professional_profiles where profile_id=auth.uid()),'desmarcar "Topo ajudar" limpa a lista correspondente');
select public.mvp_create_request('carreira','') as completa \gset
select tst.ok(:'completa' is not null,'depois de completar, a busca acontece');
reset role;
-- 025: pedidos de avaliação na rotina diária, respostas novas e regra das notas baixas.
update public.conversation_invites set responded_at=now()-interval '6 days' where id=:'convite_nome';
select public.mvp_expire_invites();
select public.mvp_expire_invites();
select tst.ok((select count(*) from public.conversation_feedback_requests where invite_id=:'convite_nome')=2,'rotina cria um pedido por participante, sem duplicar');
select tst.ok((select pedidos_avaliacao=0 from public.conversation_expiry_runs order by id desc limit 1) and (select sum(pedidos_avaliacao)>=2 from public.conversation_expiry_runs),'log registra os pedidos criados');
set role authenticated;select set_config('request.jwt.claim.sub', :'e1', false);
select tst.ok((select count(*) from public.conversation_feedback_requests)=1,'cada uma vê só o seu pedido');
select id as pedido_e1 from public.conversation_feedback_requests \gset
select public.mvp_feedback_later(:'pedido_e1');
select tst.ok((select mostrar_a_partir>now()+interval '2 days' from public.conversation_feedback_requests where id=:'pedido_e1'),'lembrar depois esconde por 3 dias');
select public.mvp_feedback_v2(:'convite_nome','ainda_nao');
select public.mvp_feedback_v2(:'convite_nome','ainda_nao');
select tst.ok((select ainda_nao=2 and encerrado_em is null from public.conversation_feedback_requests where id=:'pedido_e1'),'"ainda não" volta a perguntar até 2 vezes');
select public.mvp_feedback_v2(:'convite_nome','ainda_nao');
select tst.ok((select encerrado_em is not null from public.conversation_feedback_requests where id=:'pedido_e1'),'depois do limite, para de perguntar');
select tst.bloqueia(format('select public.mvp_feedback_v2(%L,''sim'',null)', :'convite_nome'),'"sim" exige nota');
select public.mvp_feedback_v2(:'convite_nome','sim',2::smallint,array['escuta','dica']);
select tst.bloqueia(format('select public.mvp_feedback_later(%L)', (select id from public.conversation_feedback_requests where invite_id=:'convite_nome' and participante<>auth.uid())),'não mexe no pedido da outra');
select set_config('request.jwt.claim.sub', :'e2', false);
select tst.ok((select count(*) from public.conversation_feedback where invite_id=:'convite_nome')=0,'não lê a avaliação da outra');
select public.mvp_feedback_v2(:'convite_nome','sim',5::smallint,array['escuta']);
select tst.ok((select encerrado_em is not null from public.conversation_feedback_requests where participante=auth.uid() and invite_id=:'convite_nome'),'responder encerra o pedido');
select set_config('request.jwt.claim.sub', :'e1', false);
select tst.ok((select (x->>'conversas')::int=1 and x->'marcas'='["dica","escuta"]'::jsonb and not (x ? 'utility') from jsonb_array_elements(public.mvp_cards()) x where x->>'id'=:'e2'),'cartão mostra conversas realizadas e marcas, sem nota');
reset role;
update public.conversation_invites set state='recusada' where id=:'convite_nome';
set role service_role;
select tst.ok((select public.mvp_pick_candidate(:'e1','apresentacao',array[:'e3',:'e4']::uuid[])) is distinct from :'e2'::uuid,'par com nota 1 ou 2 não é indicado de novo');
reset role;
update public.conversation_invites set created_at=now()-interval '8 days' where state='pendente';
select public.mvp_expire_invites();
select tst.ok((select count(*) from public.conversation_invites where state='pendente')=0,'a expiração continua funcionando');
-- 026: indicadores da avaliação; usuária comum continua sem acesso.
set role authenticated;select set_config('request.jwt.claim.sub', :'e1', false);
select tst.bloqueia($$select public.mvp_metrics()$$,'participante não lê os indicadores da avaliação');
select tst.ok((select count(*) from public.conversation_expiry_runs)=0,'participante não lê o log da rotina');
select set_config('request.jwt.claim.sub', :cur, false);
select public.mvp_metrics() as painel2 \gset
select tst.ok(:'painel2'::jsonb ?& array['expired_invites','conversations_happened','useful_rate','top_marks','feedback_requests_pending'],'painel traz os indicadores da avaliação');
select tst.ok((:'painel2'::jsonb->>'expired_invites')::int>=1 and (:'painel2'::jsonb->'top_marks'->>'escuta')::int>=2,'expirados e marcas vêm de dados reais');
reset role;
-- 027: dúvida no feedback e métricas só para o painel.
set role anon;
select tst.bloqueia($$insert into public.feedback (tipo, mensagem) values ('duvida','Como funciona a indicação?')$$,'dúvida exige e-mail');
insert into public.feedback (tipo, mensagem, email) values ('duvida','Como funciona a indicação?','duvida@exemplo.invalid');
select tst.ok(true,'anônimo envia dúvida com e-mail');
select tst.bloqueia($$select * from public.feedback$$,'anônimo só insere, não lê');
select tst.bloqueia($$select public.mvp_feedback_metrics(current_date)$$,'anônimo não chama as métricas do feedback');
reset role;
set role authenticated;select set_config('request.jwt.claim.sub', :'e1', false);
select tst.ok((select count(*) from public.feedback)=0,'usuária comum não lê feedback');
select tst.bloqueia($$select public.mvp_feedback_metrics(current_date)$$,'usuária comum não chama as métricas do feedback');
update public.feedback set status='respondido';
reset role;
select tst.ok((select status='novo' from public.feedback where tipo='duvida'),'usuária comum não marca como respondido');
set role authenticated;
select set_config('request.jwt.claim.sub', :cur, false);
select public.mvp_feedback_metrics(current_date) as fbm \gset
select tst.ok((:'fbm'::jsonb->'por_tipo'->>'duvida')::int=1 and (:'fbm'::jsonb->>'novos')::int>=1,'métricas do mês por tipo e status');
update public.feedback set status='respondido' where tipo='duvida';
select tst.ok((select count(*) from public.feedback where tipo='duvida' and status='respondido')=1,'curadoria marca como respondido');
reset role;
