\echo '--- 043: avisos privados de novos convites'
begin;
reset role;
insert into vault.decrypted_secrets(name,decrypted_secret) values('mvp_invite_email_enabled','true');
update vault.decrypted_secrets set decrypted_secret='https://exemplo.invalid/functions/v1/conversa-ia' where name='mvp_worker_url';
insert into vault.decrypted_secrets(name,decrypted_secret) select 'mvp_worker_url','https://exemplo.invalid/functions/v1/conversa-ia' where not exists(select 1 from vault.decrypted_secrets where name='mvp_worker_url');
insert into vault.decrypted_secrets(name,decrypted_secret) select 'mvp_worker_secret',repeat('a',64) where not exists(select 1 from vault.decrypted_secrets where name='mvp_worker_secret');
insert into auth.users(id,email,email_confirmed_at) values('70000000-0000-4000-8000-000000000001','origem-aviso@example.invalid',now()),('70000000-0000-4000-8000-000000000002','destino-aviso@example.invalid',now());
set role authenticated;select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
select public.mvp_save_profile('{"name":"Origem local","situacao":"trabalho","area_principal":"tecnologia","available":false,"habilidades":[],"channels":["email"],"invite_email_notifications":false}','{"email":"contato-origem@example.invalid"}',true);
select tst.ok((select not invite_email_notifications from public.professional_profiles where profile_id=auth.uid()),'perfil salva preferência de e-mail da própria participante');
select public.mvp_save_profile('{"name":"Origem local","situacao":"trabalho","area_principal":"tecnologia","available":false,"habilidades":[],"channels":["email"]}','{"email":"contato-origem@example.invalid"}',true);
select tst.ok((select not invite_email_notifications from public.professional_profiles where profile_id=auth.uid()),'cliente antigo preserva preferência em vez de reativar avisos');
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
select public.mvp_save_profile('{"name":"Destino local","situacao":"trabalho","area_principal":"tecnologia","available":true,"habilidades":["entrevistas"],"channels":["email"]}','{"email":"contato-privado@example.invalid"}',true);
select tst.bloqueia('select * from public.conversation_email_notifications','participante não consulta a fila ou destinatárias');
select tst.bloqueia($$select public.mvp_claim_invite_email('70000000-0000-4000-8000-000000000011')$$,'conhecer id não permite obter o e-mail de login');
select tst.bloqueia($$select public.mvp_dispatch_invite_email('70000000-0000-4000-8000-000000000011')$$,'participante não dispara e-mails diretamente');
select tst.bloqueia($$select public.mvp_finish_invite_email('70000000-0000-4000-8000-000000000011',true,null)$$,'participante não falsifica comprovante de envio');
reset role;
insert into public.conversation_requests(id,owner_id,intention,goal) values('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000001','buscar','entrevista');
update public.conversation_requests set candidate_id='70000000-0000-4000-8000-000000000002' where id='70000000-0000-4000-8000-000000000010';
set role authenticated;select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
select public.mvp_invite_reviewed('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000002','Gostaria de conversar sobre uma entrevista.') as convite \gset
select tst.bloqueia(format('select public.mvp_shared_contacts(%L)',:'convite'),'notificação não libera contatos antes do aceite');
reset role;
select tst.ok((select count(*) from public.conversation_email_notifications where invite_id=:'convite')=1,'um convite cria um único registro de envio');
select tst.ok((select body=jsonb_build_object('invite_id',:'convite'::uuid) from net.chamadas where url='https://exemplo.invalid/functions/v1/aviso-convite' limit 1),'gatilho envia só id do convite, sem e-mail, nome ou mensagem');
set role service_role;
select public.mvp_claim_invite_email(:'convite') as job \gset
select tst.ok(:'job'::jsonb->>'email'='destino-aviso@example.invalid','worker usa e-mail de acesso apenas internamente, nunca o contato privado');
select tst.ok(public.mvp_claim_invite_email(:'convite') is null,'duas execuções não reivindicam o mesmo envio');
select public.mvp_finish_invite_email(:'convite',true,null);
select tst.ok(public.mvp_claim_invite_email(:'convite') is null,'e-mail já enviado não é reenviado por repetição do webhook');
reset role;
select tst.ok((select state='enviado' and finished_at is not null and error_code is null from public.conversation_email_notifications where invite_id=:'convite'),'aceite SMTP tem registro concluído sem conteúdo pessoal');
update public.conversation_email_notifications set state='pendente' where invite_id=:'convite';
update public.professional_profiles set invite_email_notifications=false where profile_id='70000000-0000-4000-8000-000000000002';
set role service_role;select public.mvp_claim_invite_email(:'convite');reset role;
select tst.ok((select state='ignorado' and error_code='avisos_desativados' from public.conversation_email_notifications where invite_id=:'convite'),'preferência desativada é respeitada no servidor');
update public.professional_profiles set invite_email_notifications=true where profile_id='70000000-0000-4000-8000-000000000002';
update public.conversation_email_notifications set state='pendente' where invite_id=:'convite';
update public.conversation_invites set state='aceita' where id=:'convite';
set role service_role;select public.mvp_claim_invite_email(:'convite');reset role;
select tst.ok((select state='ignorado' and error_code='convite_indisponivel' from public.conversation_email_notifications where invite_id=:'convite'),'convite já respondido não gera aviso pendente');
update public.conversation_invites set state='pendente' where id=:'convite';
update public.conversation_email_notifications set state='pendente' where invite_id=:'convite';
insert into public.conversation_blocks(owner_id,blocked_id) values('70000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000001');
set role service_role;select public.mvp_claim_invite_email(:'convite');reset role;
select tst.ok((select state='ignorado' and error_code='convite_indisponivel' from public.conversation_email_notifications where invite_id=:'convite'),'bloqueio impede envio de aviso');
delete from public.conversation_blocks where owner_id='70000000-0000-4000-8000-000000000002';
update public.conversation_email_notifications set state='processando',started_at=now()-interval '11 minutes' where invite_id=:'convite';
select public.mvp_retry_pending_invite_emails();
select tst.ok((select state='falha' and error_code='envio_indeterminado' from public.conversation_email_notifications where invite_id=:'convite'),'envio de resultado incerto é registrado sem reenvio automático');
select tst.ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='conversation_email_notifications' and column_name in ('email','message','name')),'fila não armazena e-mail, nome nem texto do convite');
-- Cem envios somente no banco local descartável, para verificar a proteção de cota.
do $$declare r uuid;conv uuid;begin
 for n in 1..100 loop
  insert into public.conversation_requests(owner_id,intention,goal) values('70000000-0000-4000-8000-000000000001','buscar','entrevista') returning id into r;
  insert into public.conversation_invites(request_id,sender_id,recipient_id,message,state) values(r,'70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','Convite local para teste de cota','recusada') returning id into conv;
  insert into public.conversation_email_notifications(invite_id,state,started_at,finished_at) values(conv,'enviado',now(),now());
 end loop;
end;$$;
update public.conversation_email_notifications set state='pendente' where invite_id=:'convite';
set role service_role;select public.mvp_claim_invite_email(:'convite');reset role;
select tst.ok((select state='falha' and error_code='limite_diario' from public.conversation_email_notifications where invite_id=:'convite'),'limite de cem e-mails em 24h é aplicado no servidor');
update vault.decrypted_secrets set decrypted_secret='false' where name='mvp_invite_email_enabled';
update public.conversation_email_notifications set state='pendente',dispatch_attempts=0 where invite_id=:'convite';
select public.mvp_dispatch_invite_email(:'convite');
select tst.ok((select state='pendente' and dispatch_attempts=0 from public.conversation_email_notifications where invite_id=:'convite'),'aguarda ativação sem consumir tentativas nem enviar com credencial inválida');
set role anon;
select tst.bloqueia('select * from public.conversation_email_notifications','visitante não consulta a fila');
select tst.bloqueia('select public.mvp_retry_pending_invite_emails()','visitante não aciona rotina de envios');
reset role;
rollback;
\echo 'TESTES DE AVISOS PASSARAM'
