import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Aviso, Carregando } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Botao } from '../components/Botao'
import { CampoArea, CampoTexto } from '../components/Campo'
import { Pagina, Titulo } from '../components/Pagina'
import { errosPorCampo, programaSchema } from '../lib/esquemas'
import { mensagemAmigavel } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { formasTexto, ROTULO_ONDE_ESTA, type Consentimento, type Contato, type Feedback, type Perfil, type Programa } from '../lib/tipos'

type Aba = 'perfis' | 'feedback' | 'programas' | 'ia' | 'denuncias'
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'perfis', rotulo: 'perfis' },
  { id: 'feedback', rotulo: 'feedback' },
  { id: 'programas', rotulo: 'programas' },
  { id: 'ia', rotulo: 'saídas da ia' },
  { id: 'denuncias', rotulo: 'denúncias' },
]

const seletor = 'rounded-xl border-2 border-campo bg-fundo px-3 py-2 text-texto focus:border-destaque'
const data = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export default function Curadoria() {
  const [aba, setAba] = useState<Aba>('perfis')
  return (
    <Pagina titulo="curadoria" largura="max-w-5xl">
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
          {aba === 'programas' && <Programas />}
          {aba === 'ia' && <SaidasIA />}
          {aba === 'denuncias' && <Denuncias />}
        </motion.div>
      </AnimatePresence>
    </Pagina>
  )
}

// ------------------------------------------------------------------ perfis
function Perfis() {
  const [filtro, setFiltro] = useState<Perfil['status']>('pendente')
  const [lista, setLista] = useState<(Perfil & { contato?: Contato; consent?: Consentimento })[] | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLista(null)
    const { data: ps } = await supabase.from('profiles').select('*').eq('status', filtro).order('created_at')
    const ids = (ps ?? []).map((p) => p.id)
    const [{ data: cs }, { data: cn }] = ids.length
      ? await Promise.all([
          supabase.from('contacts').select('*').in('profile_id', ids),
          supabase.from('consents').select('*').in('profile_id', ids),
        ])
      : [{ data: [] }, { data: [] }]
    const contatos = new Map((cs as Contato[]).map((c) => [c.profile_id, c]))
    const consents = new Map((cn as Consentimento[]).map((c) => [c.profile_id, c]))
    setLista((ps as Perfil[]).map((p) => ({ ...p, contato: contatos.get(p.id), consent: consents.get(p.id) })))
  }, [filtro])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function mudarStatus(id: string, status: Perfil['status']) {
    setErro('')
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
              <div className="mt-5 flex flex-wrap gap-3">
                {p.status !== 'aprovado' && <Botao onClick={() => mudarStatus(p.id, 'aprovado')}>aprovar</Botao>}
                {p.status !== 'reprovado' && <Botao variante="secundario" onClick={() => mudarStatus(p.id, 'reprovado')}>reprovar</Botao>}
                {p.status === 'aprovado' && <Botao variante="discreto" onClick={() => mudarStatus(p.id, 'pausado')}>pausar</Botao>}
              </div>
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
  const [area, setArea] = useState('')
  const [tipo, setTipo] = useState<Programa['tipo']>('programa')
  const [descricao, setDescricao] = useState(f.indicacao_motivo?.slice(0, 300) ?? '')
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

  async function aprovarIndicacao() {
    setOcupado(true)
    setErro('')
    const { error } = await supabase.rpc('aprovar_indicacao', {
      p_feedback: f.id,
      p_tipo: tipo,
      p_area: area,
      p_descricao: descricao,
      p_resposta: f.email ? rascunho : '',
    })
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
            <div><dt className="text-suave">mais difícil</dt><dd>{f.mais_dificil}</dd></div>
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
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto rotulo="área" value={area} maxLength={80} onChange={(e) => setArea(e.target.value)} />
                <div className="space-y-2">
                  <label htmlFor={`tipo-${f.id}`} className="block font-titulo text-lg font-semibold">tipo</label>
                  <select id={`tipo-${f.id}`} className={`${seletor} w-full py-3`} value={tipo} onChange={(e) => setTipo(e.target.value as Programa['tipo'])}>
                    <option value="curso">curso</option>
                    <option value="programa">programa</option>
                    <option value="comunidade">comunidade</option>
                  </select>
                </div>
              </div>
              <CampoArea rotulo="descrição curta (aparece em recomendações)" value={descricao} rows={2} maxLength={300} onChange={(e) => setDescricao(e.target.value)} />
              <div className="flex flex-wrap gap-3">
                <Botao onClick={aprovarIndicacao} carregando={ocupado}>aprovar indicação</Botao>
                <Botao variante="secundario" disabled={ocupado} onClick={() => atualizar({ status: 'descartado' })}>recusar indicação</Botao>
              </div>
            </>
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

// --------------------------------------------------------------- programas
const novoPrograma = { nome: '', organizacao: '', descricao_curta: '', url: '', tipo: 'curso' as Programa['tipo'], area: '', gratuito: 'nao_sei' as 'sim' | 'nao' | 'nao_sei' }

function Programas() {
  const [lista, setLista] = useState<Programa[] | null>(null)
  const [form, setForm] = useState(novoPrograma)
  const [editando, setEditando] = useState<string | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('programs').select('*').order('created_at', { ascending: false })
    setLista((data as Programa[]) ?? [])
  }, [])
  useEffect(() => {
    carregar()
  }, [carregar])

  function editar(p: Programa) {
    setEditando(p.id)
    setForm({
      nome: p.nome === 'PREENCHER' ? '' : p.nome,
      organizacao: p.organizacao === 'PREENCHER' ? '' : p.organizacao ?? '',
      descricao_curta: p.descricao_curta === 'PREENCHER' ? '' : p.descricao_curta ?? '',
      url: p.url ?? '',
      tipo: p.tipo,
      area: p.area ?? '',
      gratuito: p.gratuito === true ? 'sim' : p.gratuito === false ? 'nao' : 'nao_sei',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const r = programaSchema.safeParse(form)
    if (!r.success) return setErros(errosPorCampo(r.error))
    setErros({})
    const v = r.data
    const linha = {
      nome: v.nome,
      organizacao: v.organizacao || null,
      descricao_curta: v.descricao_curta || null,
      url: v.url,
      tipo: v.tipo,
      area: v.area || null,
      gratuito: v.gratuito === 'sim' ? true : v.gratuito === 'nao' ? false : null,
    }
    const { error } = editando
      ? await supabase.from('programs').update(linha).eq('id', editando)
      : await supabase.from('programs').insert({ ...linha, origem: 'curadoria', ativo: false })
    if (error) return setErro(mensagemAmigavel(error))
    setForm(novoPrograma)
    setEditando(null)
    carregar()
  }

  async function alternar(p: Programa) {
    setErro('')
    const { error } = await supabase.from('programs').update({ ativo: !p.ativo }).eq('id', p.id)
    if (error) setErro(p.url ? mensagemAmigavel(error) : 'para ativar, o programa precisa de um link.')
    carregar()
  }

  const m = <K extends keyof typeof novoPrograma>(k: K, v: (typeof novoPrograma)[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="space-y-10">
      <form onSubmit={salvar} noValidate className="space-y-5 rounded-3xl border border-linha p-6">
        <h2 className="font-titulo text-2xl font-bold text-destaque">{editando ? 'editar programa' : 'cadastrar programa'}</h2>
        <p className="text-sm text-suave">cadastre só programas reais, com link conferido. novos entram desativados: ative quando estiver tudo certo.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto rotulo="nome" value={form.nome} onChange={(e) => m('nome', e.target.value)} erro={erros.nome} />
          <CampoTexto rotulo="organização" value={form.organizacao} onChange={(e) => m('organizacao', e.target.value)} erro={erros.organizacao} />
          <CampoTexto rotulo="link (https://)" type="url" value={form.url} onChange={(e) => m('url', e.target.value)} erro={erros.url} />
          <CampoTexto rotulo="área" value={form.area} onChange={(e) => m('area', e.target.value)} erro={erros.area} />
          <label className="space-y-2">
            <span className="block font-titulo text-lg font-semibold">tipo</span>
            <select className={`${seletor} w-full py-3`} value={form.tipo} onChange={(e) => m('tipo', e.target.value as Programa['tipo'])}>
              <option value="curso">curso</option><option value="programa">programa</option><option value="comunidade">comunidade</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="block font-titulo text-lg font-semibold">gratuito?</span>
            <select className={`${seletor} w-full py-3`} value={form.gratuito} onChange={(e) => m('gratuito', e.target.value as typeof form.gratuito)}>
              <option value="sim">sim</option><option value="nao">não</option><option value="nao_sei">não sei</option>
            </select>
          </label>
        </div>
        <CampoArea rotulo="descrição curta" rows={2} maxLength={300} value={form.descricao_curta} onChange={(e) => m('descricao_curta', e.target.value)} erro={erros.descricao_curta} />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <div className="flex gap-3">
          <Botao type="submit">{editando ? 'salvar alterações' : 'cadastrar'}</Botao>
          {editando && <Botao type="button" variante="discreto" onClick={() => { setEditando(null); setForm(novoPrograma) }}>cancelar</Botao>}
        </div>
      </form>

      {!lista ? <Carregando /> : (
        <ul className="space-y-3">
          {lista.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-linha p-4">
              <div className="min-w-0">
                <p className="font-semibold">{p.nome} {p.origem === 'sugestao' && <span className="text-sm font-normal text-suave">· indicação</span>}</p>
                <p className="text-sm text-suave">{p.tipo}{p.area ? ` · ${p.area}` : ''} · {p.ativo ? 'ativo' : 'inativo'}</p>
              </div>
              <div className="flex gap-2">
                <Botao variante="discreto" onClick={() => editar(p)}>editar</Botao>
                <Botao variante={p.ativo ? 'secundario' : 'principal'} onClick={() => alternar(p)}>{p.ativo ? 'desativar' : 'ativar'}</Botao>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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
type Denuncia = { id: string; denunciante_id: string | null; denunciado_id: string; motivo: string; status: string; created_at: string }

function Denuncias() {
  const [lista, setLista] = useState<Denuncia[] | null>(null)
  const [perfis, setPerfis] = useState<Map<string, Perfil>>(new Map())

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    const ds = (data as Denuncia[]) ?? []
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
            <p className="mt-2">{d.motivo}</p>
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
