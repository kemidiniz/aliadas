import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Aviso, Carregando } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Botao } from '../components/Botao'
import { Pagina, Titulo } from '../components/Pagina'
import { Abas, Cartao, Selo, Vazio, tempoRelativo } from '../components/ui'
import { useAuth } from '../lib/auth'
import { mensagemAmigavel } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { AREAS } from '../lib/tipos'

type Post = {
  id: string
  texto: string
  area: string | null
  created_at: string
  oculto: boolean
  conquista: boolean
  autora_id: string
  autora_apelido: string
  autora_foto_path: string | null
  curtidas: number
  comentarios: number
  curti: boolean
  minha: boolean
}

type Comentario = {
  id: string
  texto: string
  created_at: string
  oculto: boolean
  autora_id: string
  autora_apelido: string
  autora_foto_path: string | null
  minha: boolean
}

type Ordem = 'evidencia' | 'recentes' | 'conquistas'
const MAX_POST = 2000
const MAX_COMENTARIO = 1000

function Coracao({ cheio }: { cheio: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"
        fill={cheio ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Balao() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

// denúncia de post ou comentário
function DenunciarConteudo({ tipo, id }: { tipo: 'post' | 'comentario'; id: string }) {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok'>('idle')
  const [erro, setErro] = useState('')

  async function enviar() {
    if (motivo.trim().length < 5) return setErro('conta em poucas palavras o que aconteceu')
    setEstado('enviando')
    const { error } = await supabase.rpc('denunciar_conteudo', { p_tipo: tipo, p_id: id, p_motivo: motivo.trim() })
    if (error) {
      setEstado('idle')
      setErro(mensagemAmigavel(error))
    } else setEstado('ok')
  }

  if (estado === 'ok') return <span className="text-sm text-suave" role="status">denúncia enviada à curadoria.</span>
  if (!aberto)
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-sm text-suave underline-offset-4 hover:text-destaque hover:underline">
        denunciar
      </button>
    )
  return (
    <div className="mt-2 w-full space-y-2 rounded-2xl bg-fundo p-3 ring-1 ring-linha">
      <label className="block text-sm font-semibold" htmlFor={`den-${id}`}>o que aconteceu? só a curadoria lê.</label>
      <textarea
        id={`den-${id}`}
        rows={2}
        maxLength={800}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        className="w-full rounded-xl border-2 border-campo bg-fundo px-3 py-2 text-texto focus:border-destaque focus:outline-none"
      />
      {erro && <p className="text-sm text-erro">{erro}</p>}
      <div className="flex gap-2">
        <Botao variante="secundario" onClick={enviar} carregando={estado === 'enviando'}>enviar</Botao>
        <Botao variante="discreto" onClick={() => setAberto(false)}>cancelar</Botao>
      </div>
    </div>
  )
}

function Comentarios({ post, aoMudar }: { post: Post; aoMudar: () => void }) {
  const [lista, setLista] = useState<Comentario[] | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const { session } = useAuth()

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('forum_comentarios_de', { p_post: post.id })
    setLista((data as Comentario[]) ?? [])
  }, [post.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function comentar(e: FormEvent) {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    setEnviando(true)
    setErro('')
    const { error } = await supabase.from('forum_comentarios').insert({ post_id: post.id, autora_id: session!.user.id, texto: t })
    setEnviando(false)
    if (error) return setErro(mensagemAmigavel(error, 'não conseguimos publicar o comentário agora.'))
    setTexto('')
    carregar()
    aoMudar()
  }

  async function apagar(id: string) {
    await supabase.from('forum_comentarios').delete().eq('id', id)
    carregar()
    aoMudar()
  }

  return (
    <div className="mt-4 space-y-4 border-t border-linha pt-4">
      {!lista ? (
        <p className="text-sm text-suave">carregando comentários…</p>
      ) : (
        lista.length > 0 && (
          <ul className="space-y-3">
            {lista.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar apelido={c.autora_apelido} fotoPath={c.autora_foto_path} tamanho={36} />
                <div className="min-w-0 flex-1 rounded-2xl bg-fundo px-4 py-2.5 ring-1 ring-linha">
                  <p className="text-sm">
                    <span className="font-titulo font-semibold">{c.autora_apelido}</span>
                    <span className="text-suave"> · {tempoRelativo(c.created_at)}</span>
                    {c.oculto && <span className="ml-2"><Selo tom="alerta">oculto pela curadoria</Selo></span>}
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words">{c.texto}</p>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {c.minha ? (
                      <button type="button" onClick={() => apagar(c.id)} className="text-sm text-suave hover:text-erro">apagar</button>
                    ) : (
                      <DenunciarConteudo tipo="comentario" id={c.id} />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
      {!post.oculto && (
        <form onSubmit={comentar} className="flex items-end gap-2">
          <label htmlFor={`com-${post.id}`} className="sr-only">escreva um comentário</label>
          <textarea
            id={`com-${post.id}`}
            rows={1}
            maxLength={MAX_COMENTARIO}
            placeholder="escreva um comentário…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="min-h-11 flex-1 resize-y rounded-2xl border-2 border-campo bg-fundo px-4 py-2.5 text-texto placeholder:text-suave/80 focus:border-destaque focus:outline-none"
          />
          <Botao type="submit" carregando={enviando} disabled={!texto.trim()}>enviar</Botao>
        </form>
      )}
      {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
    </div>
  )
}

function CartaoPost({ post, aoMudar }: { post: Post; aoMudar: () => void }) {
  const reduzir = useReducedMotion()
  const [curti, setCurti] = useState(post.curti)
  const [curtidas, setCurtidas] = useState(post.curtidas)
  const [abertos, setAbertos] = useState(false)
  const { session } = useAuth()

  useEffect(() => {
    setCurti(post.curti)
    setCurtidas(post.curtidas)
  }, [post.curti, post.curtidas])

  async function alternarCurtida() {
    // otimista: muda na hora e desfaz se der erro
    const novo = !curti
    setCurti(novo)
    setCurtidas((n) => n + (novo ? 1 : -1))
    const { error } = novo
      ? await supabase.from('forum_curtidas').insert({ post_id: post.id, profile_id: session!.user.id })
      : await supabase.from('forum_curtidas').delete().eq('post_id', post.id).eq('profile_id', session!.user.id)
    if (error) {
      setCurti(!novo)
      setCurtidas((n) => n + (novo ? -1 : 1))
    }
  }

  async function apagar() {
    if (!window.confirm('apagar este post? os comentários também somem.')) return
    await supabase.from('forum_posts').delete().eq('id', post.id)
    aoMudar()
  }

  return (
    <Cartao className={`${post.oculto ? 'opacity-70' : ''} ${post.conquista ? 'border-l-4 border-l-coral' : ''}`}>
      <div className="flex items-start gap-3">
        <Avatar apelido={post.autora_apelido} fotoPath={post.autora_foto_path} tamanho={44} />
        <div className="min-w-0 flex-1">
          <p className="font-titulo font-semibold text-texto">{post.autora_apelido}</p>
          <p className="text-xs text-suave">{tempoRelativo(post.created_at)}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {post.conquista && <Selo tom="destaque">conquista</Selo>}
          {post.area && <Selo tom="suave">{post.area}</Selo>}
          {post.oculto && <Selo tom="alerta">oculto pela curadoria</Selo>}
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line break-words text-lg leading-relaxed">{post.texto}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <motion.button
          type="button"
          onClick={alternarCurtida}
          disabled={post.oculto}
          aria-pressed={curti}
          aria-label={`${curti ? 'descurtir' : 'curtir'} (${curtidas} curtidas)`}
          whileTap={reduzir ? undefined : { scale: 0.9 }}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-titulo font-semibold transition-colors disabled:opacity-50 ${
            curti ? 'bg-destaque text-sobre-destaque' : 'text-texto ring-1 ring-campo hover:text-destaque hover:ring-destaque'
          }`}
        >
          <Coracao cheio={curti} />
          {curtidas}
        </motion.button>
        <button
          type="button"
          onClick={() => setAbertos((a) => !a)}
          aria-expanded={abertos}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-titulo font-semibold text-texto ring-1 ring-campo hover:text-destaque hover:ring-destaque"
        >
          <Balao />
          {post.comentarios}
          <span className="sr-only">comentários</span>
          <span aria-hidden className="text-sm font-normal">{abertos ? 'fechar' : 'comentar'}</span>
        </button>
        <span className="ml-auto">
          {post.minha ? (
            <button type="button" onClick={apagar} className="text-sm text-suave hover:text-erro">apagar</button>
          ) : (
            <DenunciarConteudo tipo="post" id={post.id} />
          )}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {abertos && (
          <motion.div
            initial={reduzir ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduzir ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Comentarios post={post} aoMudar={aoMudar} />
          </motion.div>
        )}
      </AnimatePresence>
    </Cartao>
  )
}

export default function Forum() {
  const { perfil, session, curadora } = useAuth()
  const [ordem, setOrdem] = useState<Ordem>('evidencia')
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [texto, setTexto] = useState('')
  const [area, setArea] = useState('')
  const [conquista, setConquista] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState('')
  const pode = perfil?.status === 'aprovado' || curadora

  const carregar = useCallback(async () => {
    if (!pode) return
    const { data, error } = await supabase.rpc('forum_feed', { p_ordem: ordem, p_limite: 50 })
    if (error) setErro(mensagemAmigavel(error))
    setPosts(((data as Post[]) ?? []).map((p) => ({ ...p, curtidas: Number(p.curtidas), comentarios: Number(p.comentarios) })))
  }, [ordem, pode])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function publicar(e: FormEvent) {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return setErro('escreva alguma coisa antes de publicar')
    setPublicando(true)
    setErro('')
    const { error } = await supabase.from('forum_posts').insert({ autora_id: session!.user.id, texto: t, area: area || null, conquista })
    setPublicando(false)
    if (error) return setErro(mensagemAmigavel(error, 'não conseguimos publicar agora. tente de novo.'))
    setTexto('')
    setArea('')
    setConquista(false)
    const destino: Ordem = conquista ? 'conquistas' : 'recentes'
    if (ordem !== destino) setOrdem(destino)
    else carregar()
  }

  if (!pode) {
    return (
      <Pagina titulo="fórum">
        <Titulo>fórum</Titulo>
        <Aviso>o fórum é só para perfis aprovados pela curadoria. assim que o seu for aprovado, é só voltar aqui.</Aviso>
      </Pagina>
    )
  }

  const opcoesArea = [...new Set([...(perfil?.areas ?? []), ...AREAS])]

  return (
    <Pagina titulo="fórum">
      <Titulo sub={<>dúvidas, conquistas, dicas e desabafos.<span role="note" className="mt-2 block text-sm">só mulheres aprovadas veem o que você escreve aqui.</span></>}>fórum</Titulo>

      {perfil && (
        <form onSubmit={publicar} className="mb-10">
          <Cartao>
            <div className="flex gap-3">
              <Avatar apelido={perfil.apelido} fotoPath={perfil.foto_path} tamanho={44} />
              <div className="flex-1">
                <label htmlFor="novo-post" className="sr-only">escreva um post</label>
                <textarea
                  id="novo-post"
                  rows={3}
                  maxLength={MAX_POST}
                  placeholder="compartilhe uma dúvida, uma conquista ou uma dica…"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  className="w-full resize-y rounded-2xl border-2 border-campo bg-fundo px-4 py-3 text-texto placeholder:text-suave/80 focus:border-destaque focus:outline-none"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label htmlFor="area-post" className="sr-only">assunto</label>
                  <select
                    id="area-post"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="min-h-11 rounded-full border-2 border-campo bg-fundo px-4 text-sm text-texto focus:border-destaque"
                  >
                    <option value="">assunto (opcional)</option>
                    {opcoesArea.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold focus-within:outline focus-within:outline-3 focus-within:outline-offset-3 ${conquista ? 'border-destaque bg-destaque text-sobre-destaque' : 'border-campo text-texto hover:border-destaque'}`}>
                    <input type="checkbox" className="sr-only" checked={conquista} onChange={(e) => setConquista(e.target.checked)} />
                    <span aria-hidden>{conquista ? '✓' : '+'}</span> é uma conquista
                  </label>
                  <span className="text-sm text-suave" aria-hidden>{texto.length}/{MAX_POST}</span>
                  <Botao type="submit" className="ml-auto" carregando={publicando} disabled={!texto.trim()}>publicar</Botao>
                </div>
                {erro && <p className="mt-2 text-sm text-erro" role="alert">{erro}</p>}
              </div>
            </div>
          </Cartao>
        </form>
      )}

      <Abas
        rotulo="ordem do fórum"
        atual={ordem}
        aoMudar={setOrdem}
        abas={[
          { id: 'evidencia', rotulo: 'em evidência' },
          { id: 'recentes', rotulo: 'mais recentes' },
          { id: 'conquistas', rotulo: 'conquistas' },
        ]}
      />

      {!posts ? (
        <Carregando />
      ) : posts.length === 0 ? (
        <Vazio titulo="o fórum está esperando o primeiro post">que tal contar uma nova descoberta dessa semana?</Vazio>
      ) : (
        <ul className="space-y-5">
          {posts.map((p) => (
            <motion.li key={p.id} layout="position" transition={{ duration: 0.3 }}>
              <CartaoPost post={p} aoMudar={carregar} />
            </motion.li>
          ))}
        </ul>
      )}
    </Pagina>
  )
}
