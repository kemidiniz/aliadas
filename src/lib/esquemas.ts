import { z } from 'zod'

// Mesmos limites do banco: a tela avisa antes, o banco garante.
const texto = (min: number, max: number, msg: string) =>
  z.string().trim().min(min, msg).max(max, `até ${max} caracteres`)

export const LIMITES = {
  apelido: 40,
  de_onde_vem: 400,
  area_interesse: 80,
  objetivo_12_meses: 400,
  conquista: 400,
  feedbackCurto: 500,
  problema: 1000,
  denuncia: 800,
} as const

export const emailSchema = z.string().trim().max(254).email('confira o e-mail')

export const linkedinSchema = z
  .string()
  .trim()
  .max(200, 'link muito longo')
  .regex(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+/i, 'cole o link do seu perfil, começando com https://www.linkedin.com/')

export const perfilSchema = z.object({
  apelido: texto(2, LIMITES.apelido, 'escreva pelo menos 2 letras'),
  de_onde_vem: texto(3, LIMITES.de_onde_vem, 'conta um pouquinho'),
  onde_esta: z.enum(['estudando', 'primeira_vaga', 'ate_2_anos'], { message: 'escolha uma opção' }),
  area_interesse: texto(2, LIMITES.area_interesse, 'qual área?'),
  objetivo_12_meses: texto(3, LIMITES.objetivo_12_meses, 'conta aonde quer chegar'),
  conquista: z.string().trim().max(LIMITES.conquista, `até ${LIMITES.conquista} caracteres`).optional(),
  forma_conexao: z.enum(['chamada', 'mensagem', 'encontro'], { message: 'escolha uma opção' }),
})

export const urlHttps = z
  .string()
  .trim()
  .max(300, 'link muito longo')
  .url('cole um link válido')
  .refine((v) => v.startsWith('https://'), 'o link precisa começar com https://')

const emailOpcional = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === '' || z.string().email().safeParse(v).success, 'confira o e-mail')

export const feedbackAvaliacao = z.object({
  tipo: z.literal('avaliacao'),
  nota_facilidade: z.number({ message: 'escolha uma nota' }).int().min(1).max(5),
  encontrou_aliadas: z.enum(['sim', 'em_parte', 'nao'], { message: 'escolha uma opção' }),
  mais_dificil: texto(1, LIMITES.feedbackCurto, 'conta pra gente'),
  mudaria: z.string().trim().max(LIMITES.feedbackCurto),
  email: emailOpcional,
})

export const feedbackIndicacao = z.object({
  tipo: z.literal('indicacao'),
  indicacao_nome: texto(2, 120, 'qual o nome?'),
  indicacao_link: urlHttps,
  indicacao_motivo: texto(1, LIMITES.feedbackCurto, 'por que você indica?'),
  indicacao_gratuito: z.enum(['sim', 'nao', 'nao_sei'], { message: 'escolha uma opção' }),
  email: emailOpcional,
})

export const feedbackProblema = z.object({
  tipo: z.literal('problema'),
  problema_descricao: texto(3, LIMITES.problema, 'conta o que aconteceu'),
  problema_pagina: z.string().min(1, 'escolha a página'),
  email: emailOpcional,
})

export const programaSchema = z.object({
  nome: texto(2, 120, 'nome obrigatório'),
  organizacao: z.string().trim().max(120),
  descricao_curta: z.string().trim().max(300),
  url: urlHttps,
  tipo: z.enum(['curso', 'programa', 'comunidade']),
  area: z.string().trim().max(80),
  gratuito: z.enum(['sim', 'nao', 'nao_sei']),
})

// transforma issues do Zod em { campo: mensagem }
export function errosPorCampo(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const i of err.issues) {
    const k = String(i.path[0] ?? '_')
    if (!out[k]) out[k] = i.message
  }
  return out
}
