-- =====================================================================
-- aliadas · 014 · mensagem de apresentação e mural de conquistas
-- - o pedido de conexão pode levar uma mensagem curta (até 600
--   caracteres), visível só para as duas pessoas da conexão
-- - posts do fórum podem ser marcados como "conquista" e ganham uma
--   aba própria no feed
-- =====================================================================

alter table public.connections
  add column mensagem text check (mensagem is null or char_length(btrim(mensagem)) between 1 and 600);

drop function if exists public.pedir_conexao(uuid);
create or replace function public.pedir_conexao(p_aliada uuid, p_mensagem text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
  existente public.connections;
  novo_id uuid;
  msg text := nullif(btrim(coalesce(p_mensagem, '')), '');
begin
  if eu is null then raise exception 'entre com seu e-mail primeiro'; end if;
  if not exists (select 1 from public.profiles where id = eu and status = 'aprovado') then
    raise exception 'seu perfil precisa estar aprovado para se conectar';
  end if;
  if p_aliada = eu then raise exception 'não dá para se conectar consigo mesma'; end if;
  if msg is not null and char_length(msg) > 600 then
    raise exception 'a mensagem pode ter até 600 caracteres';
  end if;
  if not exists (select 1 from public.recommendations
                 where para_profile_id = eu and aliada_profile_id = p_aliada)
     and not public.aparece_na_busca(p_aliada) then
    raise exception 'esta pessoa não está disponível para conexões agora';
  end if;
  if not exists (select 1 from public.profiles where id = p_aliada and status = 'aprovado') then
    raise exception 'esta aliada não está disponível agora';
  end if;

  select * into existente from public.connections
   where least(de_profile_id, para_profile_id) = least(eu, p_aliada)
     and greatest(de_profile_id, para_profile_id) = greatest(eu, p_aliada);

  if found then
    if existente.para_profile_id = eu and existente.status = 'pendente' then
      update public.connections set status = 'aceita', respondido_em = now() where id = existente.id;
    end if;
    return existente.id;
  end if;

  if (select count(*) from public.connections
       where de_profile_id = eu and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'você já enviou 10 pedidos hoje. amanhã dá para pedir mais.';
  end if;

  insert into public.connections (de_profile_id, para_profile_id, mensagem)
  values (eu, p_aliada, msg) returning id into novo_id;
  return novo_id;
end;
$$;
revoke execute on function public.pedir_conexao(uuid, text) from public, anon;
grant execute on function public.pedir_conexao(uuid, text) to authenticated, service_role;

-- mural de conquistas
alter table public.forum_posts add column conquista boolean not null default false;
grant insert (conquista) on public.forum_posts to authenticated;
grant update (conquista) on public.forum_posts to authenticated;

drop function if exists public.forum_feed(text, int);
create or replace function public.forum_feed(p_ordem text default 'recentes', p_limite int default 50)
returns table (
  id uuid, texto text, area text, created_at timestamptz, oculto boolean, conquista boolean,
  autora_id uuid, autora_apelido text, autora_foto_path text,
  curtidas bigint, comentarios bigint, curti boolean, minha boolean
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.eu_aprovada() or public.is_curadora()) then
    raise exception 'o fórum é para perfis aprovados';
  end if;
  return query
    select p.id, p.texto, p.area, p.created_at, p.oculto, p.conquista,
           p.autora_id, pr.apelido, pr.foto_path,
           (select count(*) from public.forum_curtidas c where c.post_id = p.id),
           (select count(*) from public.forum_comentarios m where m.post_id = p.id and not m.oculto),
           exists (select 1 from public.forum_curtidas c where c.post_id = p.id and c.profile_id = auth.uid()),
           p.autora_id = auth.uid()
      from public.forum_posts p
      join public.profiles pr on pr.id = p.autora_id
     where (not p.oculto or p.autora_id = auth.uid() or public.is_curadora())
       and (p_ordem <> 'conquistas' or p.conquista)
     order by
       case when p_ordem = 'evidencia'
            then (select count(*) from public.forum_curtidas c where c.post_id = p.id) end desc nulls last,
       p.created_at desc
     limit least(greatest(p_limite, 1), 100);
end;
$$;
revoke execute on function public.forum_feed(text, int) from public, anon;
grant execute on function public.forum_feed(text, int) to authenticated, service_role;
