-- =====================================================================
-- aliadas · 002 · funções auxiliares, gatilhos, RLS e permissões
-- Explicação de cada política em português simples: docs/SEGURANCA.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- funções auxiliares (security definer = leem tabelas sem cair em
-- recursão de RLS; search_path vazio = ninguém sequestra nomes)
-- ---------------------------------------------------------------------
create or replace function public.is_curadora()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.roles r where r.user_id = auth.uid() and r.role = 'curadora'
  );
$$;

create or replace function public.eu_aprovada()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'aprovado'
  );
$$;

-- a conexão entre mim e "alvo" foi aceita pelas duas?
create or replace function public.conexao_aceita_com(alvo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'aceita'
      and ((c.de_profile_id = auth.uid() and c.para_profile_id = alvo)
        or (c.para_profile_id = auth.uid() and c.de_profile_id = alvo))
  );
$$;

-- posso ver o perfil de "alvo"? (a dona, a curadoria, ou quem tem
-- motivo concreto: recomendação ou pedido de conexão)
create or replace function public.pode_ver_perfil(alvo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    alvo = auth.uid()
    or public.is_curadora()
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

-- foto: dona, curadoria, ou usuária APROVADA que pode ver um perfil APROVADO
create or replace function public.pode_ver_foto(caminho text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  pasta text := split_part(caminho, '/', 1);
  dona uuid;
begin
  if pasta !~ '^[0-9a-f-]{36}$' then return false; end if;
  dona := pasta::uuid;
  if dona = auth.uid() or public.is_curadora() then return true; end if;
  return public.eu_aprovada()
     and exists (select 1 from public.profiles p where p.id = dona and p.status = 'aprovado')
     and public.pode_ver_perfil(dona);
end;
$$;

-- ---------------------------------------------------------------------
-- gatilho: protege campos sensíveis do perfil
-- (security invoker de propósito: current_user diz quem está chamando)
-- ---------------------------------------------------------------------
create or replace function public.profiles_protege_campos()
returns trigger language plpgsql set search_path = '' as $$
declare
  chamada_do_app boolean := current_user in ('authenticated', 'anon');
  curadora boolean := public.is_curadora();
begin
  new.updated_at := now();

  if chamada_do_app then
    -- curadora mexendo no perfil de outra pessoa: só pode mudar o status
    if curadora and old.id is distinct from auth.uid() then
      if (to_jsonb(new) - 'status' - 'updated_at' - 'aprovado_em')
         is distinct from (to_jsonb(old) - 'status' - 'updated_at' - 'aprovado_em') then
        raise exception 'a curadoria só altera o status de outros perfis';
      end if;
    end if;

    -- a dona só pode pausar e despausar (nunca se autoaprovar)
    if new.status is distinct from old.status and not (curadora and old.id is distinct from auth.uid()) then
      if not (
        (old.status = 'aprovado' and new.status = 'pausado')
        or (old.status = 'pausado' and new.status = 'aprovado' and old.aprovado_em is not null)
      ) then
        raise exception 'mudança de status não permitida';
      end if;
    end if;
  end if;

  if new.status = 'aprovado' and old.aprovado_em is null then
    new.aprovado_em := now();
  end if;

  return new;
end;
$$;

create trigger profiles_protege_campos
  before update on public.profiles
  for each row execute function public.profiles_protege_campos();

create or replace function public.toca_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.toca_updated_at();

-- ao excluir a conta, o registro da IA fica (contagem de uso para o
-- edital), mas sem o conteúdo gerado sobre ela
create or replace function public.anonimiza_ai_runs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.ai_runs
     set output_json = jsonb_build_object('removido', 'conta excluída'),
         input_resumido = '[removido: conta excluída]'
   where profile_id = old.id;
  return old;
end;
$$;
create trigger profiles_anonimiza_ai_runs
  before delete on public.profiles
  for each row execute function public.anonimiza_ai_runs();

-- ---------------------------------------------------------------------
-- funções chamadas pelo app (RPC)
-- ---------------------------------------------------------------------

-- cadastro em uma única transação: perfil + consentimentos + contato.
-- security invoker: roda com as permissões e o RLS da própria usuária.
create or replace function public.salvar_cadastro(perfil jsonb, consentimento jsonb, contato jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  meu_codigo text;
begin
  if auth.uid() is null then raise exception 'entre com seu e-mail primeiro'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'você já tem cadastro';
  end if;

  insert into public.profiles (id, apelido, foto_path, de_onde_vem, onde_esta, area_interesse,
                               objetivo_12_meses, conquista, forma_conexao)
  values (auth.uid(),
          btrim(perfil->>'apelido'),
          nullif(perfil->>'foto_path', ''),
          btrim(perfil->>'de_onde_vem'),
          perfil->>'onde_esta',
          btrim(perfil->>'area_interesse'),
          btrim(perfil->>'objetivo_12_meses'),
          nullif(btrim(coalesce(perfil->>'conquista', '')), ''),
          perfil->>'forma_conexao')
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

-- pedir conexão: só com aliada recomendada para mim, e só se eu estiver aprovada
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
  if not exists (select 1 from public.recommendations
                 where para_profile_id = eu and aliada_profile_id = p_aliada) then
    raise exception 'você só pode se conectar com aliadas recomendadas para você';
  end if;
  if not exists (select 1 from public.profiles where id = p_aliada and status = 'aprovado') then
    raise exception 'esta aliada não está disponível agora';
  end if;

  select * into existente from public.connections
   where least(de_profile_id, para_profile_id) = least(eu, p_aliada)
     and greatest(de_profile_id, para_profile_id) = greatest(eu, p_aliada);

  if found then
    -- ela já tinha me pedido: as duas querem, então a conexão está aceita
    if existente.para_profile_id = eu and existente.status = 'pendente' then
      update public.connections set status = 'aceita', respondido_em = now() where id = existente.id;
    end if;
    return existente.id;
  end if;

  insert into public.connections (de_profile_id, para_profile_id)
  values (eu, p_aliada) returning id into novo_id;
  return novo_id;
end;
$$;

-- responder: só quem RECEBEU o pedido, e só se ainda estiver pendente
create or replace function public.responder_conexao(p_conexao uuid, p_aceitar boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.connections
     set status = case when p_aceitar then 'aceita' else 'recusada' end,
         respondido_em = now()
   where id = p_conexao and para_profile_id = auth.uid() and status = 'pendente';
  if not found then raise exception 'pedido não encontrado ou já respondido'; end if;
end;
$$;

-- quantas gerações de recomendação eu já usei nas últimas 24 h
create or replace function public.minhas_geracoes_hoje()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.ai_runs
   where profile_id = auth.uid() and funcao = 'recomendar'
     and created_at > now() - interval '24 hours';
$$;

-- curadora aprova uma indicação do feedback: vira programa ativo
create or replace function public.aprovar_indicacao(
  p_feedback uuid, p_tipo text, p_area text, p_descricao text, p_resposta text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  f public.feedback;
  novo_programa uuid;
begin
  if not public.is_curadora() then raise exception 'apenas curadoras'; end if;
  select * into f from public.feedback where id = p_feedback for update;
  if not found or f.tipo <> 'indicacao' then raise exception 'indicação não encontrada'; end if;
  if f.status in ('aprovado', 'respondido', 'descartado') then raise exception 'indicação já analisada'; end if;

  insert into public.programs (nome, descricao_curta, url, tipo, area, gratuito, origem, ativo)
  values (f.indicacao_nome,
          nullif(btrim(coalesce(p_descricao, '')), ''),
          f.indicacao_link,
          coalesce(nullif(p_tipo, ''), 'programa'),
          nullif(btrim(coalesce(p_area, '')), ''),
          case f.indicacao_gratuito when 'sim' then true when 'nao' then false else null end,
          'sugestao', true)
  returning id into novo_programa;

  update public.feedback
     set status = 'aprovado',
         program_id = novo_programa,
         resposta_aprovada = nullif(btrim(coalesce(p_resposta, '')), '')
   where id = p_feedback;

  return novo_programa;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS ligado em TODAS as tabelas
-- ---------------------------------------------------------------------
alter table public.roles                   enable row level security;
alter table public.profiles                enable row level security;
alter table public.consents                enable row level security;
alter table public.contacts                enable row level security;
alter table public.programs                enable row level security;
alter table public.ai_runs                 enable row level security;
alter table public.recommendations         enable row level security;
alter table public.program_recommendations enable row level security;
alter table public.connections             enable row level security;
alter table public.feedback                enable row level security;
alter table public.reports                 enable row level security;

-- roles
create policy "roles: vejo o meu papel" on public.roles
  for select to authenticated using (user_id = auth.uid() or public.is_curadora());

-- profiles
create policy "perfis: vejo quando tenho motivo" on public.profiles
  for select to authenticated using (public.pode_ver_perfil(id));
create policy "perfis: crio só o meu" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "perfis: edito o meu; curadora muda status" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_curadora())
  with check (id = auth.uid() or public.is_curadora());

-- consents
create policy "consentimentos: dona e curadoria veem" on public.consents
  for select to authenticated using (profile_id = auth.uid() or public.is_curadora());
create policy "consentimentos: registro os meus" on public.consents
  for insert to authenticated with check (profile_id = auth.uid());
create policy "consentimentos: mudo o meu" on public.consents
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- contacts
create policy "contatos: dona, curadoria ou conexão aceita" on public.contacts
  for select to authenticated
  using (profile_id = auth.uid() or public.is_curadora() or public.conexao_aceita_com(profile_id));
create policy "contatos: crio o meu" on public.contacts
  for insert to authenticated with check (profile_id = auth.uid());
create policy "contatos: edito o meu" on public.contacts
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- programs
create policy "programas: todo mundo vê os ativos" on public.programs
  for select to anon, authenticated using (ativo or public.is_curadora());
create policy "programas: curadora cadastra" on public.programs
  for insert to authenticated with check (public.is_curadora());
create policy "programas: curadora edita" on public.programs
  for update to authenticated using (public.is_curadora()) with check (public.is_curadora());
create policy "programas: curadora apaga" on public.programs
  for delete to authenticated using (public.is_curadora());

-- ai_runs (só leitura, só curadoria; quem grava é a Edge Function)
create policy "ia: curadoria lê o registro" on public.ai_runs
  for select to authenticated using (public.is_curadora());

-- recommendations / program_recommendations (gravadas só pela Edge Function)
create policy "recomendações: vejo as minhas" on public.recommendations
  for select to authenticated using (para_profile_id = auth.uid() or public.is_curadora());
create policy "programas recomendados: vejo os meus" on public.program_recommendations
  for select to authenticated using (para_profile_id = auth.uid() or public.is_curadora());

-- connections (criar e responder só pelas funções pedir_conexao / responder_conexao)
create policy "conexões: vejo as que me envolvem" on public.connections
  for select to authenticated
  using (de_profile_id = auth.uid() or para_profile_id = auth.uid() or public.is_curadora());
-- quem pediu e foi recusada não pode apagar para pedir de novo (evita insistência)
create policy "conexões: desfaço as que me envolvem" on public.connections
  for delete to authenticated
  using ((de_profile_id = auth.uid() and status <> 'recusada') or para_profile_id = auth.uid());

-- feedback
create policy "feedback: qualquer pessoa envia" on public.feedback
  for insert to anon, authenticated with check (status = 'novo');
create policy "feedback: curadoria lê" on public.feedback
  for select to authenticated using (public.is_curadora());
create policy "feedback: curadoria responde" on public.feedback
  for update to authenticated using (public.is_curadora()) with check (public.is_curadora());

-- reports
create policy "denúncias: denuncio quem eu vejo" on public.reports
  for insert to authenticated
  with check (denunciante_id = auth.uid() and denunciado_id <> auth.uid() and public.pode_ver_perfil(denunciado_id));
create policy "denúncias: curadoria lê" on public.reports
  for select to authenticated using (public.is_curadora());
create policy "denúncias: curadoria atualiza" on public.reports
  for update to authenticated using (public.is_curadora()) with check (public.is_curadora());

-- ---------------------------------------------------------------------
-- permissões por coluna (menor privilégio, mesmo antes do RLS)
-- O Supabase dá "all" para anon/authenticated por padrão: tiramos tudo
-- e devolvemos só o necessário.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.roles to authenticated;

grant select on public.profiles to authenticated;
grant insert (id, apelido, foto_path, de_onde_vem, onde_esta, area_interesse,
              objetivo_12_meses, conquista, forma_conexao) on public.profiles to authenticated;
grant update (apelido, foto_path, de_onde_vem, onde_esta, area_interesse,
              objetivo_12_meses, conquista, forma_conexao, status) on public.profiles to authenticated;
grant usage on sequence public.profile_codigo_seq to authenticated;

grant select on public.consents to authenticated;
grant insert (profile_id, autodeclaracao, aceita_ser_recomendada, entende_contato_pos_aceite,
              sabe_que_pode_apagar, aceita_termo_conduta) on public.consents to authenticated;
grant update (aceita_ser_recomendada) on public.consents to authenticated;

grant select on public.contacts to authenticated;
grant insert (profile_id, email, linkedin_url) on public.contacts to authenticated;
grant update (email, linkedin_url) on public.contacts to authenticated;

grant select on public.programs to anon, authenticated;
grant insert, update, delete on public.programs to authenticated;

grant select on public.ai_runs to authenticated;
grant select on public.recommendations to authenticated;
grant select on public.program_recommendations to authenticated;

grant select, delete on public.connections to authenticated;

grant insert (tipo, nota_facilidade, encontrou_aliadas, mais_dificil, mudaria,
              indicacao_nome, indicacao_link, indicacao_motivo, indicacao_gratuito,
              problema_descricao, problema_pagina, email) on public.feedback to anon, authenticated;
grant select on public.feedback to authenticated;
grant update (rascunho_ia, resposta_aprovada, status) on public.feedback to authenticated;

grant insert (denunciante_id, denunciado_id, motivo) on public.reports to authenticated;
grant select on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

-- funções: ninguém executa por padrão; liberamos uma a uma
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_curadora()                    to anon, authenticated;
grant execute on function public.eu_aprovada()                    to authenticated;
grant execute on function public.conexao_aceita_com(uuid)         to authenticated;
grant execute on function public.pode_ver_perfil(uuid)            to authenticated;
grant execute on function public.pode_ver_foto(text)              to authenticated;
grant execute on function public.salvar_cadastro(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.pedir_conexao(uuid)              to authenticated;
grant execute on function public.responder_conexao(uuid, boolean) to authenticated;
grant execute on function public.minhas_geracoes_hoje()           to authenticated;
grant execute on function public.aprovar_indicacao(uuid, text, text, text, text) to authenticated;
-- funções de gatilho rodam sozinhas; não precisam de grant
