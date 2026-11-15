import { AnimatePresence, motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { Aviso } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { CampoArea, CampoTexto, Escolha } from '../components/Campo'
import { Pagina, Titulo } from '../components/Pagina'
import { errosPorCampo, feedbackAvaliacao, feedbackProblema, LIMITES } from '../lib/esquemas'
import { supabase } from '../lib/supabase'
import { PAGINAS_DO_SITE } from '../lib/tipos'

type Caminho = 'avaliacao' | 'problema'

const CAMINHOS: { valor: Caminho; rotulo: string; detalhe: string }[] = [
  { valor: 'avaliacao', rotulo: 'avaliar o site', detalhe: 'conta como foi usar a aliadas' },
  { valor: 'problema', rotulo: 'relatar um problema', detalhe: 'algo quebrou ou ficou confuso' },
]

const vazio = {
  nota_facilidade: 0,
  encontrou_aliadas: '' as '' | 'sim' | 'em_parte' | 'nao',
  mudaria: '',
  problema_descricao: '',
  problema_pagina: '',
  email: '',
}

export default function FeedbackPagina() {
  const [caminho, setCaminho] = useState<Caminho | ''>('')
  const [f, setF] = useState(vazio)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const muda = <K extends keyof typeof vazio>(k: K, v: (typeof vazio)[K]) => setF((x) => ({ ...x, [k]: v }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!caminho) return
    const esquema = caminho === 'avaliacao' ? feedbackAvaliacao : feedbackProblema
    const r = esquema.safeParse({ ...f, tipo: caminho, nota_facilidade: f.nota_facilidade || undefined })
    if (!r.success) return setErros(errosPorCampo(r.error))
    setErros({})
    setEstado('enviando')
    const dados: Record<string, unknown> = { ...r.data }
    for (const k of Object.keys(dados)) if (dados[k] === '') dados[k] = null
    // sem .select(): quem envia não tem (nem precisa ter) permissão de leitura
    const { error } = await supabase.from('feedback').insert(dados)
    setEstado(error ? 'erro' : 'ok')
  }

  if (estado === 'ok') {
    return (
      <Pagina titulo="feedback">
        <Titulo>recebemos!</Titulo>
        <p className="text-xl">obrigada por construir a aliadas com a gente.</p>
        <div className="mt-8">
          <Botao variante="secundario" onClick={() => { setF(vazio); setCaminho(''); setEstado('idle') }}>enviar outro</Botao>
        </div>
      </Pagina>
    )
  }

  return (
    <Pagina titulo="feedback">
      <Titulo sub="nossa comunidade pode evoluir com a sua opinião">feedback</Titulo>
      <form onSubmit={enviar} noValidate className="space-y-8">
        <Escolha nome="caminho" rotulo="o que você quer fazer?" valor={caminho} aoMudar={(v) => { setCaminho(v); setErros({}) }} opcoes={CAMINHOS} />

        <AnimatePresence mode="wait">
          {caminho && (
            <motion.div
              key={caminho}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {caminho === 'avaliacao' && (
                <>
                  <fieldset>
                    <legend className="mb-3 font-titulo text-lg font-semibold">foi fácil usar a aliadas?</legend>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <label key={n} className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 font-titulo font-bold ${f.nota_facilidade === n ? 'border-destaque bg-destaque text-sobre-destaque' : 'border-campo text-texto hover:border-destaque'} focus-within:outline focus-within:outline-3 focus-within:outline-offset-3`}>
                          <input type="radio" name="nota" value={n} className="sr-only" checked={f.nota_facilidade === n} onChange={() => muda('nota_facilidade', n)} />
                          {n}
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 flex justify-between text-sm text-suave"><span>1: muito difícil</span><span>5: muito fácil</span></p>
                    <p className="text-sm text-erro" aria-live="polite">{erros.nota_facilidade}</p>
                  </fieldset>
                  <Escolha
                    nome="encontrou"
                    rotulo="você conseguiu encontrar suas aliadas?"
                    valor={f.encontrou_aliadas}
                    aoMudar={(v) => muda('encontrou_aliadas', v)}
                    erro={erros.encontrou_aliadas}
                    opcoes={[{ valor: 'sim', rotulo: 'sim' }, { valor: 'em_parte', rotulo: 'em parte' }, { valor: 'nao', rotulo: 'não' }]}
                  />
                  <CampoArea rotulo="o que você mudaria? (opcional)" rows={3} maxLength={LIMITES.feedbackCurto} value={f.mudaria} onChange={(e) => muda('mudaria', e.target.value)} erro={erros.mudaria} />
                </>
              )}

              {caminho === 'problema' && (
                <>
                  <CampoArea rotulo="o que aconteceu?" rows={4} maxLength={LIMITES.problema} value={f.problema_descricao} onChange={(e) => muda('problema_descricao', e.target.value)} erro={erros.problema_descricao} />
                  <div className="space-y-2">
                    <label htmlFor="pagina" className="block font-titulo text-lg font-semibold">em que página?</label>
                    <select
                      id="pagina"
                      value={f.problema_pagina}
                      onChange={(e) => muda('problema_pagina', e.target.value)}
                      className="w-full rounded-xl border-2 border-campo bg-fundo px-4 py-3 text-texto focus:border-destaque"
                      aria-describedby="pagina-erro"
                    >
                      <option value="">escolha</option>
                      {PAGINAS_DO_SITE.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <p id="pagina-erro" className="text-sm text-erro" aria-live="polite">{erros.problema_pagina}</p>
                  </div>
                </>
              )}

              <CampoTexto
                rotulo="seu e-mail (opcional)"
                ajuda="se quiser resposta."
                type="email"
                autoComplete="email"
                value={f.email}
                onChange={(e) => muda('email', e.target.value)}
                erro={erros.email}
              />
              {estado === 'erro' && <Aviso tipo="erro">não conseguimos enviar agora. tente de novo em instantes.</Aviso>}
              <Botao type="submit" carregando={estado === 'enviando'}>enviar</Botao>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Pagina>
  )
}
