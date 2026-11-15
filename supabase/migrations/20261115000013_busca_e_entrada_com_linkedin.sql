-- =====================================================================
-- aliadas · 013 · busca de aliadas e entrada automática com LinkedIn
--
-- 1. Busca: perfis APROVADOS que aceitaram aparecer (consents.
--    aceita_ser_recomendada) podem ser encontrados por outras aprovadas.
--    Aparecem apelido, foto e trajetória. O contato continua só depois
--    do aceite das duas.
-- 2. Conexão: pode ser pedida a quem foi recomendada OU a quem aparece
--    na busca. Limite: 10 pedidos por pessoa a cada 24 h.
-- 3. Entrada com LinkedIn: perfil pendente que informa o LinkedIn é
--    aprovado na hora (e a busca de aliadas dispara sozinha). Sem
--    LinkedIn, continua com a curadoria. A curadoria pode reprovar ou
--    pausar depois, e as denúncias continuam valendo.
-- =====================================================================

-- quem aceitou aparecer para outras mulheres?
create or replace function public.aparece_na_busca(alvo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.consents c on c.profile_id = p.id
    where p.id = alvo and p.status = 'aprovado' and c.aceita_ser_recomendada
  );
$$;

-- posso ver o perfil? agora também quando ela aparece na busca e eu estou aprovada
create or replace function public.pode_ver_perfil(alvo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    alvo = auth.uid()
    or public.is_curadora()
    or (public.eu_aprovada() and public.aparece_na_busca(alvo))
    or exists (
      select 1 from public.profiles p
      where p.id = alvo
        and (
          (p.status = 'aprovado' and exists (
            select 1 from public.recommendations r
            where r.para_profile_id = auth.uid() and r.aliada_profile_id = alvo))
          or
          (p.status in ('aprovado', 'pausado') and exists (
            select 1 from public.connections c
            where (c.de_profile_id = auth.uid() and c.para_profile_id = alvo)
               or (c.para_profile_id = auth.uid() and c.de_profile_id = alvo)))
        )
    );
$$;

-- busca: devolve só o necessário para o cartão (nunca contato)
create or replace function public.buscar_aliadas(
  p_texto text default '', p_area text default '', p_onde text default '', p_limite int default 40
) returns table (
  id uuid, apelido text, foto_path text, de_onde_vem text, onde_esta text,
  areas text[], formas_conexao text[], resumo text
) language plpgsql stable security definer set search_path = '' as $$
declare
  termo text := '%' || lower(btrim(coalesce(p_texto, ''))) || '%';
begin
  if not public.eu_aprovada() then
    raise exception 'a busca abre quando seu perfil estiver aprovado';
  end if;
  return query
    select p.id, p.apelido, p.foto_path, p.de_onde_vem, p.onde_esta, p.areas, p.formas_conexao, p.resumo
      from public.profiles p
      join public.consents c on c.profile_id = p.id
     where p.status = 'aprovado' and c.aceita_ser_recomendada and p.id <> auth.uid()
       and (coalesce(btrim(p_texto), '') = ''
            or lower(p.apelido) like termo
            or lower(p.de_onde_vem) like termo
            or exists (select 1 from unnest(p.areas) a where lower(a) like termo))
       and (coalesce(p_area, '') = '' or exists (select 1 from unnest(p.areas) a where lower(a) = lower(p_area)))
       and (coalesce(p_onde, '') = '' or p.onde_esta = p_onde)
     order by p.aprovado_em desc nulls last
     limit least(greatest(p_limite, 1), 60);
end;
$$;

-- pedir conexão: recomendada OU encontrada na busca; até 10 pedidos por dia
create or replace function public.pedir_conexao(p_aliada uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
  existente public.connections;
  novo_id uuid;
begin
  if eu is null then raise exception 'entre com seu e-mail primeiro'; end if;
  if not exists (select 1 from public.profiles where id = eu and status = 'aprovado') then
    raise exception 'seu perfil precisa estar aprovado para se conectar';
  end if;
  if p_aliada = eu then raise exception 'não dá para se conectar consigo mesma'; end if;
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

  insert into public.connections (de_profile_id, para_profile_id)
  values (eu, p_aliada) returning id into novo_id;
  return novo_id;
end;
$$;

-- entrada automática: perfil pendente com LinkedIn é aprovado na hora
create or replace function public.aprova_com_linkedin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.linkedin_url is not null and btrim(new.linkedin_url) <> '' then
    update public.profiles set status = 'aprovado'
     where id = new.profile_id and status = 'pendente';
  end if;
  return new;
end;
$$;
revoke execute on function public.aprova_com_linkedin() from public, anon, authenticated;

create trigger contacts_aprova_com_linkedin
  after insert or update of linkedin_url on public.contacts
  for each row execute function public.aprova_com_linkedin();

revoke execute on function public.aparece_na_busca(uuid) from public, anon;
revoke execute on function public.buscar_aliadas(text, text, text, int) from public, anon;
grant execute on function public.aparece_na_busca(uuid) to authenticated;
grant execute on function public.buscar_aliadas(text, text, text, int) to authenticated;
grant execute on all functions in schema public to service_role;
