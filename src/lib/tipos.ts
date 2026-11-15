export type OndeEsta = 'estudando' | 'primeira_vaga' | 'ate_2_anos'
export type FormaConexao = 'chamada' | 'mensagem' | 'encontro'
export type StatusPerfil = 'pendente' | 'aprovado' | 'reprovado' | 'pausado'

export type Perfil = {
  id: string
  codigo: string
  apelido: string
  foto_path: string | null
  de_onde_vem: string
  onde_esta: OndeEsta
  areas: string[]
  formas_conexao: FormaConexao[]
  status: StatusPerfil
  resumo: string | null
  aprovado_em: string | null
  created_at: string
}

export type Contato = { profile_id: string; email: string; linkedin_url: string | null }

export type Consentimento = {
  profile_id: string
  autodeclaracao: boolean
  aceita_ser_recomendada: boolean
  entende_contato_pos_aceite: boolean
  sabe_que_pode_apagar: boolean
  aceita_termo_conduta: boolean
  aceito_em: string
}

export type Conexao = {
  id: string
  de_profile_id: string
  para_profile_id: string
  status: 'pendente' | 'aceita' | 'recusada'
  created_at: string
  respondido_em: string | null
}

export type Programa = {
  id: string
  nome: string
  organizacao: string | null
  descricao_curta: string | null
  url: string | null
  tipo: 'curso' | 'programa' | 'comunidade'
  area: string | null
  gratuito: boolean | null
  origem: 'curadoria' | 'sugestao'
  ativo: boolean
  created_at: string
}

export type Feedback = {
  id: string
  tipo: 'avaliacao' | 'indicacao' | 'problema'
  nota_facilidade: number | null
  encontrou_aliadas: 'sim' | 'em_parte' | 'nao' | null
  mais_dificil: string | null
  mudaria: string | null
  indicacao_nome: string | null
  indicacao_link: string | null
  indicacao_motivo: string | null
  indicacao_gratuito: 'sim' | 'nao' | 'nao_sei' | null
  problema_descricao: string | null
  problema_pagina: string | null
  email: string | null
  categoria_ia: string | null
  urgencia_ia: string | null
  resumo_ia: string | null
  rascunho_ia: string | null
  alertas_ia: string | null
  resposta_aprovada: string | null
  status: 'novo' | 'em_analise' | 'aprovado' | 'respondido' | 'descartado'
  program_id: string | null
  created_at: string
}

export const ROTULO_ONDE_ESTA: Record<OndeEsta, string> = {
  estudando: 'estou estudando',
  primeira_vaga: 'buscando a primeira vaga',
  ate_2_anos: 'trabalho na área há até 2 anos',
}

export const ROTULO_FORMA: Record<FormaConexao, string> = {
  chamada: 'chamada de vídeo',
  mensagem: 'mensagem',
  encontro: 'encontro presencial',
}

export const formasTexto = (f: FormaConexao[]) => f.map((x) => ROTULO_FORMA[x]).join(', ')

// sugestões de áreas; quem quiser pode escrever outra
export const AREAS = [
  'inteligência artificial',
  'dados',
  'desenvolvimento front-end',
  'desenvolvimento back-end',
  'desenvolvimento mobile',
  'ux design',
  'produto',
  'qualidade de software',
  'infraestrutura e nuvem',
  'segurança da informação',
] as const

export const PAGINAS_DO_SITE = [
  'home',
  'entrar',
  'cadastro',
  'minhas aliadas',
  'conexões',
  'minha conta',
  'feedback',
  'outra',
] as const
