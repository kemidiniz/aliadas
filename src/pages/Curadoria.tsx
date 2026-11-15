import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Aviso, Carregando } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Botao } from '../components/Botao'
import { CampoArea } from '../components/Campo'
import { Pagina, Titulo } from '../components/Pagina'
import { useAuth } from '../lib/auth'
import { mensagemAmigavel } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { formasTexto, ROTULO_ONDE_ESTA, type Consentimento, type Contato, type Feedback, type Perfil } from '../lib/tipos'

type Aba = 'perfis' | 'feedback' | 'ia' | 'denuncias'
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'perfis', rotulo: 'perfis' },
  { id: 'feedback', rotulo: 'feedback' },
  { id: 'ia', rotulo: 'saídas da ia' },
  { id: 'denuncias', rotulo: 'denúncias' },
]

const seletor = 'rounded-xl border-2 border-campo bg-fundo px-3 py-2 text-texto focus:border-destaque'
const data = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export default function Curadoria() {
  const [aba, setAba] = useState<Aba>('perfis')
  return (
    <Pagina titulo="curadoria">
      <Titulo>curadoria</Titulo>
      <div role="tablist" aria-label="áreas da curadoria" className="mb-8 flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            id={`aba-${a.id}`}
            aria-selected={aba === a.id}
            aria-controls={`painel-${a.id}`}
            onClick={() => setAba(a.id)}
            className={`min-h-11 rounded-full border-2 px-4 font-titulo font-semibold lowercase ${aba === a.id ? 'border-destaque bg-destaque text-sobre-destaque' : 'border-linha text-texto hover:border-destaque'}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={aba}
          role="tabpanel"
          id={`painel-${aba}`}
          aria-labelledby={`aba-${aba}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {aba === 'perfis' && <Perfis />}
          {aba === 'feedback' && <FeedbackAba />}
          {aba === 'ia' && <SaidasIA />}
          {aba === 'denuncias' && <Denuncias />}
        </motion.div>
      </AnimatePresence>
    </Pagina>
  )
}

// ------------------------------------------------------------------ perfis
function Perfis() {
  const { session } = useAuth()
  const [filtro, setFiltro] = useState<Perfil['status']>('pendente')
  const [lista, setLista] = useState<(Perfil & { contato?: Contato; consent?: Consentimento })[] | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLista(null)
    const { data: ps, error: erroPerfis } = await supabase.from('profiles').select('*').eq('status', filtro).order('created_at')
    if (erroPerfis) {
      setErro(mensagemAmigavel(erroPerfis, 'não foi possível carregar os perfis. tente novamente.'))
      setLista([])
      return
    }
    const ids = (ps ?? []).map((p) => p.id)
    const [{ data: cs, error: erroContatos }, { data: cn, error: erroConsents }] = ids.length
      ? await Promise.all([
          supabase.from('contacts').select('*').in('profile_id', ids),
          supabase.from('consents').select('*').in('profile_id', ids),
        ])
      : [{ data: [], error: null }, { data: [], error: null }]
    if (erroContatos || erroConsents) {
      setErro('não foi possível carregar contatos ou consentimentos. recarregue a página antes de avaliar os perfis.')
      setLista([])
      return
    }
    const contatos = new Map(((cs ?? []) as Contato[]).map((c) => [c.profile_id, c]))
    const consents = new Map(((cn ?? []) as Consentimento[]).map((c) => [c.profile_id, c]))
    setLista(((ps ?? []) as Perfil[]).map((p) => ({ ...p, contato: contatos.get(p.id), consent: consents.get(p.id) })))
  }, [filtro])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function mudarStatus(id: string, status: Perfil['status']) {
    setErro('')
    if (id === session?.user.id) {
      setErro('seu perfil precisa ser avaliado por outra curadora. para pausar ou retomar um perfil já aprovado, vá em minha conta.')
      return
    }
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
    if (error) setErro(mensagemAmigavel(error))
    carregar()
  }

  return (
    <div>
      <label className="mb-6 flex items-center gap-3">
        <span className="font-titulo font-semibold">mostrar</span>
        <select className={seletor} value={filtro} onChange={(e) => setFiltro(e.target.value as Perfil['status'])}>
          <option value="pendente">pendentes</option>
          <option value="aprovado">aprovados</option>
          <option value="reprovado">reprovados</option>
          <option value="pausado">pausados</option>
        </select>
      </label>
      {erro && <div className="mb-4"><Aviso tipo="erro">{erro}</Aviso></div>}
      {!lista ? <Carregando /> : lista.length === 0 ? <p className="text-suave">nenhum perfil aqui.</p> : (
        <ul className="space-y-5">
          {lista.map((p) => (
            <li key={p.id} className="rounded-3xl border border-linha p-6">
              <div className="flex items-start gap-4">
                <Avatar apelido={p.apelido} fotoPath={p.foto_path} />
                <div className="min-w-0 flex-1">
                  <p className="font-titulo text-xl font-bold">{p.apelido} <span className="text-sm font-normal text-suave">{p.codigo} · {data(p.created_at)}</span></p>
                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-suave">de onde vem</dt><dd>{p.de_onde_vem}</dd></div>
                    <div><dt className="text-suave">onde está</dt><dd>{ROTULO_ONDE_ESTA[p.onde_esta]}</dd></div>
                    <div><dt className="text-suave">áreas</dt><dd>{p.areas.join(', ')}</dd></div>
                    <div><dt className="text-suave">prefere</dt><dd>{formasTexto(p.formas_conexao)}</dd></div>
                    <div className="break-words"><dt className="text-suave">e-mail</dt><dd>{p.contato?.email ?? 'sem contato'}</dd></div>
                    <div className="break-words">
                      <dt className="text-suave">linkedin</dt>
                      <dd>{p.contato?.linkedin_url ? <a className="text-destaque underline underline-offset-4" href={p.contato.linkedin_url} target="_blank" rel="noopener noreferrer">{p.contato.linkedin_url}</a> : 'não informado'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-suave">consentimentos</dt>
                      <dd>
                        {p.consent
                          ? `autodeclaração ✓ · termo ✓ · ${p.consent.aceita_ser_recomendada ? 'aceita ser recomendada' : 'NÃO quer ser recomendada'} · em ${data(p.consent.aceito_em)}`
                          : 'sem registro'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              {p.id === session?.user.id ? (
                <p className="mt-5 text-sm text-suave">este é seu perfil. a aprovação precisa ser feita por outra curadora. para pausar ou retomar um perfil já aprovado, vá em minha conta.</p>
              ) : <div className="mt-5 flex flex-wrap gap-3">
                {p.status !== 'aprovado' && <Botao onClick={() => mudarStatus(p.id, 'aprovado')}>aprovar</Botao>}
                {p.status !== 'reprovado' && <Botao variante="secundario" onClick={() => mudarStatus(p.id, 'reprovado')}>reprovar</Botao>}
                {p.status === 'aprovado' && <Botao variante="discreto" onClick={() => mudarStatus(p.id, 'pausado')}>pausar</Botao>}
              </div>}
              {p.status === 'pendente' && <p className="mt-2 text-sm text-suave">ao aprovar, a ia busca as aliadas dela automaticamente.</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- feedback
const ROTULO_TIPO: Record<Feedback['tipo'], string> = { avaliacao: 'avaliação', indicacao: 'indicação', problema: 'problema' }

function FeedbackAba() {
  const [filtro, setFiltro] = useState<'abertos' | Feedback['status']>('abertos')
  const [lista, setLista] = useState<Feedback[] | null>(null)

  const carregar = useCallback(async () => {
    setLista(null)
    let q = supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(100)
    q = filtro === 'abertos' ? q.in('status', ['novo', 'em_analise']) : q.eq('status', filtro)
    const { data } = await q
    setLista((data as Feedback[]) ?? [])
  }, [filtro])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <div>
      <label className="mb-6 flex items-center gap-3">
        <span className="font-titulo font-semibold">mostrar</span>
        <select className={seletor} value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
          <option value="abertos">em aberto</option>
          <option value="aprovado">aprovados</option>
          <option value="respondido">respondidos</option>
          <option value="descartado">descartados</option>
        </select>
      </label>
      {!lista ? <Carregando /> : lista.length === 0 ? <p className="text-suave">nada por aqui.</p> : (
        <ul className="space-y-5">{lista.map((f) => <ItemFeedback key={f.id} f={f} aoMudar={carregar} />)}</ul>
      )}
    </div>
  )
}

function ItemFeedback({ f, aoMudar }: { f: Feedback; aoMudar: () => void }) {
  const [rascunho, setRascunho] = useState(f.rascunho_ia ?? f.resposta_aprovada ?? '')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const aberto = f.status === 'novo' || f.status === 'em_analise'

  async function atualizar(campos: Partial<Feedback>) {
    setOcupado(true)
    setErro('')
    const { error } = await supabase.from('feedback').update(campos).eq('id', f.id)
    setOcupado(false)
    if (error) setErro(mensagemAmigavel(error))
    else aoMudar()
  }

  return (
    <li className="rounded-3xl border border-linha p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-titulo text-xl font-bold">{ROTULO_TIPO[f.tipo]}</p>
        <p className="text-sm text-suave">{data(f.created_at)} · {f.status.replace('_', ' ')}</p>
      </div>

      <dl className="mt-3 space-y-2">
        {f.tipo === 'avaliacao' && (
          <>
            <div><dt className="inline text-suave">facilidade: </dt><dd className="inline">{f.nota_facilidade}/5</dd></div>
            <div><dt className="inline text-suave">encontrou aliadas: </dt><dd className="inline">{f.encontrou_aliadas?.replace('_', ' ')}</dd></div>
            {f.mudaria && <div><dt className="text-suave">mudaria</dt><dd>{f.mudaria}</dd></div>}
          </>
        )}
        {f.tipo === 'indicacao' && (
          <>
            <div><dt className="inline text-suave">nome: </dt><dd className="inline font-semibold">{f.indicacao_nome}</dd></div>
            <div className="break-words">
              <dt className="inline text-suave">link: </dt>
              <dd className="inline"><a href={f.indicacao_link!} target="_blank" rel="noopener noreferrer nofollow" className="text-destaque underline underline-offset-4">{f.indicacao_link}</a></dd>
            </div>
            <div><dt className="text-suave">por que indica</dt><dd>{f.indicacao_motivo}</dd></div>
            <div><dt className="inline text-suave">gratuito: </dt><dd className="inline">{f.indicacao_gratuito?.replace('_', ' ')}</dd></div>
          </>
        )}
        {f.tipo === 'problema' && (
          <>
            <div><dt className="inline text-suave">página: </dt><dd className="inline">{f.problema_pagina}</dd></div>
            <div><dt className="text-suave">o que aconteceu</dt><dd>{f.problema_descricao}</dd></div>
          </>
        )}
        <div className="break-words"><dt className="inline text-suave">e-mail: </dt><dd className="inline">{f.email ?? 'não quis resposta'}</dd></div>
      </dl>

      {(f.categoria_ia || f.resumo_ia || f.alertas_ia) && (
        <div className="mt-5 rounded-2xl bg-superficie p-4 text-sm">
          <p className="font-titulo font-semibold lowercase text-suave">análise da ia (automação)</p>
          {f.categoria_ia && <p className="mt-1">categoria: {f.categoria_ia}{f.urgencia_ia ? ` · urgência: ${f.urgencia_ia}` : ''}</p>}
          {f.resumo_ia && <p className="mt-1">resumo: {f.resumo_ia}</p>}
          {f.alertas_ia && <p className="mt-1 text-erro">alertas: {f.alertas_ia}</p>}
        </div>
      )}

      {aberto && (
        <div className="mt-5 space-y-4">
          {f.email && (
            <CampoArea
              rotulo="resposta"
              ajuda={f.rascunho_ia ? 'rascunho da ia: revise antes de aprovar.' : 'o rascunho da ia ainda não chegou. você pode escrever direto.'}
              value={rascunho}
              rows={5}
              maxLength={4000}
              onChange={(e) => setRascunho(e.target.value)}
            />
          )}

          {f.tipo === 'indicacao' ? (
            <Botao variante="discreto" disabled={ocupado} onClick={() => atualizar({ status: 'descartado' })}>descartar indicação antiga</Botao>
          ) : (
            <div className="flex flex-wrap gap-3">
              {f.email ? (
                <Botao
                  carregando={ocupado}
                  disabled={!rascunho.trim()}
                  onClick={() => atualizar({ resposta_aprovada: rascunho.trim(), rascunho_ia: rascunho.trim(), status: 'aprovado' })}
                >
                  aprovar e enviar
                </Botao>
              ) : (
                <Botao carregando={ocupado} onClick={() => atualizar({ status: 'respondido' })}>marcar como lido</Botao>
              )}
              {f.status === 'novo' && <Botao variante="secundario" disabled={ocupado} onClick={() => atualizar({ status: 'em_analise' })}>em análise</Botao>}
              <Botao variante="discreto" disabled={ocupado} onClick={() => atualizar({ status: 'descartado' })}>descartar</Botao>
            </div>
          )}
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
        </div>
      )}
      {f.resposta_aprovada && !aberto && (
        <p className="mt-4 rounded-2xl bg-superficie p-4 text-sm"><span className="text-suave">resposta aprovada: </span>{f.resposta_aprovada}</p>
      )}
    </li>
  )
}

// ------------------------------------------------------------------ ai_runs
type Run = {
  id: string
  profile_id: string | null
  funcao: string
  origem: string | null
  input_resumido: string | null
  output_json: unknown
  modelo: string | null
  tokens_entrada: number | null
  tokens_saida: number | null
  sucesso: boolean
  erro: string | null
  created_at: string
}

function SaidasIA() {
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [codigos, setCodigos] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    supabase.from('ai_runs').select('*').order('created_at', { ascending: false }).limit(100).then(async ({ data }) => {
      const lista = (data as Run[]) ?? []
      const ids = [...new Set(lista.map((r) => r.profile_id).filter((x): x is string => Boolean(x)))]
      if (ids.length) {
        const { data: ps } = await supabase.from('profiles').select('id, codigo').in('id', ids)
        setCodigos(new Map((ps ?? []).map((p) => [p.id, p.codigo])))
      }
      setRuns(lista)
    })
  }, [])

  if (!runs) return <Carregando />
  const ok = runs.filter((r) => r.sucesso)
  const entrada = runs.reduce((s, r) => s + (r.tokens_entrada ?? 0), 0)
  const saida = runs.reduce((s, r) => s + (r.tokens_saida ?? 0), 0)

  return (
    <div>
      <p className="mb-6 text-suave">
        {runs.length} execuções · {ok.length} com sucesso · {entrada.toLocaleString('pt-BR')} tokens de entrada · {saida.toLocaleString('pt-BR')} de saída
      </p>
      {runs.length === 0 ? <p className="text-suave">nenhuma execução ainda.</p> : (
        <ul className="space-y-4">
          {runs.map((r) => (
            <li key={r.id} className="rounded-2xl border border-linha p-4">
              <p className="font-semibold">
                {r.funcao} · {r.profile_id ? codigos.get(r.profile_id) ?? '—' : 'conta excluída'} · {r.sucesso ? 'ok' : 'falhou'}
              </p>
              <p className="text-sm text-suave">
                {data(r.created_at)} · {r.origem ?? '—'} · {r.modelo ?? '—'} · {r.tokens_entrada ?? 0}/{r.tokens_saida ?? 0} tokens
              </p>
              {r.input_resumido && <p className="mt-2 break-words text-sm">entrada: {r.input_resumido}</p>}
              {r.erro && <p className="mt-2 text-sm text-erro">erro: {r.erro}</p>}
              {r.output_json != null && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-destaque">ver saída</summary>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-superficie p-3 text-xs">{JSON.stringify(r.output_json, null, 2)}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// --------------------------------------------------------------- denúncias
type Denuncia = {
  id: string
  denunciante_id: string | null
  denunciado_id: string
  motivo: string
  status: string
  created_at: string
  post_id: string | null
  comentario_id: string | null
}
type ConteudoForum = { id: string; texto: string; oculto: boolean }

function Denuncias() {
  const [lista, setLista] = useState<Denuncia[] | null>(null)
  const [perfis, setPerfis] = useState<Map<string, Perfil>>(new Map())
  const [conteudos, setConteudos] = useState<Map<string, ConteudoForum>>(new Map())

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    const ds = (data as Denuncia[]) ?? []
    const idsPosts = ds.map((d) => d.post_id).filter((x): x is string => Boolean(x))
    const idsComs = ds.map((d) => d.comentario_id).filter((x): x is string => Boolean(x))
    const [{ data: ps2 }, { data: cs2 }] = await Promise.all([
      idsPosts.length ? supabase.from('forum_posts').select('id, texto, oculto').in('id', idsPosts) : Promise.resolve({ data: [] }),
      idsComs.length ? supabase.from('forum_comentarios').select('id, texto, oculto').in('id', idsComs) : Promise.resolve({ data: [] }),
    ])
    setConteudos(new Map([...((ps2 ?? []) as ConteudoForum[]), ...((cs2 ?? []) as ConteudoForum[])].map((c) => [c.id, c])))
    const ids = [...new Set(ds.flatMap((d) => [d.denunciado_id, d.denunciante_id]).filter((x): x is string => Boolean(x)))]
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('*').in('id', ids)
      setPerfis(new Map((ps as Perfil[]).map((p) => [p.id, p])))
    }
    setLista(ds)
  }, [])
  useEffect(() => {
    carregar()
  }, [carregar])

  async function mudar(id: string, status: string) {
    await supabase.from('reports').update({ status }).eq('id', id)
    carregar()
  }

  async function ocultar(d: Denuncia, oculto: boolean) {
    const tabela = d.post_id ? 'forum_posts' : 'forum_comentarios'
    await supabase.from(tabela).update({ oculto }).eq('id', (d.post_id ?? d.comentario_id)!)
    carregar()
  }

  if (!lista) return <Carregando />
  if (lista.length === 0) return <p className="text-suave">nenhuma denúncia. que bom.</p>
  return (
    <ul className="space-y-4">
      {lista.map((d) => {
        const alvo = perfis.get(d.denunciado_id)
        return (
          <li key={d.id} className="rounded-2xl border border-linha p-5">
            <p className="font-semibold">
              perfil denunciado: {alvo ? `${alvo.apelido} (${alvo.codigo})` : d.denunciado_id}
            </p>
            <p className="text-sm text-suave">
              por {d.denunciante_id ? perfis.get(d.denunciante_id)?.codigo ?? '—' : 'conta excluída'} · {data(d.created_at)}
            </p>
            <p className="mt-2"><span className="text-suave">motivo: </span>{d.motivo}</p>
            {(d.post_id || d.comentario_id) && (() => {
              const c = conteudos.get((d.post_id ?? d.comentario_id)!)
              return (
                <div className="mt-3 rounded-2xl bg-superficie p-4">
                  <p className="text-sm text-suave">{d.post_id ? 'post do fórum' : 'comentário do fórum'}{c?.oculto ? ' · oculto' : ''}</p>
                  <p className="mt-1 whitespace-pre-line">{c ? c.texto : 'conteúdo já apagado'}</p>
                  {c && (
                    <div className="mt-3">
                      <Botao variante={c.oculto ? 'secundario' : 'perigo'} onClick={() => ocultar(d, !c.oculto)}>
                        {c.oculto ? 'mostrar de novo' : 'ocultar do fórum'}
                      </Botao>
                    </div>
                  )}
                </div>
              )
            })()}
            <label className="mt-3 flex items-center gap-3">
              <span className="text-sm">status</span>
              <select className={seletor} value={d.status} onChange={(e) => mudar(d.id, e.target.value)}>
                <option value="aberta">aberta</option>
                <option value="em_analise">em análise</option>
                <option value="resolvida">resolvida</option>
                <option value="descartada">descartada</option>
              </select>
            </label>
            {alvo?.status === 'aprovado' && (
              <p className="mt-2 text-sm text-suave">para pausar este perfil, vá na aba perfis → aprovados.</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
