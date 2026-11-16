import { z } from 'zod'

// Mesmos limites do banco: a tela avisa antes, o banco garante.
const texto = (min: number, max: number, msg: string) =>
  z.string().trim().min(min, msg).max(max, `Até ${max} caracteres`)

export const LIMITES = {
  apelido: 40,
  de_onde_vem: 400,
  area: 60,
  maxAreas: 8,
  feedbackCurto: 500,
  problema: 1000,
  denuncia: 800,
} as const

export const emailSchema = z.string().trim().max(254).email('Confira o e-mail')

export const linkedinSchema = z
  .string()
  .trim()
  .max(200, 'Link muito longo')
  .regex(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+/i, 'Cole o link do seu perfil, começando com https://www.linkedin.com/')

export const perfilSchema = z.object({
  apelido: texto(2, LIMITES.apelido, 'Escreva pelo menos 2 letras'),
  de_onde_vem: texto(3, LIMITES.de_onde_vem, 'Conta um pouquinho'),
  onde_esta: z.enum(['estudando', 'primeira_vaga', 'ate_2_anos'], { message: 'Escolha uma opção' }),
  areas: z
    .array(z.string().trim().min(2, 'Escreva a área').max(LIMITES.area, `Até ${LIMITES.area} caracteres`))
    .min(1, 'Escolha pelo menos uma área')
    .max(LIMITES.maxAreas, `Escolha até ${LIMITES.maxAreas} áreas`),
  formas_conexao: z
    .array(z.enum(['chamada', 'mensagem', 'encontro']))
    .min(1, 'Escolha pelo menos uma opção'),
})

export const senhaSchema = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres')
  .max(72, 'Senha longa demais')

export const urlHttps = z
  .string()
  .trim()
  .max(300, 'Link muito longo')
  .url('Cole um link válido')
  .refine((v) => v.startsWith('https://'), 'O link precisa começar com https://')

const emailOpcional = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Confira o e-mail')

export const feedbackAvaliacao = z.object({
  tipo: z.literal('avaliacao'),
  nota_facilidade: z.number({ message: 'Escolha uma nota' }).int().min(1).max(5),
  encontrou_aliadas: z.enum(['sim', 'em_parte', 'nao'], { message: 'Escolha uma opção' }),
  mudaria: z.string().trim().max(LIMITES.feedbackCurto),
  email: emailOpcional,
})

export const feedbackIndicacao = z.object({
  tipo: z.literal('indicacao'),
  indicacao_nome: texto(2, 120, 'Qual o nome?'),
  indicacao_link: urlHttps,
  indicacao_motivo: texto(1, LIMITES.feedbackCurto, 'Por que você indica?'),
  indicacao_gratuito: z.enum(['sim', 'nao', 'nao_sei'], { message: 'Escolha uma opção' }),
  email: emailOpcional,
})

export const feedbackProblema = z.object({
  tipo: z.literal('problema'),
  problema_descricao: texto(3, LIMITES.problema, 'Conta o que aconteceu'),
  problema_pagina: z.string().min(1, 'Escolha a página'),
  email: emailOpcional,
})

export const programaSchema = z.object({
  nome: texto(2, 120, 'Nome obrigatório'),
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
