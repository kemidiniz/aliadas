import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Aviso, Carregando } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Botao, BotaoLink } from '../components/Botao'
import { Denunciar } from '../components/Denunciar'
import { Pagina, Titulo } from '../components/Pagina'
import { Revelar } from '../components/Revelar'
import { useAuth } from '../lib/auth'
import { mensagemAmigavel } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { ROTULO_ONDE_ESTA, type Conexao, type Perfil } from '../lib/tipos'

type Recomendacao = { id: string; motivo: string; aliada: Perfil }

export function trajetoriaCurta(p: Perfil) {
  if (p.resumo) return p.resumo
  return `${p.de_onde_vem}. hoje: ${ROTULO_ONDE_ESTA[p.onde_esta]}. interesses: ${p.areas.join(', ')}.`
}

const LIMITE_DIA = 3

export default function MinhasAliadas() {
  const { perfil, session } = useAuth()
  const [recs, setRecs] = useState<Recomendacao[] | null>(null)
  const [conexoes, setConexoes] = useState<Conexao[]>([])
  const [usadas, setUsadas] = useState(0)
  const [buscando, setBuscando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok' | 'info'; texto: string } | null>(null)
  const [pedindo, setPedindo] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!perfil || perfil.status !== 'aprovado') return setRecs([])
    const [{ data: r }, { data: c }, { data: n }] = await Promise.all([
      supabase.from('recommendations').select('id, motivo, aliada_profile_id').order('created_at'),
      supabase.from('connections').select('*'),
      supabase.rpc('minhas_geracoes_hoje'),
    ])
    const ids = (r ?? []).map((x) => x.aliada_profile_id)
    const { data: ps } = ids.length ? await supabase.from('profiles').select('*').in('id', ids) : { data: [] }
    const mapa = new Map((ps as Perfil[]).map((p) => [p.id, p]))
    setRecs(
      (r ?? [])
        .filter((x) => mapa.has(x.aliada_profile_id)) // quem pausou ou saiu some da lista
        .map((x) => ({ id: x.id, motivo: x.motivo, aliada: mapa.get(x.aliada_profile_id)! })),
    )
    setConexoes((c as Conexao[]) ?? [])
    setUsadas(typeof n === 'number' ? n : 0)
  }, [perfil])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function buscarDeNovo() {
    setBuscando(true)
    setMsg(null)
    const { data, error } = await supabase.functions.invoke('recomendar', { body: {} })
    setBuscando(false)
    if (error) {
      // a função devolve { mensagem } amigável também nos erros
      let texto = 'não conseguimos buscar suas aliadas agora. tente de novo mais tarde.'
      try {
        const corpo = await (error as { context?: Response }).context?.json()
        if (corpo?.mensagem) texto = corpo.mensagem
      } catch { /* mantém a mensagem padrão */ }
      setMsg({ tipo: 'erro', texto })
    } else if (data?.aliadas === 0) {
      setMsg({ tipo: 'info', texto: 'ainda não encontramos uma aliada com um caminho parecido. a comunidade cresce todo dia.' })
    } else {
      setMsg({ tipo: 'ok', texto: 'pronto! suas aliadas foram atualizadas.' })
    }
    carregar()
  }

  async function conectar(aliadaId: string) {
    setPedindo(aliadaId)
    const { error } = await supabase.rpc('pedir_conexao', { p_aliada: aliadaId })
    setPedindo(null)
    if (error) setMsg({ tipo: 'erro', texto: mensagemAmigavel(error) })
    carregar()
  }

  if (!perfil) return null
  if (perfil.status === 'pendente')
    return (
      <Pagina titulo="minhas aliadas">
        <Titulo>minhas aliadas</Titulo>
        <Aviso>seu perfil está com a curadoria. assim que ele for aprovado, a gente procura suas aliadas.</Aviso>
        <p className="mt-6">enquanto isso, <Link to="/recomendacoes" className="text-destaque underline underline-offset-4">conheça nossas recomendações</Link>.</p>
      </Pagina>
    )
  if (perfil.status === 'reprovado')
    return (
      <Pagina titulo="minhas aliadas">
        <Titulo>minhas aliadas</Titulo>
        <Aviso>seu perfil não foi aprovado pela curadoria. se acha que foi um engano, fale com a gente pelo <Link className="underline" to="/feedback">feedback</Link>.</Aviso>
      </Pagina>
    )
  if (perfil.status === 'pausado')
    return (
      <Pagina titulo="minhas aliadas">
        <Titulo>minhas aliadas</Titulo>
        <Aviso>seu perfil está pausado. você pode voltar quando quiser em <Link className="underline" to="/minha-conta">minha conta</Link>.</Aviso>
      </Pagina>
    )
  if (!recs) return <Carregando />

  const estadoConexao = (id: string) =>
    conexoes.find((c) => c.de_profile_id === id || c.para_profile_id === id)

  return (
    <Pagina titulo="minhas aliadas">
      <Titulo sub="mulheres com um caminho parecido com o seu, alguns passos à frente.">minhas aliadas</Titulo>

      {msg && <div className="mb-6"><Aviso tipo={msg.tipo}>{msg.texto}</Aviso></div>}

      {recs.length === 0 ? (
        <div className="space-y-4">
          <p className="text-lg">ainda estamos procurando sua aliada. enquanto isso, conheça nossas recomendações.</p>
          <BotaoLink to="/recomendacoes" variante="secundario">ver recomendações</BotaoLink>
        </div>
      ) : (
        <ul className="space-y-6">
          {recs.map((r, idx) => {
            const c = estadoConexao(r.aliada.id)
            return (
              <Revelar key={r.id} atraso={idx * 0.08}>
                <li className="list-none rounded-3xl border border-linha p-6 sm:p-8">
                  <div className="flex items-start gap-5">
                    <Avatar apelido={r.aliada.apelido} fotoPath={r.aliada.foto_path} tamanho={72} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-titulo text-2xl font-bold text-destaque">{r.aliada.apelido}</h2>
                      <p className="mt-2 text-texto">{trajetoriaCurta(r.aliada)}</p>
                    </div>
                  </div>
                  <div className="mt-5 border-l-2 border-coral pl-4">
                    <p className="font-titulo text-sm font-semibold lowercase text-suave">por que vocês combinam</p>
                    <p className="mt-1">{r.motivo}</p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    {!c && (
                      <Botao onClick={() => conectar(r.aliada.id)} carregando={pedindo === r.aliada.id}>quero me conectar</Botao>
                    )}
                    {c?.status === 'pendente' && c.de_profile_id === session!.user.id && <p className="text-suave">pedido enviado. agora é com ela.</p>}
                    {c?.status === 'pendente' && c.para_profile_id === session!.user.id && <BotaoLink to="/conexoes">ela quer se conectar com você</BotaoLink>}
                    {c?.status === 'aceita' && <BotaoLink to="/conexoes" variante="secundario">vocês estão conectadas: ver contato</BotaoLink>}
                    {c?.status === 'recusada' && <p className="text-suave">dessa vez não rolou. tudo bem: cada uma tem seu tempo.</p>}
                    <Denunciar perfilId={r.aliada.id} apelido={r.aliada.apelido} />
                  </div>
                </li>
              </Revelar>
            )
          })}
        </ul>
      )}

      <div className="mt-10 border-t border-linha pt-6">
        <Botao variante="secundario" onClick={buscarDeNovo} carregando={buscando} disabled={usadas >= LIMITE_DIA}>
          buscar aliadas de novo
        </Botao>
        <p className="mt-2 text-sm text-suave">
          {usadas >= LIMITE_DIA ? 'você já usou as 3 buscas de hoje. amanhã tem mais.' : `você pode buscar mais ${LIMITE_DIA - usadas} ${LIMITE_DIA - usadas === 1 ? 'vez' : 'vezes'} hoje.`}
        </p>
      </div>
    </Pagina>
  )
}
