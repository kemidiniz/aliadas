\echo '--- 044: aviso do aceite para a remetente'
begin;
reset role;
select tst.ok(not exists(select 1 from public.conversation_email_notifications where event='aceite'),'migration não cria avisos para aceites antigos');
insert into vault.decrypted_secrets(name,decrypted_secret) values('mvp_invite_email_enabled','true');
update vault.decrypted_secrets set decrypted_secret='https://exemplo.invalid/functions/v1/conversa-ia' where name='mvp_worker_url';
insert into vault.decrypted_secrets(name,decrypted_secret) select 'mvp_worker_url','https://exemplo.invalid/functions/v1/conversa-ia' where not exists(select 1 from vault.decrypted_secrets where name='mvp_worker_url');
insert into vault.decrypted_secrets(name,decrypted_secret) select 'mvp_worker_secret',repeat('a',64) where not exists(select 1 from vault.decrypted_secrets where name='mvp_worker_secret');
insert into auth.users(id,email,email_confirmed_at) values('72000000-0000-4000-8000-000000000001','remetente-aceite@example.invalid',now()),('72000000-0000-4000-8000-000000000002','destinataria-aceite@example.invalid',now());
set role authenticated;select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000001',true);
select public.mvp_save_profile('{"name":"Remetente local","situacao":"trabalho","area_principal":"tecnologia","available":false,"habilidades":[],"channels":["email"]}','{"email":"contato-remetente@example.invalid"}',true);
select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000002',true);
select public.mvp_save_profile('{"name":"Destinatária local","situacao":"trabalho","area_principal":"tecnologia","available":true,"habilidades":["entrevistas"],"channels":["email"]}','{"email":"contato-destinataria@example.invalid"}',true);
select tst.bloqueia($$select public.mvp_claim_invite_email('72000000-0000-4000-8000-000000000011','aceite')$$,'conhecer id e evento não permite consultar destinatária do e-mail');
select tst.bloqueia($$select public.mvp_finish_invite_email('72000000-0000-4000-8000-000000000011',true,null,'aceite')$$,'participante não falsifica envio do aceite');
select tst.bloqueia($$select public.mvp_dispatch_invite_email('72000000-0000-4000-8000-000000000011','aceite')$$,'participante não dispara aviso de aceite diretamente');
reset role;
insert into public.conversation_requests(id,owner_id,intention,goal) values('72000000-0000-4000-8000-000000000010','72000000-0000-4000-8000-000000000001','buscar','entrevista');
update public.conversation_requests set candidate_id='72000000-0000-4000-8000-000000000002' where id='72000000-0000-4000-8000-000000000010';
set role authenticated;select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000001',true);
select public.mvp_invite_reviewed('72000000-0000-4000-8000-000000000010','72000000-0000-4000-8000-000000000002','Topa conversar sobre uma entrevista?') as convite \gset
reset role;
select tst.ok((select count(*) from public.conversation_email_notifications where invite_id=:'convite' and event='convite')=1,'novo convite ainda gera aviso para quem recebe');
select tst.ok(not exists(select 1 from public.conversation_email_notifications where invite_id=:'convite' and event='aceite'),'convite pendente não gera aviso falso de aceite');
set role service_role;
select public.mvp_claim_invite_email(:'convite') as novo \gset
select tst.ok(:'novo'::jsonb->>'email'='destinataria-aceite@example.invalid','RPC antigo continua usando destinatária do convite');
select public.mvp_finish_invite_email(:'convite',true,null);
reset role;
-- Um worker não envia aceite antes da mudança real de estado, mesmo com fila manipulada por serviço.
insert into public.conversation_email_notifications(invite_id,event) values(:'convite','aceite');
set role service_role;select public.mvp_claim_invite_email(:'convite','aceite');reset role;
select tst.ok((select state='ignorado' and error_code='convite_indisponivel' from public.conversation_email_notifications where invite_id=:'convite' and event='aceite'),'servidor exige estado aceito para enviar o aviso');
delete from public.conversation_email_notifications where invite_id=:'convite' and event='aceite';
set role authenticated;select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000002',true);
select public.mvp_respond(:'convite',true);
reset role;
select tst.ok((select count(*) from public.conversation_email_notifications where invite_id=:'convite')=2,'aceite cria registro independente sem apagar o aviso do convite');
select tst.ok(exists(select 1 from net.chamadas where url='https://exemplo.invalid/functions/v1/aviso-convite' and body=jsonb_build_object('invite_id',:'convite'::uuid,'notification_event','aceite')),'gatilho envia somente id e tipo do aviso');
select tst.ok((select state='enviado' from public.conversation_email_notifications where invite_id=:'convite' and event='convite'),'aceite preserva histórico do aviso de recebimento');
update public.conversation_invites set state='aceita' where id=:'convite';
select tst.ok((select count(*) from public.conversation_email_notifications where invite_id=:'convite' and event='aceite')=1,'atualização repetida de aceite não duplica notificação');
set role service_role;
select public.mvp_claim_invite_email(:'convite','aceite') as aceito \gset
select tst.ok(:'aceito'::jsonb->>'email'='remetente-aceite@example.invalid' and :'aceito'::jsonb->>'event'='aceite','aviso vai para e-mail de acesso da remetente, sem liberar contato privado');
select tst.ok(public.mvp_claim_invite_email(:'convite','aceite') is null,'duas execuções não enviam o mesmo aceite');
select public.mvp_finish_invite_email(:'convite',true,null,'aceite');
select tst.ok(public.mvp_claim_invite_email(:'convite','aceite') is null,'aceite já avisado não é reenviado');
reset role;
select tst.ok((select state='enviado' and finished_at is not null from public.conversation_email_notifications where invite_id=:'convite' and event='aceite'),'resultado do aceite é registrado separadamente');
update public.conversation_email_notifications set state='pendente' where invite_id=:'convite' and event='aceite';
update public.professional_profiles set invite_email_notifications=false where profile_id='72000000-0000-4000-8000-000000000001';
set role service_role;select public.mvp_claim_invite_email(:'convite','aceite');reset role;
select tst.ok((select state='ignorado' and error_code='avisos_desativados' from public.conversation_email_notifications where invite_id=:'convite' and event='aceite'),'aviso de aceite respeita preferência de quem enviou, não de quem aceitou');
update public.professional_profiles set invite_email_notifications=true where profile_id='72000000-0000-4000-8000-000000000001';
update public.conversation_email_notifications set state='pendente' where invite_id=:'convite' and event='aceite';
insert into public.conversation_blocks(owner_id,blocked_id) values('72000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000001');
set role service_role;select public.mvp_claim_invite_email(:'convite','aceite');reset role;
select tst.ok((select state='ignorado' and error_code='convite_indisponivel' from public.conversation_email_notifications where invite_id=:'convite' and event='aceite'),'bloqueio posterior ao aceite impede o aviso');
delete from public.conversation_blocks where owner_id='72000000-0000-4000-8000-000000000002';
update public.conversation_email_notifications set state='pendente' where invite_id=:'convite' and event='aceite';
set role service_role;select public.mvp_dispatch_invite_email(:'convite');reset role;
select tst.ok((select state='pendente' from public.conversation_email_notifications where invite_id=:'convite' and event='aceite'),'wrapper antigo não muda ou reivindica a fila de aceite');
-- A cota conta os dois tipos na mesma janela de 24h.
do $$declare r uuid;conv uuid;begin
 for n in 1..99 loop
  insert into public.conversation_requests(owner_id,intention,goal) values('72000000-0000-4000-8000-000000000001','buscar','entrevista') returning id into r;
  insert into public.conversation_invites(request_id,sender_id,recipient_id,message,state) values(r,'72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002','Somente teste local de cota','recusada') returning id into conv;
  insert into public.conversation_email_notifications(invite_id,event,state,started_at,finished_at) values(conv,case when n%2=0 then 'aceite' else 'convite' end,'enviado',now(),now());
 end loop;
end;$$;
set role service_role;select public.mvp_claim_invite_email(:'convite','aceite');reset role;
select tst.ok((select state='falha' and error_code='limite_diario' from public.conversation_email_notifications where invite_id=:'convite' and event='aceite'),'cota diária é compartilhada entre recebimentos e aceites');
-- Recusa não produz notificação de aceite; sem usar outra conta de produção.
update public.conversation_invites set state='pendente' where id=:'convite';
delete from public.conversation_email_notifications where invite_id=:'convite' and event='aceite';
set role authenticated;select public.mvp_respond(:'convite',false);reset role;
select tst.ok(not exists(select 1 from public.conversation_email_notifications where invite_id=:'convite' and event='aceite'),'recusa não produz aviso de aceite');
select tst.bloqueia(format($$insert into public.conversation_email_notifications(invite_id,event) values(%L,'inventado')$$,:'convite'),'tipo de notificação fora da lista é rejeitado');
set role anon;
select tst.bloqueia('select * from public.conversation_email_notifications','fila com dois tipos permanece privada');
select tst.bloqueia($$select public.mvp_claim_invite_email('72000000-0000-4000-8000-000000000011','aceite')$$,'visitante não usa novo RPC para obter endereços');
reset role;
rollback;
\echo 'TESTES DE AVISOS DE ACEITE PASSARAM'
