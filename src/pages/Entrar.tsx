import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Aviso, Carregando } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { CampoTexto } from '../components/Campo'
import { Pagina, Titulo } from '../components/Pagina'
import { useAuth } from '../lib/auth'
import { emailSchema } from '../lib/esquemas'
import { supabase } from '../lib/supabase'

export default function Entrar() {
  const { session, perfil, curadora, carregando } = useAuth()
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado'>('idle')

  if (carregando) return <Carregando />
  if (session) return <Navigate to={perfil ? '/minhas-aliadas' : curadora ? '/curadoria' : '/cadastro'} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const v = emailSchema.safeParse(email)
    if (!v.success) return setErro('confira o e-mail')
    setErro('')
    setEstado('enviando')
    const { error } = await supabase.auth.signInWithOtp({
      email: v.data,
      options: { emailRedirectTo: `${window.location.origin}/entrar` },
    })
    if (error) {
      setEstado('idle')
      setErro(
        error.status === 429
          ? 'você pediu vários links seguidos. espere um minuto e tente de novo.'
          : 'não conseguimos enviar o link agora. tente de novo em instantes.',
      )
      return
    }
    setEstado('enviado')
  }

  return (
    <Pagina titulo="entrar" largura="max-w-xl">
      <Titulo sub="sem senha: a gente manda um link de acesso para o seu e-mail.">entrar</Titulo>
      {estado === 'enviado' ? (
        <Aviso tipo="ok">
          <p className="font-semibold">link enviado para {email}.</p>
          <p className="mt-1">abra o e-mail neste mesmo aparelho e clique no link. se não chegar em alguns minutos, olhe o spam.</p>
        </Aviso>
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-6">
          <CampoTexto
            rotulo="seu e-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erro={erro}
          />
          <Botao type="submit" carregando={estado === 'enviando'}>receber link de acesso</Botao>
        </form>
      )}
    </Pagina>
  )
}
