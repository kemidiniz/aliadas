-- =====================================================================
-- aliadas · 009 · fórum da comunidade
-- - só perfis APROVADOS leem, postam, curtem e comentam
-- - post publica na hora; qualquer uma denuncia; curadoria pode ocultar
-- - quem lê vê só apelido e foto de quem escreveu (contato continua
--   só depois do aceite de conexão)
-- - limite anti-spam: 10 posts e 60 comentários por pessoa a cada 24 h
-- =====================================================================

create table public.forum_posts (
  id         uuid primary key default gen_random_uuid(),
  autora_id  uuid not null references public.profiles(id) on delete cascade,
  texto      text not null check (char_length(btrim(texto)) between 1 and 2000),
  area       text check (area is null or char_length(btrim(area)) between 2 and 60),
  oculto     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index forum_posts_recentes on public.forum_posts (created_at desc);

create table public.forum_comentarios (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.forum_posts(id) on delete cascade,
  autora_id  uuid not null references public.profiles(id) on delete cascade,
  texto      text not null check (char_length(btrim(texto)) between 1 and 1000),
  oculto     boolean not null default false,
  created_at timestamptz not null default now()
);
create index forum_comentarios_post on public.forum_comentarios (post_id, created_at);

create table public.forum_curtidas (
  post_id    uuid not null references public.forum_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

-- denúncias também podem apontar para um post ou comentário
alter table public.reports
  add column post_id uuid references public.forum_posts(id) on delete cascade,
  add column comentario_id uuid references public.forum_comentarios(id) on delete cascade;

-- ---------------------------------------------------------------------
-- gatilhos: limite de uso e proteção do campo "oculto"
-- ---------------------------------------------------------------------
create or replace function public.forum_protege()
returns trigger language plpgsql set search_path = '' as $$
declare
  chamada_do_app boolean := current_user in ('authenticated', 'anon');
begin
  if not chamada_do_app then return new; end if;

  if tg_op = 'INSERT' then
    if tg_table_name = 'forum_posts' and (
      select count(*) from public.forum_posts
       where autora_id = auth.uid() and created_at > now() - interval '24 hours') >= 10 then
      raise exception 'você já publicou 10 posts hoje. amanhã tem mais espaço.';
    end if;
    if tg_table_name = 'forum_comentarios' and (
      select count(*) from public.forum_comentarios
       where autora_id = auth.uid() and created_at > now() - interval '24 hours') >= 60 then
      raise exception 'muitos comentários hoje. dá uma pausa e volta amanhã.';
    end if;
    if new.oculto then raise exception 'não permitido'; end if;
  end if;

  if tg_op = 'UPDATE' then
    -- só a curadoria oculta ou mostra; a autora só edita o texto
    if new.oculto is distinct from old.oculto and not public.is_curadora() then
      raise exception 'só a curadoria pode ocultar ou mostrar conteúdos';
    end if;
    if public.is_curadora() and old.autora_id is distinct from auth.uid()
       and (to_jsonb(new) - 'oculto' - 'updated_at') is distinct from (to_jsonb(old) - 'oculto' - 'updated_at') then
      raise exception 'a curadoria só oculta ou mostra conteúdos de outras pessoas';
    end if;
    if tg_table_name = 'forum_posts' then new.updated_at := now(); end if;
  end if;

  return new;
end;
$$;

create trigger forum_posts_protege before insert or update on public.forum_posts
  for each row execute function public.forum_protege();
create trigger forum_comentarios_protege before insert or update on public.forum_comentarios
  for each row execute function public.forum_protege();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.forum_posts       enable row level security;
alter table public.forum_comentarios enable row level security;
alter table public.forum_curtidas    enable row level security;

create policy "fórum: aprovadas leem posts visíveis" on public.forum_posts
  for select to authenticated
  using ((public.eu_aprovada() and not oculto) or autora_id = auth.uid() or public.is_curadora());
create policy "fórum: aprovadas publicam em seu nome" on public.forum_posts
  for insert to authenticated with check (autora_id = auth.uid() and public.eu_aprovada());
create policy "fórum: autora edita; curadora oculta" on public.forum_posts
  for update to authenticated
  using (autora_id = auth.uid() or public.is_curadora())
  with check (autora_id = auth.uid() or public.is_curadora());
create policy "fórum: autora ou curadora apaga" on public.forum_posts
  for delete to authenticated using (autora_id = auth.uid() or public.is_curadora());

create policy "fórum: aprovadas leem comentários visíveis" on public.forum_comentarios
  for select to authenticated
  using ((public.eu_aprovada() and not oculto) or autora_id = auth.uid() or public.is_curadora());
create policy "fórum: aprovadas comentam em posts visíveis" on public.forum_comentarios
  for insert to authenticated
  with check (
    autora_id = auth.uid() and public.eu_aprovada()
    and exists (select 1 from public.forum_posts p where p.id = post_id and not p.oculto)
  );
create policy "fórum: autora edita comentário; curadora oculta" on public.forum_comentarios
  for update to authenticated
  using (autora_id = auth.uid() or public.is_curadora())
  with check (autora_id = auth.uid() or public.is_curadora());
create policy "fórum: autora ou curadora apaga comentário" on public.forum_comentarios
  for delete to authenticated using (autora_id = auth.uid() or public.is_curadora());

create policy "fórum: aprovadas veem curtidas" on public.forum_curtidas
  for select to authenticated using (public.eu_aprovada() or public.is_curadora());
create policy "fórum: curto em meu nome" on public.forum_curtidas
  for insert to authenticated
  with check (
    profile_id = auth.uid() and public.eu_aprovada()
    and exists (select 1 from public.forum_posts p where p.id = post_id and not p.oculto)
  );
create policy "fórum: descurto o meu" on public.forum_curtidas
  for delete to authenticated using (profile_id = auth.uid());

grant select, delete on public.forum_posts to authenticated;
grant insert (autora_id, texto, area) on public.forum_posts to authenticated;
grant update (texto, area, oculto) on public.forum_posts to authenticated;
grant select, delete on public.forum_comentarios to authenticated;
grant insert (post_id, autora_id, texto) on public.forum_comentarios to authenticated;
grant update (texto, oculto) on public.forum_comentarios to authenticated;
grant select, insert, delete on public.forum_curtidas to authenticated;

-- ---------------------------------------------------------------------
-- leitura do feed: devolve só apelido e foto de quem escreveu
-- ---------------------------------------------------------------------
create or replace function public.forum_feed(p_ordem text default 'recentes', p_limite int default 50)
returns table (
  id uuid, texto text, area text, created_at timestamptz, oculto boolean,
  autora_id uuid, autora_apelido text, autora_foto_path text,
  curtidas bigint, comentarios bigint, curti boolean, minha boolean
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.eu_aprovada() or public.is_curadora()) then
    raise exception 'o fórum é para perfis aprovados';
  end if;
  return query
    select p.id, p.texto, p.area, p.created_at, p.oculto,
           p.autora_id, pr.apelido, pr.foto_path,
           (select count(*) from public.forum_curtidas c where c.post_id = p.id),
           (select count(*) from public.forum_comentarios m where m.post_id = p.id and not m.oculto),
           exists (select 1 from public.forum_curtidas c where c.post_id = p.id and c.profile_id = auth.uid()),
           p.autora_id = auth.uid()
      from public.forum_posts p
      join public.profiles pr on pr.id = p.autora_id
     where (not p.oculto or p.autora_id = auth.uid() or public.is_curadora())
     order by
       case when p_ordem = 'evidencia'
            then (select count(*) from public.forum_curtidas c where c.post_id = p.id) end desc nulls last,
       p.created_at desc
     limit least(greatest(p_limite, 1), 100);
end;
$$;

create or replace function public.forum_comentarios_de(p_post uuid)
returns table (
  id uuid, texto text, created_at timestamptz, oculto boolean,
  autora_id uuid, autora_apelido text, autora_foto_path text, minha boolean
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.eu_aprovada() or public.is_curadora()) then
    raise exception 'o fórum é para perfis aprovados';
  end if;
  return query
    select m.id, m.texto, m.created_at, m.oculto, m.autora_id, pr.apelido, pr.foto_path, m.autora_id = auth.uid()
      from public.forum_comentarios m
      join public.profiles pr on pr.id = m.autora_id
     where m.post_id = p_post
       and (not m.oculto or m.autora_id = auth.uid() or public.is_curadora())
     order by m.created_at;
end;
$$;

-- denunciar post ou comentário (a denúncia aponta para a autora)
create or replace function public.denunciar_conteudo(p_tipo text, p_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  autora uuid;
begin
  if not public.eu_aprovada() then raise exception 'só perfis aprovados podem denunciar'; end if;
  if p_tipo = 'post' then
    select autora_id into autora from public.forum_posts where id = p_id and not oculto;
  elsif p_tipo = 'comentario' then
    select autora_id into autora from public.forum_comentarios where id = p_id and not oculto;
  else
    raise exception 'tipo inválido';
  end if;
  if autora is null then raise exception 'conteúdo não encontrado'; end if;
  if autora = auth.uid() then raise exception 'você não pode denunciar o próprio conteúdo'; end if;

  insert into public.reports (denunciante_id, denunciado_id, motivo, post_id, comentario_id)
  values (auth.uid(), autora, p_motivo,
          case when p_tipo = 'post' then p_id end,
          case when p_tipo = 'comentario' then p_id end);
end;
$$;

-- foto: também aparece para aprovadas quando a dona escreve no fórum
create or replace function public.pode_ver_foto(caminho text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  pasta text := split_part(caminho, '/', 1);
  dona uuid;
begin
  if pasta !~ '^[0-9a-f-]{36}$' then return false; end if;
  dona := pasta::uuid;
  if dona = auth.uid() or public.is_curadora() then return true; end if;
  if not public.eu_aprovada() then return false; end if;
  if not exists (select 1 from public.profiles p where p.id = dona and p.status = 'aprovado') then return false; end if;
  return public.pode_ver_perfil(dona)
      or exists (select 1 from public.forum_posts f where f.autora_id = dona and not f.oculto)
      or exists (select 1 from public.forum_comentarios c where c.autora_id = dona and not c.oculto);
end;
$$;

revoke execute on function public.forum_feed(text, int) from public, anon;
revoke execute on function public.forum_comentarios_de(uuid) from public, anon;
revoke execute on function public.denunciar_conteudo(text, uuid, text) from public, anon;
revoke execute on function public.forum_protege() from public, anon, authenticated;
grant execute on function public.forum_feed(text, int) to authenticated;
grant execute on function public.forum_comentarios_de(uuid) to authenticated;
grant execute on function public.denunciar_conteudo(text, uuid, text) to authenticated;
grant execute on all functions in schema public to service_role;
