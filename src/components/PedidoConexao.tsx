import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { sugerirMensagem, TOTAL_SUGESTOES } from '../lib/assistente'
import { useAuth } from '../lib/auth'
import { mensagemAmigavel } from '../lib/erros'
import { supabase } from '../lib/supabase'
import type { FormaConexao, OndeEsta } from '../lib/tipos'
import { Botao } from './Botao'

type Ela = { id: string; apelido: string; areas: string[]; onde_esta: OndeEsta; formas_conexao: FormaConexao[] }

// botão "quero me conectar" que abre uma mensagem de apresentação sugerida
export function PedidoConexao({ ela, aoEnviar }: { ela: Ela; aoEnviar: () => void }) {
  const { perfil } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [variacao, setVariacao] = useState(0)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  if (!perfil) return null

  function abrir() {
    setTexto(sugerirMensagem(perfil!, ela, 0))
    setVariacao(0)
    setAberto(true)
  }

  function outraSugestao() {
    const v = (variacao + 1) % TOTAL_SUGESTOES
    setVariacao(v)
    setTexto(sugerirMensagem(perfil!, ela, v))
  }

  async function enviar() {
    setEnviando(true)
    setErro('')
    const { error } = await supabase.rpc('pedir_conexao', { p_aliada: ela.id, p_mensagem: texto.trim() || null })
    setEnviando(false)
    if (error) return setErro(mensagemAmigavel(error))
    setAberto(false)
    aoEnviar()
  }

  return (
    <div className="w-full">
      {!aberto && <Botao onClick={abrir}>quero me conectar</Botao>}
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl bg-fundo p-4 ring-1 ring-linha">
              <label htmlFor={`msg-${ela.id}`} className="block font-titulo text-sm font-semibold">
                sua mensagem para {ela.apelido}
              </label>
              <p className="text-xs text-suave">sugerimos um começo a partir das trajetórias de vocês. edite do seu jeito.</p>
              <textarea
                id={`msg-${ela.id}`}
                rows={4}
                maxLength={600}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="w-full resize-y rounded-xl border-2 border-campo bg-fundo px-3 py-2 text-texto focus:border-destaque focus:outline-none"
              />
              <div className="flex items-center justify-between text-xs text-suave">
                <button type="button" onClick={outraSugestao} className="font-titulo font-semibold text-destaque underline underline-offset-4">
                  outra sugestão
                </button>
                <span aria-hidden>{texto.length}/600</span>
              </div>
              {erro && <p className="text-sm text-erro" role="alert">{erro}</p>}
              <div className="flex flex-wrap gap-2">
                <Botao onClick={enviar} carregando={enviando}>enviar pedido</Botao>
                <Botao variante="discreto" onClick={() => setAberto(false)}>cancelar</Botao>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
