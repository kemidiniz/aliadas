import { AnimatePresence, motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { Aviso } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { CampoArea, CampoTexto, Escolha } from '../components/Campo'
import { Pagina, Titulo, Leitura } from '../components/Pagina'
import { errosPorCampo, feedbackAvaliacao, feedbackDuvida, feedbackProblema, LIMITES } from '../lib/esquemas'
import { FAQ_AJUDA } from '../lib/faq'
import { mensagemAmigavel } from '../lib/erros'
import { supabase } from '../lib/supabase'
import { PAGINAS_DO_SITE } from '../lib/tipos'

type Caminho = 'duvida' | 'avaliacao' | 'problema'

const CAMINHOS: { valor: Caminho; rotulo: string; detalhe: string }[] = [
  { valor: 'duvida', rotulo: 'Tirar uma dúvida', detalhe: 'Respondemos em até 2 dias úteis.' },
  { valor: 'avaliacao', rotulo: 'Avaliar o site', detalhe: 'Conta como foi usar a aliadas' },
  { valor: 'problema', rotulo: 'Relatar um problema', detalhe: 'Algo quebrou ou ficou confuso' },
]

const vazio = {
  nota_facilidade: 0,
  encontrou_aliadas: '' as '' | 'sim' | 'em_parte' | 'nao',
  mudaria: '',
  problema_descricao: '',
  problema_pagina: '',
  mensagem: '',
  email: '',
}

export default function FeedbackPagina() {
  const [caminho, setCaminho] = useState<Caminho | ''>('')
  const [f, setF] = useState(vazio)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [msgErro, setMsgErro] = useState('')
  const muda = <K extends keyof typeof vazio>(k: K, v: (typeof vazio)[K]) => setF((x) => ({ ...x, [k]: v }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!caminho) return
    const esquema = caminho === 'avaliacao' ? feedbackAvaliacao : caminho === 'duvida' ? feedbackDuvida : feedbackProblema
    const r = esquema.safeParse({ ...f, tipo: caminho, nota_facilidade: f.nota_facilidade || undefined })
    if (!r.success) return setErros(errosPorCampo(r.error))
    setErros({})
    setEstado('enviando')
    const dados: Record<string, unknown> = { ...r.data }
    for (const k of Object.keys(dados)) if (dados[k] === '') dados[k] = null
    // sem .select(): quem envia não tem (nem precisa ter) permissão de leitura
    const { error } = await supabase.from('feedback').insert(dados)
    setMsgErro(error ? mensagemAmigavel(error, 'Não conseguimos enviar agora. Tente de novo em instantes.') : '')
    setEstado(error ? 'erro' : 'ok')
  }

  if (estado === 'ok') {
    return (
      <Pagina titulo="Ajuda e feedback">
      <Leitura>
        <Titulo>Recebemos!</Titulo>
        <p className="text-suave">Obrigada por construir a aliadas com a gente.</p>
        <div className="mt-8">
          <Botao variante="secundario" onClick={() => { setF(vazio); setCaminho(''); setEstado('idle') }}>Enviar outro</Botao>
        </div>
      </Leitura>
    </Pagina>
    )
  }

  return (
    <Pagina titulo="Ajuda e feedback">
      <Leitura>
      <Titulo sub="Respostas rápidas e um jeito de falar com a gente.">Ajuda e feedback</Titulo>
      <section aria-labelledby="faq-ajuda" className="mb-12">
        <h2 id="faq-ajuda" className="text-xl">Perguntas frequentes</h2>
        <div className="mt-4 divide-y divide-linha border-y border-linha">
          {FAQ_AJUDA.map((x) => (
            <details key={x.q} className="faq group">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 font-semibold">
                {x.q}
                <span aria-hidden className="text-xl text-destaque transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 text-suave">{x.a}</p>
            </details>
          ))}
        </div>
      </section>
      <h2 className="mb-6 text-xl">Não achou? Fale com a gente</h2>
      <form onSubmit={enviar} noValidate className="space-y-8">
        <Escolha nome="caminho" rotulo="O que você quer fazer?" valor={caminho} aoMudar={(v) => { setCaminho(v); setErros({}) }} opcoes={CAMINHOS} />

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
                    <legend className="mb-3 font-titulo text-lg font-semibold">Foi fácil usar a aliadas?</legend>
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
                    rotulo="Você conseguiu se conectar com alguém?"
                    valor={f.encontrou_aliadas}
                    aoMudar={(v) => muda('encontrou_aliadas', v)}
                    erro={erros.encontrou_aliadas}
                    opcoes={[{ valor: 'sim', rotulo: 'Sim' }, { valor: 'em_parte', rotulo: 'Em parte' }, { valor: 'nao', rotulo: 'Não' }]}
                  />
                  <CampoArea rotulo="O que você mudaria? (opcional)" rows={3} maxLength={LIMITES.feedbackCurto} value={f.mudaria} onChange={(e) => muda('mudaria', e.target.value)} erro={erros.mudaria} />
                </>
              )}

              {caminho === 'duvida' && (
                <CampoArea rotulo="Sua dúvida" ajuda="Respondemos em até 2 dias úteis." rows={4} maxLength={1000} value={f.mensagem} onChange={(e) => muda('mensagem', e.target.value)} erro={erros.mensagem} />
              )}

              {caminho === 'problema' && (
                <>
                  <CampoArea rotulo="O que aconteceu?" rows={4} maxLength={LIMITES.problema} value={f.problema_descricao} onChange={(e) => muda('problema_descricao', e.target.value)} erro={erros.problema_descricao} />
                  <div className="space-y-2">
                    <label htmlFor="pagina" className="block font-titulo text-lg font-semibold">Em que página?</label>
                    <select
                      id="pagina"
                      value={f.problema_pagina}
                      onChange={(e) => muda('problema_pagina', e.target.value)}
                      className="w-full rounded-xl border-2 border-campo bg-fundo px-4 py-3 text-texto focus:border-destaque"
                      aria-describedby="pagina-erro"
                    >
                      <option value="">Escolha</option>
                      {PAGINAS_DO_SITE.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <p id="pagina-erro" className="text-sm text-erro" aria-live="polite">{erros.problema_pagina}</p>
                  </div>
                </>
              )}

              <CampoTexto
                rotulo={caminho === 'duvida' ? 'Seu e-mail' : 'Seu e-mail (opcional)'}
                ajuda={caminho === 'duvida' ? 'Para te responder.' : 'Opcional. Usamos só para responder esta mensagem.'}
                type="email"
                autoComplete="email"
                value={f.email}
                onChange={(e) => muda('email', e.target.value)}
                erro={erros.email}
              />
              {estado === 'erro' && <Aviso tipo="erro">{msgErro}</Aviso>}
              <Botao type="submit" carregando={estado === 'enviando'}>Enviar</Botao>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Leitura>
    </Pagina>
  )
}
