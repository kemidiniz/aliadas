import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Aviso } from '../components/Aviso'
import { Avatar } from '../components/Avatar'
import { Botao, BotaoLink } from '../components/Botao'
import { Caixinha, CampoArea, CampoTexto, Escolha, MultiEscolha } from '../components/Campo'
import { Pagina } from '../components/Pagina'
import { useAuth } from '../lib/auth'
import { emailSchema, LIMITES, linkedinSchema, perfilSchema } from '../lib/esquemas'
import { mensagemAmigavel } from '../lib/erros'
import { enviarFoto, validarFoto } from '../lib/fotos'
import { supabase } from '../lib/supabase'
import { AREAS, ROTULO_FORMA, ROTULO_ONDE_ESTA, type FormaConexao, type OndeEsta } from '../lib/tipos'

type Dados = {
  apelido: string
  de_onde_vem: string
  onde_esta: OndeEsta | ''
  areas: string[]
  querOutra: boolean
  outraArea: string
  formas_conexao: FormaConexao[]
  email: string
  linkedin_url: string
  autodeclaracao: boolean
  aceita_ser_recomendada: boolean
  entende_contato_pos_aceite: boolean
  sabe_que_pode_apagar: boolean
  aceita_termo_conduta: boolean
}

type Etapa = {
  chave: string
  render: () => ReactNode
  validar: () => string | null
}

const OUTRA = '__outra__'

export default function Cadastro() {
  const { session, perfil, recarregar } = useAuth()
  const reduzir = useReducedMotion()
  const [i, setI] = useState(0)
  const [direcao, setDirecao] = useState(1)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const [d, setD] = useState<Dados>({
    apelido: '',
    de_onde_vem: '',
    onde_esta: '',
    areas: [],
    querOutra: false,
    outraArea: '',
    formas_conexao: [],
    email: session?.user.email ?? '',
    linkedin_url: '',
    autodeclaracao: false,
    aceita_ser_recomendada: false,
    entende_contato_pos_aceite: false,
    sabe_que_pode_apagar: false,
    aceita_termo_conduta: false,
  })
  const muda = <K extends keyof Dados>(k: K, v: Dados[K]) => setD((x) => ({ ...x, [k]: v }))

  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa) }, [previa])

  // leva o foco para o primeiro campo de cada tela (teclado e leitor de tela)
  useEffect(() => {
    const el = areaRef.current?.querySelector<HTMLElement>('input, textarea, button')
    el?.focus({ preventScroll: true })
  }, [i])

  if (perfil) {
    return (
      <Pagina titulo="cadastro" largura="max-w-xl">
        <h1 className="font-titulo text-3xl font-bold text-destaque">recebemos seu cadastro</h1>
        <p className="mt-4 text-lg">
          {perfil.status === 'pendente'
            ? 'a curadoria vai olhar seu perfil com carinho. quando ele for aprovado, a gente já procura suas aliadas.'
            : 'seu perfil já passou pela curadoria.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <BotaoLink to="/minhas-aliadas">minhas aliadas</BotaoLink>
          <BotaoLink to="/recomendacoes" variante="secundario">ver recomendações</BotaoLink>
        </div>
      </Pagina>
    )
  }

  const areasFinais = () => [...d.areas, ...(d.querOutra && d.outraArea.trim() ? [d.outraArea.trim()] : [])]

  const campo = (k: 'apelido' | 'de_onde_vem' | 'onde_esta' | 'formas_conexao') => () => {
    const r = perfilSchema.shape[k].safeParse(d[k])
    return r.success ? null : r.error.issues[0].message
  }

  const etapas: Etapa[] = [
    {
      chave: 'apelido',
      validar: campo('apelido'),
      render: () => (
        <CampoTexto
          rotulo="como você quer aparecer?"
          ajuda="pode ser seu primeiro nome ou um apelido. é assim que suas aliadas vão te ver."
          value={d.apelido}
          maxLength={LIMITES.apelido}
          autoComplete="nickname"
          onChange={(e) => muda('apelido', e.target.value)}
          erro={erro}
        />
      ),
    },
    {
      chave: 'foto',
      validar: () => null,
      render: () => (
        <div className="space-y-4">
          <p className="font-titulo text-lg font-semibold">quer colocar uma foto?</p>
          <p className="text-sm text-suave">opcional. JPG, PNG ou WebP até 2 MB. ela só aparece para outras pessoas depois que seu perfil for aprovado.</p>
          <div className="flex items-center gap-5">
            <Avatar apelido={d.apelido || 'você'} previa={previa} tamanho={96} />
            <div className="flex flex-col gap-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-2 border-destaque px-5 font-titulo font-semibold lowercase text-destaque focus-within:outline focus-within:outline-3 focus-within:outline-offset-3">
                {foto ? 'trocar foto' : 'escolher foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const problema = validarFoto(f)
                    if (problema) return setErro(problema)
                    setErro('')
                    setFoto(f)
                    setPrevia(URL.createObjectURL(f))
                  }}
                />
              </label>
              {foto && (
                <button type="button" className="text-sm text-suave underline underline-offset-4" onClick={() => { setFoto(null); setPrevia(null) }}>
                  remover foto
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-erro" aria-live="polite">{erro}</p>
          <p className="text-sm text-suave">sem foto, mostramos suas iniciais.</p>
        </div>
      ),
    },
    {
      chave: 'de_onde_vem',
      validar: campo('de_onde_vem'),
      render: () => (
        <CampoArea
          rotulo="de onde você vem?"
          ajuda="sua formação, outra profissão, sua cidade, o que fizer sentido pra você."
          value={d.de_onde_vem}
          maxLength={LIMITES.de_onde_vem}
          onChange={(e) => muda('de_onde_vem', e.target.value)}
          erro={erro}
        />
      ),
    },
    {
      chave: 'onde_esta',
      validar: campo('onde_esta'),
      render: () => (
        <Escolha
          nome="onde_esta"
          rotulo="onde você está agora?"
          valor={d.onde_esta}
          aoMudar={(v) => muda('onde_esta', v)}
          erro={erro}
          opcoes={(Object.keys(ROTULO_ONDE_ESTA) as OndeEsta[]).map((v) => ({ valor: v, rotulo: ROTULO_ONDE_ESTA[v] }))}
        />
      ),
    },
    {
      chave: 'areas',
      validar: () => {
        if (d.querOutra && d.outraArea.trim().length < 2) return 'escreva qual é a outra área'
        const r = perfilSchema.shape.areas.safeParse(areasFinais())
        return r.success ? null : r.error.issues[0].message
      },
      render: () => (
        <div className="space-y-4">
          <MultiEscolha
            rotulo="quais áreas te interessam?"
            ajuda="pode escolher mais de uma."
            valores={[...d.areas, ...(d.querOutra ? [OUTRA] : [])]}
            aoMudar={(v) => setD((x) => ({ ...x, areas: v.filter((a) => a !== OUTRA), querOutra: v.includes(OUTRA) }))}
            opcoes={[...AREAS.map((a) => ({ valor: a as string, rotulo: a })), { valor: OUTRA, rotulo: 'outra' }]}
            erro={d.querOutra ? undefined : erro}
          />
          {d.querOutra && (
            <CampoTexto
              rotulo="qual outra área?"
              value={d.outraArea}
              maxLength={LIMITES.area}
              onChange={(e) => muda('outraArea', e.target.value)}
              erro={erro}
            />
          )}
        </div>
      ),
    },
    {
      chave: 'formas_conexao',
      validar: campo('formas_conexao'),
      render: () => (
        <MultiEscolha
          rotulo="como você prefere se conectar?"
          ajuda="pode escolher mais de uma."
          valores={d.formas_conexao}
          aoMudar={(v) => muda('formas_conexao', v)}
          erro={erro}
          opcoes={(Object.keys(ROTULO_FORMA) as FormaConexao[]).map((v) => ({ valor: v, rotulo: ROTULO_FORMA[v] }))}
        />
      ),
    },
    {
      chave: 'contato',
      validar: () => {
        if (!emailSchema.safeParse(d.email).success) return 'confira o e-mail'
        const l = linkedinSchema.safeParse(d.linkedin_url)
        return l.success ? null : l.error.issues[0].message
      },
      render: () => (
        <div className="space-y-6">
          <Aviso>
            seu contato <strong>só aparece</strong> para outra pessoa depois que vocês duas aceitarem a conexão. a curadoria confere o linkedin para manter a comunidade segura.
          </Aviso>
          <CampoTexto rotulo="e-mail para contato" type="email" autoComplete="email" value={d.email} onChange={(e) => muda('email', e.target.value)} />
          <CampoTexto
            rotulo="link do seu linkedin"
            type="url"
            inputMode="url"
            placeholder="https://www.linkedin.com/in/…"
            value={d.linkedin_url}
            onChange={(e) => muda('linkedin_url', e.target.value)}
            erro={erro}
          />
        </div>
      ),
    },
    {
      chave: 'consentimentos',
      validar: () =>
        d.autodeclaracao && d.entende_contato_pos_aceite && d.sabe_que_pode_apagar && d.aceita_termo_conduta
          ? null
          : 'faltam caixas obrigatórias',
      render: () => (
        <div className="space-y-3">
          <p className="font-titulo text-lg font-semibold">antes de terminar</p>
          <p className="text-sm text-suave">leia com calma. nenhuma caixa vem marcada.</p>
          <Caixinha obrigatoria marcado={d.autodeclaracao} aoMudar={(v) => muda('autodeclaracao', v)}>
            sou mulher (cis ou trans) ou pessoa não binária e concordo com o{' '}
            <Link to="/termo-de-conduta" target="_blank" className="text-destaque underline underline-offset-4">termo de conduta</Link>.
          </Caixinha>
          <Caixinha marcado={d.aceita_ser_recomendada} aoMudar={(v) => muda('aceita_ser_recomendada', v)}>
            aceito ser recomendada como aliada para outras mulheres (dá para mudar depois em "minha conta").
          </Caixinha>
          <Caixinha obrigatoria marcado={d.entende_contato_pos_aceite} aoMudar={(v) => muda('entende_contato_pos_aceite', v)}>
            entendo que meu e-mail e linkedin só aparecem para outra pessoa depois que nós duas aceitarmos a conexão.
          </Caixinha>
          <Caixinha obrigatoria marcado={d.sabe_que_pode_apagar} aoMudar={(v) => muda('sabe_que_pode_apagar', v)}>
            sei que posso apagar minha conta e todos os meus dados quando quiser.
          </Caixinha>
          <Caixinha obrigatoria marcado={d.aceita_termo_conduta} aoMudar={(v) => muda('aceita_termo_conduta', v)}>
            li e aceito o{' '}
            <Link to="/termo-de-conduta" target="_blank" className="text-destaque underline underline-offset-4">termo de conduta</Link>{' '}
            e a{' '}
            <Link to="/privacidade" target="_blank" className="text-destaque underline underline-offset-4">política de privacidade</Link>.
          </Caixinha>
          <p className="text-sm text-erro" aria-live="polite">{erro}</p>
        </div>
      ),
    },
  ]

  const etapa = etapas[i]
  const ultima = i === etapas.length - 1

  function ir(delta: number) {
    setErro('')
    setDirecao(delta)
    setI((n) => Math.min(Math.max(n + delta, 0), etapas.length - 1))
  }

  async function avancar(e: FormEvent) {
    e.preventDefault()
    const problema = etapa.validar()
    if (problema) return setErro(problema)
    if (!ultima) return ir(1)

    setEnviando(true)
    setErro('')
    try {
      let foto_path: string | null = null
      if (foto) {
        try {
          foto_path = await enviarFoto(session!.user.id, foto)
        } catch {
          setEnviando(false)
          setErro('não conseguimos enviar a foto. volte e tente outra, ou siga sem foto.')
          return
        }
      }
      const { error } = await supabase.rpc('salvar_cadastro', {
        perfil: {
          apelido: d.apelido,
          foto_path,
          de_onde_vem: d.de_onde_vem,
          onde_esta: d.onde_esta,
          areas: areasFinais(),
          formas_conexao: d.formas_conexao,
        },
        consentimento: {
          autodeclaracao: d.autodeclaracao,
          aceita_ser_recomendada: d.aceita_ser_recomendada,
          entende_contato_pos_aceite: d.entende_contato_pos_aceite,
          sabe_que_pode_apagar: d.sabe_que_pode_apagar,
          aceita_termo_conduta: d.aceita_termo_conduta,
        },
        contato: { email: d.email, linkedin_url: d.linkedin_url },
      })
      if (error) throw error
      await recarregar()
    } catch (err) {
      setErro(mensagemAmigavel(err, 'não conseguimos salvar agora. seus dados continuam aqui: tente de novo.'))
    } finally {
      setEnviando(false)
    }
  }

  const deslocamento = reduzir ? 0 : 32
  const progresso = Math.round(((i + 1) / etapas.length) * 100)

  return (
    <Pagina titulo="cadastro" largura="max-w-xl">
      <div className="mb-8">
        <div className="flex items-baseline justify-between">
          <h1 className="font-titulo text-2xl font-bold text-destaque">seu cadastro</h1>
          <span className="text-sm text-suave">{i + 1} de {etapas.length}</span>
        </div>
        <div
          role="progressbar"
          aria-label="progresso do cadastro"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progresso}
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-linha"
        >
          <motion.div className="h-full rounded-full bg-coral" animate={{ width: `${progresso}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      <form onSubmit={avancar} noValidate>
        <div ref={areaRef} className="min-h-72">
          <AnimatePresence mode="wait" custom={direcao}>
            <motion.div
              key={etapa.chave}
              custom={direcao}
              initial={{ opacity: 0, x: direcao * deslocamento }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direcao * deslocamento }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {etapa.render()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          {i > 0 ? (
            <Botao type="button" variante="discreto" onClick={() => ir(-1)}>voltar</Botao>
          ) : <span />}
          <div className="flex gap-2">
            {etapa.chave === 'foto' && !foto && (
              <Botao type="button" variante="secundario" onClick={() => ir(1)}>pular</Botao>
            )}
            <Botao type="submit" carregando={enviando}>{ultima ? 'enviar cadastro' : 'continuar'}</Botao>
          </div>
        </div>
      </form>
    </Pagina>
  )
}
