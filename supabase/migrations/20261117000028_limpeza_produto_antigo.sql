-- 028 · Limpeza das tabelas e funções do produto antigo.
-- SÓ APLICAR EM PRODUÇÃO COM AUTORIZAÇÃO SEPARADA DA TITULAR, depois do backup
-- e das exportações em CSV (docs/LIMPEZA-BANCO.md).
-- Sem CASCADE cego: cada dependência é removida explicitamente, na ordem.

-- 1. Regra de visibilidade do MVP: posso ver o perfil e a foto de alguém se
--    sou eu, tenho acesso ao painel, ou existe entre nós uma indicação, um
--    pedido ou um convite (em qualquer estado), e não há bloqueio.
create function public.mvp_pode_ver(alvo uuid) returns boolean language sql stable security definer set search_path='' as $$
 select alvo=auth.uid()
 or public.is_curadora()
 or (auth.uid() is not null and not public.mvp_blocked(auth.uid(),alvo) and (
  exists(select 1 from public.conversation_requests r where (r.owner_id=auth.uid() and r.candidate_id=alvo) or (r.owner_id=alvo and r.candidate_id=auth.uid()))
  or exists(select 1 from public.conversation_suggestions s join public.conversation_requests r on r.id=s.request_id
    where (r.owner_id=auth.uid() and s.candidate_id=alvo) or (r.owner_id=alvo and s.candidate_id=auth.uid()))
  or exists(select 1 from public.conversation_invites i where (i.sender_id=auth.uid() and i.recipient_id=alvo) or (i.sender_id=alvo and i.recipient_id=auth.uid()))));
$$;
revoke all on function public.mvp_pode_ver(uuid) from public,anon,authenticated;
grant execute on function public.mvp_pode_ver(uuid) to authenticated,service_role;

-- 2. As três políticas que dependiam das funções antigas passam a usar mvp_pode_ver.
drop policy "perfis: vejo quando tenho motivo" on public.profiles;
create policy "perfis: vejo quando tenho motivo" on public.profiles for select to authenticated using(public.mvp_pode_ver(id));
drop policy "fotos: vejo quando posso ver o perfil" on storage.objects;
create policy "fotos: vejo quando posso ver o perfil" on storage.objects for select to authenticated using(
 bucket_id='fotos' and case when split_part(name,'/',1) ~ '^[0-9a-f-]{36}$' then public.mvp_pode_ver(split_part(name,'/',1)::uuid) else false end);
drop policy "denúncias: denuncio quem eu vejo" on public.reports;
create policy "denúncias: denuncio quem eu vejo" on public.reports for insert to authenticated with check(
 denunciante_id=auth.uid() and denunciado_id<>auth.uid() and public.mvp_pode_ver(denunciado_id));

-- 3. Gatilhos das tabelas e funções antigas.
drop trigger if exists profiles_anonimiza_ai_runs on public.profiles;
-- As tabelas do fórum podem já ter sido apagadas manualmente em produção (17/11):
-- os gatilhos só são removidos se a tabela ainda existir.
do $$begin
 if to_regclass('public.forum_posts') is not null then drop trigger if exists forum_posts_protege on public.forum_posts;end if;
 if to_regclass('public.forum_comentarios') is not null then drop trigger if exists forum_comentarios_protege on public.forum_comentarios;end if;
 if to_regclass('public.contacts') is not null then
  drop trigger if exists contacts_updated_at on public.contacts;
  drop trigger if exists contacts_aprova_com_linkedin on public.contacts;
 end if;
end;$$;
drop trigger if exists profiles_aprovado_recomendar on public.profiles;

-- 4. Políticas das tabelas que saem (antes das funções que elas usam).
do $$declare p record;begin
 for p in select policyname,tablename from pg_policies where schemaname='public'
  and tablename in ('forum_posts','forum_comentarios','forum_curtidas','programs','program_recommendations','recommendations','connections','contacts','ai_runs','conversation_time_proposals') loop
  execute format('drop policy %I on public.%I',p.policyname,p.tablename);
 end loop;
end;$$;

-- 5. Chaves estrangeiras de tabelas que ficam para tabelas que saem (as colunas ficam).
alter table public.feedback drop constraint if exists feedback_program_id_fkey;
alter table public.reports drop constraint if exists reports_post_id_fkey;
alter table public.reports drop constraint if exists reports_comentario_id_fkey;

-- 6. Funções antigas (lista conferida em pg_proc).
drop function if exists public.anonimiza_ai_runs();
drop function if exists public.aparece_na_busca(uuid);
drop function if exists public.aprova_com_linkedin();
drop function if exists public.aprovar_indicacao(uuid,text,text,text,text);
drop function if exists public.buscar_aliadas(text,text,text,integer);
drop function if exists public.conexao_aceita_com(uuid);
drop function if exists public.denunciar_conteudo(text,uuid,text);
drop function if exists public.dispara_recomendar();
drop function if exists public.forum_comentarios_de(uuid);
drop function if exists public.forum_feed(text,integer);
drop function if exists public.forum_protege();
drop function if exists public.minhas_geracoes_hoje();
drop function if exists public.pedir_conexao(uuid,text);
drop function if exists public.pode_ver_foto(text);
drop function if exists public.pode_ver_perfil(uuid);
drop function if exists public.responder_conexao(uuid,boolean);
drop function if exists public.salvar_cadastro(jsonb,jsonb,jsonb);
drop function if exists public.segredo_webhook_recomendar();
drop function if exists public.toca_updated_at();
drop function if exists public.mvp_propose_times(uuid,timestamptz[]);
drop function if exists public.mvp_confirm_time(uuid);
drop function if exists public.mvp_schedule(uuid,text);

-- 7. Tabelas antigas, das dependentes para as referenciadas.
drop table if exists public.forum_curtidas;
drop table if exists public.forum_comentarios;
drop table if exists public.forum_posts;
drop table public.program_recommendations;
drop table public.recommendations;
drop table public.programs;
drop table public.connections;
drop table public.contacts;
drop table public.ai_runs;
drop table public.conversation_time_proposals;
