import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { mensagemAmigavel } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { AREAS, ROTULO_FORMA, ROTULO_ONDE_ESTA, type Conexao, type FormaConexao, type OndeEsta } from '../lib/tipos'
import { Aviso, Carregando } from './Aviso'
import { Avatar } from './Avatar'
import { Botao, BotaoLink } from './Botao'
import { Denunciar } from './Denunciar'
import { PedidoConexao } from './PedidoConexao'
import { Cartao, Chips, Selo, Vazio } from './ui'

type Resultado = {
  id: string
  apelido: string
  foto_path: string | null
  de_onde_vem: string
  onde_esta: OndeEsta
  areas: string[]
  formas_conexao: FormaConexao[]
  resumo: string | null
}

const seletor = 'min-h-11 w-full rounded-xl border-2 border-campo bg-fundo px-4 text-texto focus:border-destaque'

export function BuscarMulheres() {
  const { session } = useAuth()
  const eu = session!.user.id
  const [texto, setTexto] = useState('')
  const [area, setArea] = useState('')
  const [onde, setOnde] = useState('')
  const [lista, setLista] = useState<Resultado[] | null>(null)
  const [conexoes, setConexoes] = useState<Conexao[]>([])
  const [erro, setErro] = useState('')

  const buscar = useCallback(async (t: string, a: string, o: string) => {
    setErro('')
    const [{ data, error }, { data: cs }] = await Promise.all([
      supabase.rpc('buscar_aliadas', { p_texto: t, p_area: a, p_onde: o, p_limite: 40 }),
      supabase.from('connections').select('*'),
    ])
    if (error) setErro(mensagemAmigavel(error))
    setLista((data as Resultado[]) ?? [])
    setConexoes((cs as Conexao[]) ?? [])
  }, [])

  useEffect(() => {
    buscar('', '', '')
  }, [buscar])

  function enviar(e: FormEvent) {
    e.preventDefault()
    setLista(null)
    buscar(texto, area, onde)
  }


  const estado = (id: string) => conexoes.find((c) => c.de_profile_id === id || c.para_profile_id === id)

  return (
    <div>
      <form onSubmit={enviar} role="search" className="mb-8 grid gap-3 rounded-3xl border border-linha bg-superficie p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end sm:p-5">
        <label className="space-y-1.5">
          <span className="block font-titulo text-sm font-semibold">buscar por nome, trajetória ou área</span>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={60}
            placeholder="ex.: professora, dados, enfermagem…"
            className="min-h-11 w-full rounded-xl border-2 border-campo bg-fundo px-4 text-texto placeholder:text-suave/80 focus:border-destaque focus:outline-none"
          />
        </label>
        <label className="space-y-1.5">
          <span className="block font-titulo text-sm font-semibold">área</span>
          <select value={area} onChange={(e) => setArea(e.target.value)} className={seletor}>
            <option value="">todas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block font-titulo text-sm font-semibold">momento</span>
          <select value={onde} onChange={(e) => setOnde(e.target.value)} className={seletor}>
            <option value="">todos</option>
            {(Object.keys(ROTULO_ONDE_ESTA) as OndeEsta[]).map((o) => <option key={o} value={o}>{ROTULO_ONDE_ESTA[o]}</option>)}
          </select>
        </label>
        <Botao type="submit">buscar</Botao>
      </form>

      {erro && <div className="mb-6"><Aviso tipo="erro">{erro}</Aviso></div>}

      {!lista ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio titulo="ninguém encontrado com esses filtros">
          a comunidade está crescendo. tente outra palavra ou volte em alguns dias.
        </Vazio>
      ) : (
        <>
          <p className="mb-4 text-sm text-suave" role="status">{lista.length} {lista.length === 1 ? 'mulher encontrada' : 'mulheres encontradas'}</p>
          <ul className="grid gap-5 md:grid-cols-2">
            {lista.map((p) => {
              const c = estado(p.id)
              return (
                <li key={p.id} className="list-none">
                  <Cartao className="flex h-full flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <Avatar apelido={p.apelido} fotoPath={p.foto_path} tamanho={56} />
                      <div className="min-w-0 flex-1">
                        <p className="font-titulo text-xl font-bold text-destaque">{p.apelido}</p>
                        <p className="text-sm text-suave">{ROTULO_ONDE_ESTA[p.onde_esta]}</p>
                      </div>
                    </div>
                    <p className="line-clamp-4">{p.resumo ?? p.de_onde_vem}</p>
                    <Chips itens={p.areas} rotulo="áreas de interesse" />
                    <p className="text-sm text-suave">prefere: {p.formas_conexao.map((f) => ROTULO_FORMA[f]).join(', ')}</p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
                      {!c && <PedidoConexao ela={p} aoEnviar={() => buscar(texto, area, onde)} />}
                      {c?.status === 'pendente' && c.de_profile_id === eu && <Selo tom="suave">pedido enviado</Selo>}
                      {c?.status === 'pendente' && c.para_profile_id === eu && <BotaoLink to="/conexoes">ela quer se conectar com você</BotaoLink>}
                      {c?.status === 'aceita' && <BotaoLink to="/conexoes" variante="secundario">ver contato</BotaoLink>}
                      {c?.status === 'recusada' && <Selo tom="suave">dessa vez não rolou</Selo>}
                      <Denunciar perfilId={p.id} apelido={p.apelido} />
                    </div>
                  </Cartao>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
