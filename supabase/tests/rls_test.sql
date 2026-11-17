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
grant usage on schema tst to anon, authenticated, service_role;
grant execute on all functions in schema tst to anon, authenticated, service_role;

select tst.ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'feedback' and column_name = 'mais_dificil'), 'feedback não tem mais a coluna mais_dificil');

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
insert into public.profiles (id, apelido, de_onde_vem, onde_esta, areas, formas_conexao, status, aprovado_em)
values (:ana,  'ana',  'perfil profissional', 'estudando', '{perfil profissional}', '{mensagem}', 'pendente', null),
       (:bia,  'bia',  'perfil profissional', 'estudando', '{perfil profissional}', '{mensagem}', 'aprovado', now()),
       (:cris, 'cris', 'perfil profissional', 'estudando', '{perfil profissional}', '{mensagem}', 'aprovado', now());
insert into public.consents values (:ana, true, true, true, true, true), (:bia, true, true, true, true, true), (:cris, true, false, true, true, true);

-- ---------------------------------------------------------------- anon
\echo '--- visitante (anon)'
set role anon;
select tst.bloqueia('select * from public.profiles', 'anon não lê perfis');
select tst.bloqueia('select * from public.feedback', 'anon não lê feedback');
insert into public.feedback (tipo, nota_facilidade, encontrou_aliadas) values ('avaliacao', 4, 'sim');
select tst.ok(true, 'anon envia feedback de avaliação');
select tst.bloqueia($$insert into public.feedback (tipo, nota_facilidade, encontrou_aliadas, status) values ('avaliacao', 4, 'sim', 'aprovado')$$, 'anon não escolhe o status do feedback');
select tst.bloqueia($$insert into public.feedback (tipo, nota_facilidade, encontrou_aliadas, categoria_ia) values ('avaliacao', 4, 'sim', 'falso')$$, 'anon não preenche campos _ia');
select tst.bloqueia($$insert into public.feedback (tipo) values ('avaliacao')$$, 'feedback exige os campos do caminho');
insert into public.feedback (tipo, nota_facilidade, encontrou_aliadas, email) select 'avaliacao', 5, 'sim', 'Repetida@exemplo.invalid' from generate_series(1, 3);
select tst.bloqueia($$insert into public.feedback (tipo, nota_facilidade, encontrou_aliadas, email) values ('avaliacao', 5, 'sim', 'repetida@exemplo.invalid')$$, 'no máximo 3 feedbacks por e-mail por dia');
reset role;

-- ------------------------------------------------------------- perfil
\echo '--- perfil da ana'
set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
select tst.bloqueia($$update public.profiles set status = 'aprovado' where id = auth.uid()$$, 'ana não se autoaprova');
select tst.bloqueia($$update public.profiles set codigo = 'P999' where id = auth.uid()$$, 'ana não muda o próprio código');
select tst.bloqueia($$update public.profiles set resumo = 'x' where id = auth.uid()$$, 'ana não escreve o resumo da IA');
update public.profiles set apelido = 'ana b' where id = auth.uid();
select tst.ok((select apelido from public.profiles where id = auth.uid()) = 'ana b', 'ana edita o próprio perfil');
select tst.ok((select count(*) from public.profiles) = 1, 'sem indicação, pedido ou convite, ana só vê o próprio perfil');
select tst.ok((select count(*) from public.roles) = 0, 'ana não tem papel');
reset role;

-- ------------------------------------------------------------ curadoria
\echo '--- curadoria'
set role authenticated; select set_config('request.jwt.claim.sub', :cur, false);
select tst.ok(public.is_curadora(), 'curadora é reconhecida');
select tst.ok((select count(*) from public.profiles) = 3, 'curadoria vê todos os perfis');
select tst.bloqueia($$update public.profiles set apelido = 'hackeado' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 'curadora não edita o conteúdo do perfil de outra');
update public.profiles set status = 'aprovado' where id = :ana;
select tst.ok((select aprovado_em is not null from public.profiles where id = :ana), 'aprovação marca aprovado_em');
select tst.ok((select count(*) from public.feedback) >= 1, 'curadora lê feedback');
update public.feedback set status = 'em_analise';
select tst.ok((select status from public.feedback limit 1) = 'em_analise', 'curadora muda status do feedback');
select tst.bloqueia($$update public.feedback set categoria_ia = 'x'$$, 'curadora não sobrescreve campos _ia da automação (exceto rascunho)');
reset role;

-- ------------------------------------------- visibilidade do MVP e fotos
\echo '--- visibilidade: indicação, pedido ou convite'
-- ana pede uma conversa e bia é a indicação (sem cris)
insert into public.conversation_requests (id, owner_id, intention, goal) values ('f0000000-0000-0000-0000-000000000001', :ana, 'buscar', 'carreira');
update public.conversation_requests set candidate_id = :bia where id = 'f0000000-0000-0000-0000-000000000001';
set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
insert into storage.objects (bucket_id, name) values ('fotos', 'aaaaaaaa-0000-0000-0000-000000000001/foto.webp');
select tst.ok(true, 'ana envia foto na própria pasta');
select tst.bloqueia($$insert into storage.objects (bucket_id, name) values ('fotos', 'bbbbbbbb-0000-0000-0000-000000000002/foto.jpg')$$, 'ana não envia foto na pasta de outra');
select tst.bloqueia($$insert into storage.objects (bucket_id, name) values ('fotos', 'aaaaaaaa-0000-0000-0000-000000000001/foto.gif')$$, 'só jpg/png/webp');
reset role;
insert into storage.objects (bucket_id, name) values ('fotos', 'bbbbbbbb-0000-0000-0000-000000000002/foto.jpg'),
                                                     ('fotos', 'cccccccc-0000-0000-0000-000000000003/foto.jpg'),
                                                     ('fotos', 'nao-e-uuid/foto.jpg');
set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
select tst.ok(exists (select 1 from public.profiles where id = :bia), 'na indicação, a participante vê o perfil da outra');
select tst.ok(exists (select 1 from storage.objects where name like 'bbbbbbbb%'), 'na indicação, vê a foto da outra');
select tst.ok(not exists (select 1 from public.profiles where id = :cris) and not exists (select 1 from storage.objects where name like 'cccccccc%'), 'terceira pessoa não aparece');
select tst.ok(not exists (select 1 from storage.objects where name like 'nao-e-uuid%'), 'caminho fora do padrão não abre');
insert into public.reports (denunciante_id, denunciado_id, motivo) values (auth.uid(), :bia, 'teste de denúncia');
select tst.ok(true, 'denúncia funciona para quem ela vê');
select tst.bloqueia($$insert into public.reports (denunciante_id, denunciado_id, motivo) values (auth.uid(), 'cccccccc-0000-0000-0000-000000000003', 'perfil que não vejo')$$, 'não denuncia perfil que não vê');
select tst.bloqueia($$insert into public.reports (denunciante_id, denunciado_id, motivo) values ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'em nome de outra')$$, 'não denuncia em nome de outra pessoa');
select tst.ok((select count(*) from public.reports) = 0, 'ana não lê denúncias');
select tst.ok((select count(*) from public.feedback) = 0, 'ana não lê feedback');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :bia, false);
select tst.ok(exists (select 1 from public.profiles where id = :ana) and exists (select 1 from storage.objects where name like 'aaaaaaaa%'), 'a indicada também vê quem pediu');
reset role;
-- convite: cris convida bia
insert into public.conversation_requests (id, owner_id, intention, goal) values ('f0000000-0000-0000-0000-000000000002', :cris, 'buscar', 'rede');
insert into public.conversation_invites (request_id, sender_id, recipient_id, message) values ('f0000000-0000-0000-0000-000000000002', :cris, :bia, 'oi');
set role authenticated; select set_config('request.jwt.claim.sub', :bia, false);
select tst.ok(exists (select 1 from public.profiles where id = :cris), 'no convite, a destinatária vê o perfil de quem convidou');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :eve, false);
select tst.ok((select count(*) from storage.objects) = 0 and (select count(*) from public.profiles) = 0, 'eve (sem relação) não vê perfis nem fotos');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :cur, false);
select tst.ok((select count(*) from storage.objects where bucket_id = 'fotos') >= 3, 'curadoria vê as fotos');
reset role;
-- bloqueio esconde perfil e foto
insert into public.conversation_blocks (owner_id, blocked_id) values (:bia, :ana);
set role authenticated; select set_config('request.jwt.claim.sub', :ana, false);
select tst.ok(not exists (select 1 from public.profiles where id = :bia), 'bloqueio esconde o perfil');
reset role;
delete from public.conversation_blocks where owner_id = :bia;

-- ------------------------------------------- nada aponta para o que saiu
\echo '--- limpeza do produto antigo'
select tst.ok(not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name in ('forum_posts','forum_comentarios','forum_curtidas','programs','program_recommendations','recommendations','connections','contacts','ai_runs','conversation_time_proposals')), 'tabelas antigas removidas');
select tst.ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  and p.prosrc ~ '\m(forum_posts|forum_comentarios|forum_curtidas|programs|program_recommendations|recommendations|connections|contacts|ai_runs|conversation_time_proposals|pode_ver_perfil|pode_ver_foto|conexao_aceita_com|aparece_na_busca)\M'), 'nenhuma função restante usa o que saiu');
select tst.ok(not exists (select 1 from pg_policies where coalesce(qual, '') || coalesce(with_check, '') ~ '(pode_ver_perfil|pode_ver_foto|conexao_aceita_com|aparece_na_busca|forum_|connections|recommendations|programs|contacts|ai_runs)'), 'nenhuma política usa o que saiu');

-- ------------------------------------------------------- excluir conta
\echo '--- excluir conta'
delete from auth.users where id = :eve;  -- o que a Edge Function excluir-conta faz
select tst.ok(not exists (select 1 from public.profiles where id = :eve), 'perfil apagado');

\echo ''
\ir mvp_test.sql
\ir admin_test.sql
\ir habilidades_test.sql
\ir recomendacao_test.sql
\ir revisao_motivo_test.sql
\ir painel_pendencias_test.sql
\echo 'TODOS OS TESTES DE RLS PASSARAM'
