// Assistente da aliadas: monta textos a partir dos perfis, sem IA paga.
// Tudo roda no navegador; nada é enviado para fora.
import type { FormaConexao, OndeEsta } from './tipos'

type Pessoa = {
  apelido: string
  areas: string[]
  onde_esta: OndeEsta
  formas_conexao?: FormaConexao[]
  de_onde_vem?: string
}

const principal = (areas: string[]) => areas[0] ?? 'tecnologia'

function momentoMeu(p: Pessoa) {
  const area = principal(p.areas)
  if (p.onde_esta === 'estudando') return `estou estudando ${area}`
  if (p.onde_esta === 'primeira_vaga') return `estou buscando minha primeira vaga em ${area}`
  return `trabalho com ${area} há pouco tempo`
}

function perguntaPara(ela: Pessoa) {
  if (ela.onde_esta === 'ate_2_anos') return 'como foi a sua entrada na área'
  if (ela.onde_esta === 'primeira_vaga') return 'como está sendo a sua busca pela primeira vaga'
  return 'como você organiza seus estudos'
}

function forma(eu: Pessoa, ela: Pessoa) {
  const minhas = new Set(eu.formas_conexao ?? [])
  const dela = ela.formas_conexao ?? []
  const escolhida = dela.find((f) => minhas.has(f)) ?? dela[0]
  if (escolhida === 'mensagem') return ' por mensagem'
  if (escolhida === 'encontro') return ', pode ser um café, se fizer sentido para você'
  return ' numa chamada rápida'
}

function gancho(eu: Pessoa, ela: Pessoa) {
  const minhas = new Set(eu.areas.map((a) => a.toLowerCase()))
  const comuns = ela.areas.filter((a) => minhas.has(a.toLowerCase()))
  if (comuns.length) return `vi que você também se interessa por ${comuns.slice(0, 2).join(' e ')}`
  if (eu.onde_esta === ela.onde_esta) return 'vi que estamos num momento parecido'
  return 'me identifiquei com a sua trajetória'
}

export const TOTAL_SUGESTOES = 3

// mensagem curta e humana para acompanhar o pedido de conexão
export function sugerirMensagem(eu: Pessoa, ela: Pessoa, variacao = 0): string {
  const g = gancho(eu, ela)
  const f = forma(eu, ela)
  const opcoes = [
    `oi, ${ela.apelido}! sou a ${eu.apelido}. ${g} e ${momentoMeu(eu)}. adoraria trocar experiências com você${f}. topa?`,
    `oi, ${ela.apelido}! ${g}. que tal uma conversa${f}? acho que dá para a gente aprender muito juntas.`,
    `oi, ${ela.apelido}, tudo bem? sou a ${eu.apelido} e ${momentoMeu(eu)}. ${g}. queria muito ouvir ${perguntaPara(ela)}. podemos conversar${f}?`,
  ]
  return opcoes[((variacao % opcoes.length) + opcoes.length) % opcoes.length]
}

// ---------------------------------------------------------------------
// meu pitch
// ---------------------------------------------------------------------
export type RespostasPitch = {
  nome: string
  antes: string
  agora: string
  traz: string
  busca: string
  area: string
}

export const OBJETIVOS_PITCH: Record<string, string> = {
  primeira_vaga: 'minha primeira oportunidade',
  estagio: 'um estágio',
  migracao: 'fazer a transição de carreira',
  projetos: 'projetos e trabalhos freelance',
  networking: 'trocar com pessoas da área',
}

const limpa = (t: string) => t.trim().replace(/\s+/g, ' ').replace(/[.!]+$/, '')
const maiuscula = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t)

export function montarPitch(r: RespostasPitch) {
  const nome = limpa(r.nome) || 'eu'
  const antes = limpa(r.antes)
  const agora = limpa(r.agora)
  const traz = limpa(r.traz)
  const area = limpa(r.area) || 'tecnologia'
  const busca = OBJETIVOS_PITCH[r.busca] ?? 'novas oportunidades'

  const fala = [
    `Oi, eu sou ${maiuscula(nome)}.`,
    antes && `${maiuscula(antes)}.`,
    agora && `Hoje, ${agora}.`,
    traz && `Da minha trajetória, eu trago ${traz}, e isso faz diferença no jeito que eu trabalho com ${area}.`,
    `Estou buscando ${busca} em ${area} e adoraria conversar.`,
  ].filter(Boolean).join(' ')

  const linkedin = [
    antes && `${maiuscula(antes)}.`,
    agora && `Hoje, ${agora}.`,
    traz && `Levo da minha trajetória ${traz}.`,
    `Busco ${busca} em ${area}. Se você também está nesse caminho ou pode trocar uma ideia, me chama por aqui.`,
  ].filter(Boolean).join(' ')

  const titulo = `${maiuscula(area)} | ${antes ? 'em transição de carreira' : 'em início de carreira'}`

  return { fala, linkedin, titulo }
}
