\echo '--- 045: quatro respostas obrigatórias e histórico preservado'
begin;
reset role;
select tst.ok((select avaliacao_versao=1 and clareza_fluxo is null and adequacao_ia is null and acompanhar_convites is null from public.feedback where email='historico45@example.invalid'),'histórico recebe versão legada sem inventar respostas');
select set_config('request.jwt.claim.sub',(select user_id::text from public.principal_administrator),true);
set role authenticated;
update public.feedback set status='respondido' where email='historico45@example.invalid';
select tst.ok((select status='respondido' and clareza_fluxo is null from public.feedback where email='historico45@example.invalid'),'administração continua tratando respostas históricas incompletas');
reset role;
set role anon;
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,encontrou_aliadas) values('avaliacao',4,'nao')$$,'nova avaliação não omite três perguntas obrigatórias');
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,adequacao_ia,acompanhar_convites) values('avaliacao',4,'nao_usei','nao_cheguei')$$,'clareza é obrigatória mesmo sem usar IA ou convites');
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,clareza_fluxo,acompanhar_convites) values('avaliacao',4,'5','nao_cheguei')$$,'resposta sobre IA não fica vazia');
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,clareza_fluxo,adequacao_ia) values('avaliacao',4,'5','nao_usei')$$,'resposta sobre acompanhar convites não fica vazia');
select tst.bloqueia($$insert into public.feedback(tipo,clareza_fluxo,adequacao_ia,acompanhar_convites) values('avaliacao','5','nao_usei','nao_cheguei')$$,'nota de facilidade é obrigatória');
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,clareza_fluxo,adequacao_ia,acompanhar_convites) values('avaliacao',4,'','nao_usei','nao_cheguei')$$,'vazio não é uma resposta de clareza');
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,encontrou_aliadas,avaliacao_versao) values('avaliacao',4,'nao',1)$$,'visitante não escolhe versão antiga para burlar perguntas');
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,encontrou_aliadas,created_at) values('avaliacao',4,'nao','2020-01-01')$$,'visitante não pode retroagir a data de uma avaliação');
insert into public.feedback(tipo,nota_facilidade,clareza_fluxo,adequacao_ia,acompanhar_convites,email) values('avaliacao',4,'5','nao_usei','nao_cheguei','obrigatorias45@example.invalid');
select tst.ok(true,'avaliação completa aceita situações não aplicáveis e pode deixar a quinta pergunta vazia');
insert into public.feedback(tipo,mensagem,email) values('duvida','Como encontro uma aliada?','duvida45@example.invalid');
insert into public.feedback(tipo,problema_descricao,problema_pagina) values('problema','Algo não abriu','Alianças');
select tst.ok(true,'dúvida e problema não exigem as perguntas de avaliação');
select tst.bloqueia('select * from public.feedback','obrigatoriedade não libera leitura das respostas');
reset role;
select tst.ok((select avaliacao_versao=2 and encontrou_aliadas is null and mudaria is null and clareza_fluxo='5' and adequacao_ia='nao_usei' and acompanhar_convites='nao_cheguei' from public.feedback where email='obrigatorias45@example.invalid'),'banco identifica versão nova, mantém respostas e opcionais vazios');
set role authenticated;
select tst.bloqueia($$insert into public.feedback(tipo,nota_facilidade,encontrou_aliadas,avaliacao_versao) values('avaliacao',4,'nao',1)$$,'estar logada não permite usar versão antiga');
reset role;
-- Conta recém-criada, ainda com o estado legado 'pendente', funciona sem aprovação.
insert into auth.users(id,email) values('75000000-0000-4000-8000-000000000001','sem-aprovacao45@example.invalid');
set role authenticated;select set_config('request.jwt.claim.sub','75000000-0000-4000-8000-000000000001',true);
select public.mvp_save_profile('{"name":"Cadastro imediato","situacao":"trabalho","area_principal":"tecnologia","available":false,"habilidades":[],"channels":["email"]}','{"email":"contato45@example.invalid"}',true);
select public.mvp_start_objective('Preparar entrevista de emprego',false,null) as objetivo \gset
reset role;
select tst.ok((select status='pendente' from public.profiles where id='75000000-0000-4000-8000-000000000001') and public.mvp_account_active('75000000-0000-4000-8000-000000000001') and public.mvp_pode_buscar('75000000-0000-4000-8000-000000000001'),'novo cadastro busca imediatamente sem aprovação manual');
select tst.ok(exists(select 1 from public.conversation_objectives where id=:'objetivo'),'novo cadastro define objetivo sem aprovação ou avaliação do site');
update public.profiles set status='pausado' where id='75000000-0000-4000-8000-000000000001';
select tst.ok(not public.mvp_account_active('75000000-0000-4000-8000-000000000001'),'remoção de aprovação não remove pausa ou moderação de conta');
rollback;
\echo 'TESTES DE FEEDBACK OBRIGATÓRIO PASSARAM'
