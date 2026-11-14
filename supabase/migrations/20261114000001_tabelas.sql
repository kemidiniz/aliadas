-- =====================================================================
-- aliadas · 001 · tabelas
-- Regras de tamanho e valores permitidos ficam no próprio banco (check),
-- então nenhuma tela consegue gravar dado fora do formato.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- papéis (curadora)
-- ---------------------------------------------------------------------
create table public.roles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('curadora')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------------------------------------------------------------------
-- perfis
-- ---------------------------------------------------------------------
create sequence public.profile_codigo_seq;

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  codigo            text not null unique
                      default ('P' || lpad(nextval('public.profile_codigo_seq')::text, 3, '0')),
  apelido           text not null check (char_length(btrim(apelido)) between 2 and 40),
  foto_path         text check (foto_path is null or char_length(foto_path) <= 200),
  de_onde_vem       text not null check (char_length(btrim(de_onde_vem)) between 3 and 400),
  onde_esta         text not null check (onde_esta in ('estudando', 'primeira_vaga', 'ate_2_anos')),
  area_interesse    text not null check (char_length(btrim(area_interesse)) between 2 and 80),
  objetivo_12_meses text not null check (char_length(btrim(objetivo_12_meses)) between 3 and 400),
  conquista         text check (conquista is null or char_length(conquista) <= 400),
  forma_conexao     text not null check (forma_conexao in ('chamada', 'mensagem', 'encontro')),
  status            text not null default 'pendente'
                      check (status in ('pendente', 'aprovado', 'reprovado', 'pausado')),
  resumo            text check (resumo is null or char_length(resumo) <= 600), -- escrito pela IA
  aprovado_em       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- a foto só pode estar na pasta da própria dona
  constraint foto_na_pasta_da_dona check (foto_path is null or foto_path like (id::text || '/%'))
);

-- ---------------------------------------------------------------------
-- consentimentos (nenhuma caixa vem marcada: o padrão é false)
-- ---------------------------------------------------------------------
create table public.consents (
  profile_id                 uuid primary key references public.profiles(id) on delete cascade,
  autodeclaracao             boolean not null default false,
  aceita_ser_recomendada     boolean not null default false,
  entende_contato_pos_aceite boolean not null default false,
  sabe_que_pode_apagar       boolean not null default false,
  aceita_termo_conduta       boolean not null default false,
  aceito_em                  timestamptz not null default now(),
  -- sem estes não existe cadastro. "aceita_ser_recomendada" é livre.
  constraint consentimentos_obrigatorios check (
    autodeclaracao and entende_contato_pos_aceite and sabe_que_pode_apagar and aceita_termo_conduta
  )
);

-- ---------------------------------------------------------------------
-- contatos: tabela separada, nunca junto do perfil
-- ---------------------------------------------------------------------
create table public.contacts (
  profile_id   uuid primary key references public.profiles(id) on delete cascade,
  email        text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  linkedin_url text check (
    linkedin_url is null or (
      char_length(linkedin_url) <= 200
      and linkedin_url ~* '^https://([a-z]{2,3}\.)?linkedin\.com/'
    )
  ),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- programas, cursos e comunidades
-- ---------------------------------------------------------------------
create table public.programs (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null check (char_length(btrim(nome)) between 2 and 120),
  organizacao     text check (organizacao is null or char_length(organizacao) <= 120),
  descricao_curta text check (descricao_curta is null or char_length(descricao_curta) <= 300),
  url             text check (url is null or (char_length(url) <= 300 and url ~* '^https://')),
  tipo            text not null default 'curso' check (tipo in ('curso', 'programa', 'comunidade')),
  area            text check (area is null or char_length(area) <= 80),
  gratuito        boolean,
  origem          text not null default 'curadoria' check (origem in ('curadoria', 'sugestao')),
  ativo           boolean not null default false,
  created_at      timestamptz not null default now(),
  -- programa ativo precisa de link para a pessoa abrir
  constraint ativo_precisa_de_url check (not ativo or url is not null)
);

-- ---------------------------------------------------------------------
-- execuções da IA (registro para o edital; sem dados pessoais)
-- ---------------------------------------------------------------------
create table public.ai_runs (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid references public.profiles(id) on delete set null,
  funcao         text not null check (char_length(funcao) <= 40),
  origem         text check (origem in ('aprovacao', 'manual')),
  input_resumido text check (input_resumido is null or char_length(input_resumido) <= 2000),
  output_json    jsonb,
  modelo         text,
  tokens_entrada integer,
  tokens_saida   integer,
  sucesso        boolean not null default false,
  erro           text check (erro is null or char_length(erro) <= 1000),
  created_at     timestamptz not null default now()
);
create index ai_runs_profile_dia on public.ai_runs (profile_id, funcao, created_at desc);

-- ---------------------------------------------------------------------
-- recomendações de aliadas e de programas
-- ---------------------------------------------------------------------
create table public.recommendations (
  id                uuid primary key default gen_random_uuid(),
  para_profile_id   uuid not null references public.profiles(id) on delete cascade,
  aliada_profile_id uuid not null references public.profiles(id) on delete cascade,
  motivo            text not null check (char_length(motivo) <= 400),
  ai_run_id         uuid references public.ai_runs(id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint nao_recomenda_a_si_mesma check (para_profile_id <> aliada_profile_id),
  unique (para_profile_id, aliada_profile_id)
);

create table public.program_recommendations (
  id              uuid primary key default gen_random_uuid(),
  para_profile_id uuid not null references public.profiles(id) on delete cascade,
  program_id      uuid not null references public.programs(id) on delete cascade,
  motivo          text not null check (char_length(motivo) <= 400),
  ai_run_id       uuid references public.ai_runs(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (para_profile_id, program_id)
);

-- ---------------------------------------------------------------------
-- conexões
-- ---------------------------------------------------------------------
create table public.connections (
  id              uuid primary key default gen_random_uuid(),
  de_profile_id   uuid not null references public.profiles(id) on delete cascade,
  para_profile_id uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada')),
  created_at      timestamptz not null default now(),
  respondido_em   timestamptz,
  constraint nao_conecta_consigo check (de_profile_id <> para_profile_id)
);
-- um único pedido por dupla, em qualquer direção
create unique index connections_par_unico on public.connections (
  least(de_profile_id, para_profile_id), greatest(de_profile_id, para_profile_id)
);

-- ---------------------------------------------------------------------
-- feedback e sugestões
-- ---------------------------------------------------------------------
create table public.feedback (
  id                 uuid primary key default gen_random_uuid(),
  tipo               text not null check (tipo in ('avaliacao', 'indicacao', 'problema')),
  -- avaliação
  nota_facilidade    smallint check (nota_facilidade between 1 and 5),
  encontrou_aliadas  text check (encontrou_aliadas in ('sim', 'em_parte', 'nao')),
  mais_dificil       text check (char_length(mais_dificil) <= 500),
  mudaria            text check (char_length(mudaria) <= 500),
  -- indicação
  indicacao_nome     text check (char_length(indicacao_nome) <= 120),
  indicacao_link     text check (char_length(indicacao_link) <= 300 and indicacao_link ~* '^https://[^\s]+\.[^\s]+'),
  indicacao_motivo   text check (char_length(indicacao_motivo) <= 500),
  indicacao_gratuito text check (indicacao_gratuito in ('sim', 'nao', 'nao_sei')),
  -- problema
  problema_descricao text check (char_length(problema_descricao) <= 1000),
  problema_pagina    text check (char_length(problema_pagina) <= 60),
  -- comum
  email              text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  -- preenchidos pela automação externa (service role)
  categoria_ia       text check (char_length(categoria_ia) <= 80),
  urgencia_ia        text check (char_length(urgencia_ia) <= 40),
  resumo_ia          text check (char_length(resumo_ia) <= 1000),
  rascunho_ia        text check (char_length(rascunho_ia) <= 4000),
  alertas_ia         text check (char_length(alertas_ia) <= 1000),
  -- curadoria
  resposta_aprovada  text check (char_length(resposta_aprovada) <= 4000),
  status             text not null default 'novo'
                       check (status in ('novo', 'em_analise', 'aprovado', 'respondido', 'descartado')),
  program_id         uuid references public.programs(id) on delete set null,
  created_at         timestamptz not null default now(),
  -- campos obrigatórios de cada caminho
  constraint feedback_campos_por_tipo check (
    (tipo = 'avaliacao' and nota_facilidade is not null and encontrou_aliadas is not null and mais_dificil is not null)
    or (tipo = 'indicacao' and indicacao_nome is not null and indicacao_link is not null
        and indicacao_motivo is not null and indicacao_gratuito is not null)
    or (tipo = 'problema' and problema_descricao is not null and problema_pagina is not null)
  )
);

-- ---------------------------------------------------------------------
-- denúncias
-- ---------------------------------------------------------------------
create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  denunciante_id uuid references public.profiles(id) on delete set null,
  denunciado_id  uuid not null references public.profiles(id) on delete cascade,
  motivo         text not null check (char_length(btrim(motivo)) between 5 and 800),
  status         text not null default 'aberta' check (status in ('aberta', 'em_analise', 'resolvida', 'descartada')),
  created_at     timestamptz not null default now(),
  constraint nao_denuncia_a_si check (denunciante_id is null or denunciante_id <> denunciado_id)
);

-- ---------------------------------------------------------------------
-- exemplos de programa: NÃO são reais. A curadoria preenche e ativa.
-- ---------------------------------------------------------------------
insert into public.programs (nome, organizacao, descricao_curta, url, tipo, area, gratuito, origem, ativo) values
  ('PREENCHER', 'PREENCHER', 'PREENCHER', null, 'curso',      null, null, 'curadoria', false),
  ('PREENCHER', 'PREENCHER', 'PREENCHER', null, 'programa',   null, null, 'curadoria', false),
  ('PREENCHER', 'PREENCHER', 'PREENCHER', null, 'comunidade', null, null, 'curadoria', false);
