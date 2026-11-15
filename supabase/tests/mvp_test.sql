\echo '--- MVP profissional: permissões e fluxo'
\set u1 '10000000-0000-0000-0000-000000000001'
\set u2 '10000000-0000-0000-0000-000000000002'
\set u3 '10000000-0000-0000-0000-000000000003'
insert into auth.users(id,email) values(:'u1','um@exemplo.invalid'),(:'u2','dois@exemplo.invalid'),(:'u3','tres@exemplo.invalid');
set role anon;
select tst.bloqueia($$select public.mvp_create_request('buscar','carreira','')$$,'visitante não cria solicitação');
select tst.bloqueia($$select * from public.professional_contacts$$,'visitante não lê contatos profissionais');
select tst.bloqueia($$select public.mvp_claim_job(gen_random_uuid())$$,'visitante não aciona IA');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :'u1', false);
select public.mvp_save_profile('{"name":"pessoa um","occupation":"formação em saúde","moment":"inicio","areas":["saude"],"themes":["carreira"],"intentions":["buscar"],"channels":["email"],"slots":["1_tarde"],"ai_consent":false}', '{}', true);
select tst.ok((select email is null from public.professional_contacts where profile_id=auth.uid()),'e-mail de login não foi copiado como contato');
select tst.bloqueia($$select public.mvp_create_request('buscar','carreira','')$$,'perfil pendente não cria solicitação');
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
select public.mvp_create_request('buscar','carreira','texto privado que não vai para a IA') as request \gset
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
select public.mvp_schedule(:'invite','20/11, 15h, Brasília');
select public.mvp_feedback(:'invite',true,5::smallint,'clareza');
select tst.bloqueia(format('select public.mvp_feedback(%L,false,5::smallint,''clareza'')', :'invite'),'feedback incoerente é rejeitado');
select set_config('request.jwt.claim.sub', :'u2', false);
select public.mvp_feedback(:'invite',false,null,'nao_aconteceu');
select tst.ok((select count(*) from public.conversation_feedback where invite_id=:'invite')=1,'cada uma lê apenas sua própria avaliação');
reset role;
select tst.ok((select count(*) from public.conversation_feedback where invite_id=:'invite')=2,'respostas independentes foram preservadas');
-- Nova tentativa sem par disponível; sem inventar resultado de IA.
set role authenticated;select set_config('request.jwt.claim.sub', :'u1', false);
select public.mvp_create_request('buscar','carreira','') as second_request \gset
select tst.ok((select state='sem_candidata' from public.conversation_requests where id=:'second_request'),'não sugere novamente par com conexão ativa');
select public.mvp_create_request('buscar','projeto','');
select tst.bloqueia($$select public.mvp_create_request('buscar','carreira','')$$,'quarta solicitação em 24h bloqueada');
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
insert into public.conversation_jobs(request_id) values(:'request') returning id as job \gset
set role service_role;
select public.mvp_claim_job(:'request') as payload \gset
select tst.ok(:'payload'::jsonb->>'goal'='carreira','worker recebe objetivo categórico');
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
select public.mvp_create_request('buscar','carreira','não enviar esta descrição') as queued \gset
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
