\echo '--- Apoio e canais não burlam privacidade'
reset role;
select tst.ok(position('@' in public.mvp_redact_support('Entre em contato: maria@exemplo.invalid +55 (11) 99999-8888 https://exemplo.invalid 123.456.789-00'))=0,'apoio remove e-mail');
select tst.ok(position('99999' in public.mvp_redact_support('WhatsApp +55 (11) 99999-8888'))=0,'apoio remove telefone');
select tst.ok(position('https://' in public.mvp_redact_support('Veja https://exemplo.invalid/perfil'))=0,'apoio remove URL');
select tst.ok(position('123.456' in public.mvp_redact_support('Documento 123.456.789-00'))=0,'apoio remove documento');
update public.conversation_requests set description='Preciso preparar uma entrevista. pessoa@exemplo.invalid +5511999999999 https://exemplo.invalid' where id=:'badr';
set role authenticated;select set_config('request.jwt.claim.sub', :'h1', false);
select public.mvp_invite(:'badr','Oi, podemos conversar?') as convite_privado \gset
select tst.bloqueia(format('select public.mvp_shared_contacts(%L)', :'convite_privado'),'aceite pendente não libera Meet');
select set_config('request.jwt.claim.sub', :'h2', false);
select tst.ok(position('@' in (public.mvp_invite_context(:'convite_privado')->>'description'))=0,'destinatária não vê contatos colados no apoio');
select public.mvp_respond(:'convite_privado',true);
reset role;
update public.professional_contacts set meet='https://meet.google.com/abc-defg-hij' where profile_id=:'h2';
set role authenticated;select set_config('request.jwt.claim.sub', :'h1', false);
select tst.ok(public.mvp_shared_contacts(:'convite_privado')->>'meet'='https://meet.google.com/abc-defg-hij','Meet autorizado só aparece após aceite');
reset role;update public.professional_profiles set channels='{email}' where profile_id=:'h2';
set role authenticated;select set_config('request.jwt.claim.sub', :'h1', false);
select tst.ok(public.mvp_shared_contacts(:'convite_privado')->>'meet' is null,'Meet antigo preenchido mas não autorizado permanece oculto');
select tst.bloqueia($$update public.profiles set review_reason='forjado' where id=auth.uid()$$,'participante não altera motivo administrativo');
reset role;
