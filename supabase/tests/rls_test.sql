-- =====================================================================
-- Testes de RLS da aliadas (rodar com tests/rodar_testes.sh)
-- Cada "ok" confirma uma regra; qualquer falha interrompe o script.
-- =====================================================================
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;

create schema tst;
create function tst.ok(cond boolean, descricao text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALHOU: %', descricao; end if;
  raise notice 'ok: %', descricao;
end $$;
-- executa um comando que DEVE ser bloqueado
create function tst.bloqueia(comando text, descricao text) returns void language plpgsql as $$
begin
  begin
    execute comando;
  exception when others then
    raise notice 'ok: % (bloqueado: %)', descricao, sqlerrm;
    return;
  end;
  raise exception 'FALHOU (deveria bloquear): %', descricao;
end $$;
grant usage on schema tst to anon, authenticated;
grant execute on all functions in schema tst to anon, authenticated;

-- pessoas de teste
\set ana   '''aaaaaaaa-0000-0000-0000-000000000001'''
\set bia   '''bbbbbbbb-0000-0000-0000-000000000002'''
\set cris  '''cccccccc-0000-0000-0000-000000000003'''
\set cur   '''dddddddd-0000-0000-0000-000000000004'''
\set eve   '''eeeeeeee-0000-0000-0000-000000000005'''

insert into auth.users (id, email) values
  (:ana, 'ana@exemplo.invalid'), (:bia, 'bia@exemplo.invalid'), (:cris, 'cris@exemplo.invalid'),
  (:cur, 'cur@exemplo.invalid'), (:eve, 'eve@exemplo.invalid');
insert into public.roles values (:cur, 'curadora');
insert into public.profiles (id, apelido, de_onde_vem, onde_esta, area_interesse, objetivo_12_meses, forma_conexao, status, aprovado_em)
values (:bia,  'bia',  'professora que migrou', 'ate_2_anos', 'dados', 'ser pleno', 'chamada', 'aprovado', now()),
       (:cris, 'cris', 'veio do comércio',      'ate_2_anos', 'front', 'ser pleno', 'mensagem', 'aprovado', now());
insert into public.consents values (:bia, true, true, true, true, true), (:cris, true, true, true, true, true);
insert into public.contacts (profile_id, email, linkedin_url) values
  (:bia, 'bia@exemplo.invalid', 'https://www.linkedin.com/in/bia'),
  (:cris, 'cris@exemplo.invalid', null);
insert into vault.decrypted_secrets values ('recomendar_url', 'https://x/functions/v1/recomendar'), ('recomendar_webhook_secret', 's3gr3d0');

-- ---------------------------------------------------------------- anon
\echo '--- visitante (anon)'
set role anon;
select tst.bloqueia('select * from public.profiles', 'anon não lê perfis');
select tst.bloqueia('select * from public.contacts', 'anon não lê contatos');
select tst.bloqueia('select * from public.feedback', 'anon não lê feedback');
select tst.ok((select count(*) from public.programs) = 0, 'anon só vê programas ativos (os PREENCHER estão inativos)');
insert into public.feedback (tipo, nota_facilidade, encontrou_aliadas, mais_dificil) values ('avaliacao', 4, 'sim', 'nada');
select tst.ok(true, 'anon envia feedback de avaliação');
select tst.bloqueia($$insert into public.feedback (tipo, nota_facilidade, encontrou_aliadas, mais_dificil, status) values ('avaliacao', 4, 'sim', 'x', 'aprovado')$$, 'anon não escolhe o status do feedback');
select tst.bloqueia($$insert into public.feedback (tipo, nota_facilidade, encontrou_aliadas, mais_dificil, categoria_ia) values ('avaliacao', 4, 'sim', 'x', 'falso')$$, 'anon não preenche campos _ia');
select tst.bloqueia($$insert into public.feedback (tipo, indicacao_nome, indicacao_link, indicacao_motivo, indicacao_gratuito) values ('indicacao', 'x', 'http://inseguro.com', 'y', 'sim')$$, 'indicação só aceita https://');
select tst.bloqueia($$insert into public.feedback (tipo) values ('avaliacao')$$, 'feedback exige os campos do caminho');
select tst.bloqueia($$select public.salvar_cadastro('{}', '{}', '{}')$$, 'anon não cria cadastro');
reset role;

-- ------------------------------------------------------------- cadastro
\echo '--- cadastro da ana'
set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
select tst.bloqueia($$select public.salvar_cadastro(
  '{"apelido":"ana","de_onde_vem":"vim do jornalismo","onde_esta":"estudando","area_interesse":"dados","objetivo_12_meses":"primeira vaga","forma_conexao":"chamada"}',
  '{"autodeclaracao":true,"aceita_ser_recomendada":true,"entende_contato_pos_aceite":false,"sabe_que_pode_apagar":true,"aceita_termo_conduta":true}',
  '{"email":"ana@exemplo.invalid"}')$$, 'sem todos os consentimentos obrigatórios não há cadastro');
select tst.ok(not exists (select 1 from public.profiles where id = auth.uid()), 'cadastro recusado não deixa perfil pela metade');
select tst.ok(public.salvar_cadastro(
  '{"apelido":"ana","de_onde_vem":"vim do jornalismo","onde_esta":"estudando","area_interesse":"dados","objetivo_12_meses":"primeira vaga","forma_conexao":"chamada"}',
  '{"autodeclaracao":true,"aceita_ser_recomendada":true,"entende_contato_pos_aceite":true,"sabe_que_pode_apagar":true,"aceita_termo_conduta":true}',
  '{"email":"ana@exemplo.invalid","linkedin_url":"https://www.linkedin.com/in/ana"}') like 'P%', 'cadastro completo gera código P…');
select tst.ok((select status from public.profiles where id = auth.uid()) = 'pendente', 'perfil nasce pendente');
select tst.bloqueia($$update public.profiles set status = 'aprovado' where id = auth.uid()$$, 'ana não se autoaprova');
select tst.bloqueia($$update public.profiles set status = 'pausado' where id = auth.uid()$$, 'pendente não pode pausar para depois "despausar"');
select tst.bloqueia($$update public.profiles set codigo = 'P999' where id = auth.uid()$$, 'ana não muda o próprio código');
select tst.bloqueia($$update public.profiles set resumo = 'x' where id = auth.uid()$$, 'ana não escreve o resumo da IA');
select tst.bloqueia($$insert into public.contacts (profile_id, email) values ('bbbbbbbb-0000-0000-0000-000000000002', 'x@y.zz')$$, 'ana não cria contato em nome de outra');
select tst.bloqueia($$insert into public.contacts (profile_id, email, linkedin_url) values (auth.uid(), 'x@y.zz', 'https://evil.com')$$, 'linkedin precisa ser linkedin.com');
update public.profiles set apelido = 'ana b' where id = auth.uid();
select tst.ok((select apelido from public.profiles where id = auth.uid()) = 'ana b', 'ana edita o próprio perfil');
select tst.ok((select count(*) from public.profiles) = 1, 'ana (sem recomendação) só vê o próprio perfil');
select tst.ok((select count(*) from public.contacts) = 1, 'ana só vê o próprio contato');
select tst.ok((select count(*) from public.ai_runs) = 0, 'ana não lê ai_runs');
select tst.ok((select count(*) from public.roles) = 0, 'ana não tem papel');
select tst.bloqueia($$insert into public.recommendations (para_profile_id, aliada_profile_id, motivo) values (auth.uid(), 'bbbbbbbb-0000-0000-0000-000000000002', 'x')$$, 'ana não inventa recomendação');
select tst.bloqueia($$insert into public.connections (de_profile_id, para_profile_id) values (auth.uid(), 'bbbbbbbb-0000-0000-0000-000000000002')$$, 'conexão só pela função pedir_conexao');
select tst.bloqueia($$select public.pedir_conexao('bbbbbbbb-0000-0000-0000-000000000002')$$, 'pendente não pede conexão');
select tst.bloqueia($$insert into public.programs (nome) values ('falso')$$, 'ana não cadastra programa');
reset role;

-- ------------------------------------------------------------ curadoria
\echo '--- curadoria'
set role authenticated; select set_config('request.jwt.claim.sub', :cur, false);
select tst.ok(public.is_curadora(), 'curadora é reconhecida');
select tst.ok((select count(*) from public.profiles) = 3, 'curadora vê todos os perfis');
select tst.ok((select linkedin_url from public.contacts where profile_id = :ana) is not null, 'curadora confere o LinkedIn');
select tst.bloqueia($$update public.profiles set apelido = 'hackeado' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 'curadora não edita o conteúdo do perfil de outra');
update public.profiles set status = 'aprovado' where id = :ana;
select tst.ok((select aprovado_em is not null from public.profiles where id = :ana), 'aprovação marca aprovado_em');
select tst.ok((select count(*) from public.feedback) = 1, 'curadora lê feedback');
update public.feedback set status = 'em_analise';
select tst.ok((select status from public.feedback limit 1) = 'em_analise', 'curadora muda status do feedback');
select tst.bloqueia($$update public.feedback set categoria_ia = 'x'$$, 'curadora não sobrescreve campos _ia da automação (exceto rascunho)');
reset role;
select tst.ok((select count(*) from net.chamadas where body->>'profile_id' = :ana) = 1, 'aprovação disparou a Edge Function recomendar (1 chamada)');

-- a Edge Function (service role) grava a recomendação
set role service_role;
insert into public.recommendations (para_profile_id, aliada_profile_id, motivo) values (:ana, :bia, 'as duas vieram de outra área');
reset role;

-- ----------------------------------------------------- aliadas e conexão
\echo '--- aliadas e conexão'
set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
select tst.ok((select count(*) from public.recommendations) = 1, 'ana vê a própria recomendação');
select tst.ok(exists (select 1 from public.profiles where id = :bia), 'ana vê o perfil da aliada recomendada');
select tst.ok(not exists (select 1 from public.profiles where id = :cris), 'ana NÃO vê quem não foi recomendada');
select tst.ok(not exists (select 1 from public.contacts where profile_id = :bia), 'ana NÃO vê o contato da aliada antes do aceite');
select tst.bloqueia($$select public.pedir_conexao('cccccccc-0000-0000-0000-000000000003')$$, 'ana não pede conexão a quem não foi recomendada');
select public.pedir_conexao(:bia);
select tst.ok((select status from public.connections) = 'pendente', 'pedido criado como pendente');
select tst.bloqueia($$select public.responder_conexao((select id from public.connections limit 1), true)$$, 'quem pediu não aceita o próprio pedido');
reset role;

set role authenticated; select set_config('request.jwt.claim.sub', :bia, false);
select tst.ok(exists (select 1 from public.profiles where id = :ana), 'bia vê o perfil de quem pediu conexão');
select tst.ok(not exists (select 1 from public.contacts where profile_id = :ana), 'bia NÃO vê o contato da ana antes de aceitar');
select public.responder_conexao((select id from public.connections limit 1), true);
select tst.ok(exists (select 1 from public.contacts where profile_id = :ana), 'depois do aceite, bia vê o contato da ana');
reset role;

set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
select tst.ok(exists (select 1 from public.contacts where profile_id = :bia), 'depois do aceite, ana vê o contato da bia');
reset role;

set role authenticated; select set_config('request.jwt.claim.sub', :cris, false);
select tst.ok(not exists (select 1 from public.contacts where profile_id in (:ana, :bia)), 'cris (de fora) não vê contato de ninguém');
select tst.ok((select count(*) from public.connections) = 0, 'cris não vê conexões alheias');
select tst.ok((select count(*) from public.profiles) = 1, 'cris só vê o próprio perfil');
reset role;

-- ------------------------------------------------------------- fotos
\echo '--- fotos'
set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
insert into storage.objects (bucket_id, name) values ('fotos', 'aaaaaaaa-0000-0000-0000-000000000001/foto.webp');
select tst.ok(true, 'ana envia foto na própria pasta');
select tst.bloqueia($$insert into storage.objects (bucket_id, name) values ('fotos', 'bbbbbbbb-0000-0000-0000-000000000002/foto.jpg')$$, 'ana não envia foto na pasta de outra');
select tst.bloqueia($$insert into storage.objects (bucket_id, name) values ('fotos', 'aaaaaaaa-0000-0000-0000-000000000001/foto.gif')$$, 'só jpg/png/webp');
reset role;
insert into storage.objects (bucket_id, name) values ('fotos', 'bbbbbbbb-0000-0000-0000-000000000002/foto.jpg'),
                                                     ('fotos', 'cccccccc-0000-0000-0000-000000000003/foto.jpg');
set role authenticated; select set_config('request.jwt.claim.sub', :bia, false);
select tst.ok(exists (select 1 from storage.objects where name like 'aaaaaaaa%'), 'bia (aprovada e conectada) vê a foto da ana');
select tst.ok(not exists (select 1 from storage.objects where name like 'cccccccc%'), 'bia não vê foto de quem não tem relação');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :eve, false);
select tst.ok((select count(*) from storage.objects) = 0, 'eve (sem perfil aprovado) não vê foto nenhuma');
reset role;

-- ----------------------------------------------------- pausar e denúncia
\echo '--- pausar, denúncia, recusa'
set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
update public.profiles set status = 'pausado' where id = auth.uid();
update public.profiles set status = 'aprovado' where id = auth.uid();
select tst.ok((select status from public.profiles where id = auth.uid()) = 'aprovado', 'ana (já aprovada) pausa e volta');
reset role;
select tst.ok((select count(*) from net.chamadas) = 1, 'despausar NÃO gasta nova geração da IA');
set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
insert into public.reports (denunciante_id, denunciado_id, motivo) values (auth.uid(), :bia, 'teste de denúncia');
select tst.ok(true, 'ana denuncia um perfil que ela vê');
select tst.bloqueia($$insert into public.reports (denunciante_id, denunciado_id, motivo) values (auth.uid(), 'cccccccc-0000-0000-0000-000000000003', 'perfil que não vejo')$$, 'não denuncia perfil que não vê');
select tst.bloqueia($$insert into public.reports (denunciante_id, denunciado_id, motivo) values ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'em nome de outra')$$, 'não denuncia em nome de outra pessoa');
select tst.ok((select count(*) from public.reports) = 0, 'ana não lê denúncias');
select tst.ok((select count(*) from public.feedback) = 0, 'ana não lê feedback');
select tst.bloqueia($$select public.aprovar_indicacao(gen_random_uuid(), 'curso', 'dados', 'x', 'y')$$, 'só curadora aprova indicação');
reset role;

-- recusa: quem foi recusada não apaga para pedir de novo
set role service_role;
insert into public.recommendations (para_profile_id, aliada_profile_id, motivo) values (:cris, :bia, 'x');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :cris, false);
select public.pedir_conexao(:bia);
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :bia, false);
select public.responder_conexao((select id from public.connections where de_profile_id = :cris), false);
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :cris, false);
delete from public.connections where de_profile_id = :cris;
select tst.ok((select count(*) from public.connections where de_profile_id = :cris) = 1, 'recusada não consegue apagar o pedido para insistir');
select tst.ok(not exists (select 1 from public.contacts where profile_id = :bia), 'conexão recusada não libera contato');
reset role;

-- --------------------------------------------------- indicação aprovada
\echo '--- indicação vira programa'
set role anon;
insert into public.feedback (tipo, indicacao_nome, indicacao_link, indicacao_motivo, indicacao_gratuito)
values ('indicacao', 'programa fictício', 'https://exemplo.invalid/programa', 'muito bom', 'sim');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :cur, false);
select public.aprovar_indicacao((select id from public.feedback where tipo = 'indicacao'), 'programa', 'dados', 'descrição', 'obrigada!');
select tst.ok((select status from public.feedback where tipo = 'indicacao') = 'aprovado', 'indicação aprovada');
select tst.bloqueia($$select public.aprovar_indicacao((select id from public.feedback where tipo = 'indicacao'), 'programa', 'dados', 'x', 'y')$$, 'não aprova a mesma indicação duas vezes');
reset role;
set role anon;
select tst.ok((select count(*) from public.programs where origem = 'sugestao' and ativo) = 1, 'programa indicado aparece para todo mundo');
reset role;

-- ------------------------------------------------------- excluir conta
\echo '--- excluir conta'
insert into public.ai_runs (profile_id, funcao, input_resumido, output_json, sucesso) values (:ana, 'recomendar', 'P00x', '{"resumo":"ana"}', true);
delete from auth.users where id = :ana;  -- o que a Edge Function excluir-conta faz
select tst.ok(not exists (select 1 from public.profiles where id = :ana), 'perfil apagado');
select tst.ok(not exists (select 1 from public.contacts where profile_id = :ana), 'contato apagado');
select tst.ok(not exists (select 1 from public.consents where profile_id = :ana), 'consentimentos apagados');
select tst.ok(not exists (select 1 from public.connections where :ana in (de_profile_id, para_profile_id)), 'conexões apagadas');
select tst.ok(not exists (select 1 from public.recommendations where :ana in (para_profile_id, aliada_profile_id)), 'recomendações apagadas');
select tst.ok((select output_json->>'removido' from public.ai_runs where funcao = 'recomendar' limit 1) = 'conta excluída', 'registro da IA anonimizado');

\echo ''
\echo 'TODOS OS TESTES DE RLS PASSARAM'
