-- =====================================================================
-- aliadas · 008 · cadastro mais curto e com múltipla escolha
-- - áreas de interesse e formas de conexão viram listas (várias opções)
-- - saem "objetivo em 12 meses" e "conquista"
-- =====================================================================

alter table public.profiles
  add column areas text[] not null default '{}',
  add column formas_conexao text[] not null default '{}';

update public.profiles
   set areas = array[area_interesse],
       formas_conexao = array[forma_conexao];

alter table public.profiles
  drop column area_interesse,
  drop column forma_conexao,
  drop column objetivo_12_meses,
  drop column conquista;

-- até 8 áreas, cada uma com até 60 caracteres ("outra" é texto livre)
create or replace function public.areas_validas(a text[])
returns boolean language sql immutable set search_path = '' as $$
  select cardinality(a) between 1 and 8
     and not exists (select 1 from unnest(a) x where char_length(btrim(x)) not between 2 and 60);
$$;

alter table public.profiles
  add constraint areas_validas check (public.areas_validas(areas)),
  add constraint formas_validas check (
    cardinality(formas_conexao) between 1 and 3
    and formas_conexao <@ array['chamada', 'mensagem', 'encontro']
  );

-- permissões por coluna para as colunas novas
grant insert (areas, formas_conexao) on public.profiles to authenticated;
grant update (areas, formas_conexao) on public.profiles to authenticated;
grant execute on function public.areas_validas(text[]) to authenticated, service_role;

-- cadastro em uma transação, com as listas
create or replace function public.salvar_cadastro(perfil jsonb, consentimento jsonb, contato jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  meu_codigo text;
begin
  if auth.uid() is null then raise exception 'entre com seu e-mail primeiro'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'você já tem cadastro';
  end if;

  insert into public.profiles (id, apelido, foto_path, de_onde_vem, onde_esta, areas, formas_conexao)
  values (auth.uid(),
          btrim(perfil->>'apelido'),
          nullif(perfil->>'foto_path', ''),
          btrim(perfil->>'de_onde_vem'),
          perfil->>'onde_esta',
          array(select distinct btrim(x) from jsonb_array_elements_text(coalesce(perfil->'areas', '[]')) x
                where btrim(x) <> ''),
          array(select distinct x from jsonb_array_elements_text(coalesce(perfil->'formas_conexao', '[]')) x))
  returning codigo into meu_codigo;

  insert into public.consents (profile_id, autodeclaracao, aceita_ser_recomendada,
                               entende_contato_pos_aceite, sabe_que_pode_apagar, aceita_termo_conduta)
  values (auth.uid(),
          coalesce((consentimento->>'autodeclaracao')::boolean, false),
          coalesce((consentimento->>'aceita_ser_recomendada')::boolean, false),
          coalesce((consentimento->>'entende_contato_pos_aceite')::boolean, false),
          coalesce((consentimento->>'sabe_que_pode_apagar')::boolean, false),
          coalesce((consentimento->>'aceita_termo_conduta')::boolean, false));

  insert into public.contacts (profile_id, email, linkedin_url)
  values (auth.uid(), btrim(contato->>'email'), nullif(btrim(coalesce(contato->>'linkedin_url', '')), ''));

  return meu_codigo;
end;
$$;
