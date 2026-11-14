import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { LIMITES } from '../lib/esquemas'
import { mensagemAmigavel } from '../lib/erros'
import { Botao } from './Botao'
import { CampoArea } from './Campo'

export function Denunciar({ perfilId, apelido }: { perfilId: string; apelido: string }) {
  const { session } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [erro, setErro] = useState('')

  async function enviar() {
    const m = motivo.trim()
    if (m.length < 5) return setErro('conta em poucas palavras o que aconteceu')
    setEstado('enviando')
    const { error } = await supabase.from('reports').insert({ denunciante_id: session!.user.id, denunciado_id: perfilId, motivo: m })
    if (error) {
      setEstado('erro')
      setErro(mensagemAmigavel(error))
    } else setEstado('ok')
  }

  if (estado === 'ok') return <p className="text-sm text-suave" role="status">denúncia enviada. a curadoria vai analisar com cuidado.</p>
  if (!aberto)
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-sm text-suave underline underline-offset-4 hover:text-destaque">
        denunciar perfil
      </button>
    )
  return (
    <div className="mt-2 space-y-3 rounded-2xl border border-linha p-4">
      <CampoArea
        rotulo={`denunciar ${apelido}`}
        ajuda="só a curadoria lê. a outra pessoa não fica sabendo quem denunciou."
        value={motivo}
        maxLength={LIMITES.denuncia}
        onChange={(e) => setMotivo(e.target.value)}
        erro={erro}
        rows={3}
      />
      <div className="flex gap-2">
        <Botao variante="secundario" onClick={enviar} carregando={estado === 'enviando'}>enviar denúncia</Botao>
        <Botao variante="discreto" onClick={() => setAberto(false)}>cancelar</Botao>
      </div>
    </div>
  )
}
