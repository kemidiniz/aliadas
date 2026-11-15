import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Botao } from '../components/Botao'
import { CampoArea, CampoTexto, Escolha } from '../components/Campo'
import { Pagina, Titulo } from '../components/Pagina'
import { Cartao } from '../components/ui'
import { montarPitch, OBJETIVOS_PITCH, type RespostasPitch } from '../lib/assistente'
import { useAuth } from '../lib/auth'

// rascunho guardado só neste aparelho (localStorage); nada vai para o servidor
const CHAVE = 'aliadas-meu-pitch'

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false)
  return (
    <Botao
      variante="secundario"
      onClick={async () => {
        await navigator.clipboard.writeText(texto)
        setOk(true)
        setTimeout(() => setOk(false), 2000)
      }}
    >
      {ok ? 'copiado!' : 'copiar'}
    </Botao>
  )
}

export default function MeuPitch() {
  const { perfil } = useAuth()
  const [r, setR] = useState<RespostasPitch>(() => {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) {
      try {
        return JSON.parse(salvo) as RespostasPitch
      } catch { /* ignora rascunho estragado */ }
    }
    return {
      nome: perfil?.apelido ?? '',
      antes: perfil?.de_onde_vem ?? '',
      agora: '',
      traz: '',
      busca: perfil?.onde_esta === 'estudando' ? 'estagio' : 'primeira_vaga',
      area: perfil?.areas?.[0] ?? '',
    }
  })
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(r))
  }, [r])

  const muda = <K extends keyof RespostasPitch>(k: K, v: RespostasPitch[K]) => setR((x) => ({ ...x, [k]: v }))
  const pitch = useMemo(() => montarPitch(r), [r])
  const podeMontar = r.antes.trim().length > 2 && r.agora.trim().length > 2

  return (
    <Pagina titulo="meu pitch">
      <Titulo sub="responda 3 perguntas e saia com um pitch de 30 segundos e um texto para o seu linkedin.">meu pitch</Titulo>

      <div className="grid gap-8 lg:grid-cols-2">
        <Cartao className="space-y-6">
          <CampoTexto rotulo="como você quer se apresentar" value={r.nome} maxLength={40} onChange={(e) => muda('nome', e.target.value)} />
          <CampoArea
            rotulo="1. de onde você vem?"
            ajuda="sua formação ou profissão anterior. ex.: fui professora de matemática por 6 anos"
            rows={2}
            maxLength={200}
            value={r.antes}
            onChange={(e) => muda('antes', e.target.value)}
          />
          <CampoArea
            rotulo="2. o que você está fazendo agora em tecnologia?"
            ajuda="o que estuda, um projeto, um curso. ex.: estou estudando sql e montei um painel com dados públicos"
            rows={2}
            maxLength={200}
            value={r.agora}
            onChange={(e) => muda('agora', e.target.value)}
          />
          <CampoArea
            rotulo="3. o que você traz da sua experiência anterior?"
            ajuda="ex.: facilidade para explicar coisas difíceis, organização, atendimento a pessoas"
            rows={2}
            maxLength={160}
            value={r.traz}
            onChange={(e) => muda('traz', e.target.value)}
          />
          <CampoTexto rotulo="área" value={r.area} maxLength={60} onChange={(e) => muda('area', e.target.value)} />
          <Escolha
            nome="busca"
            rotulo="o que você está buscando?"
            valor={r.busca}
            aoMudar={(v) => muda('busca', v)}
            opcoes={Object.entries(OBJETIVOS_PITCH).map(([valor, rotulo]) => ({ valor, rotulo }))}
          />
          <Botao onClick={() => setPronto(true)} disabled={!podeMontar}>montar meu pitch</Botao>
          {!podeMontar && <p className="text-sm text-suave">responda pelo menos as perguntas 1 e 2.</p>}
        </Cartao>

        <AnimatePresence>
          {pronto && podeMontar && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6" aria-live="polite">
              <Cartao destaque className="space-y-3">
                <p className="font-titulo text-sm font-semibold lowercase text-destaque">para falar (cerca de 30 segundos)</p>
                <p className="text-lg leading-relaxed">{pitch.fala}</p>
                <Copiar texto={pitch.fala} />
              </Cartao>
              <Cartao className="space-y-3">
                <p className="font-titulo text-sm font-semibold lowercase text-destaque">para o "sobre" do linkedin</p>
                <p className="leading-relaxed">{pitch.linkedin}</p>
                <Copiar texto={pitch.linkedin} />
              </Cartao>
              <Cartao className="space-y-3">
                <p className="font-titulo text-sm font-semibold lowercase text-destaque">sugestão de título</p>
                <p>{pitch.titulo}</p>
                <Copiar texto={pitch.titulo} />
              </Cartao>
              <p className="text-sm text-suave">dica: leia em voz alta, ajuste as palavras para soarem como você e treine com uma aliada.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Pagina>
  )
}
