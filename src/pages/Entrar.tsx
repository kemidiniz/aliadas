import { AnimatePresence, motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Aviso, Carregando } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { CampoTexto } from '../components/Campo'
import { Pagina, Titulo } from '../components/Pagina'
import { useAuth } from '../lib/auth'
import { emailSchema } from '../lib/esquemas'
import { supabase } from '../lib/supabase'

type Modo = 'codigo' | 'senha'

export default function Entrar() {
  const { session, perfil, curadora, carregando } = useAuth()
  const [modo, setModo] = useState<Modo>('codigo')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  if (carregando) return <Carregando />
  if (session) return <Navigate to={perfil ? '/minhas-aliadas' : curadora ? '/curadoria' : '/cadastro'} replace />

  function trocarModo(m: Modo) {
    setModo(m)
    setErro('')
    setCodigoEnviado(false)
    setCodigo('')
  }

  function emailValido() {
    const v = emailSchema.safeParse(email)
    if (!v.success) {
      setErro('confira o e-mail')
      return null
    }
    return v.data
  }

  async function enviarCodigo(e?: FormEvent) {
    e?.preventDefault()
    const em = emailValido()
    if (!em) return
    setErro('')
    setOcupado(true)
    // cria a conta no primeiro acesso; o e-mail traz o código e também um link
    const { error } = await supabase.auth.signInWithOtp({
      email: em,
      options: { emailRedirectTo: `${window.location.origin}/entrar` },
    })
    setOcupado(false)
    if (error) {
      setErro(
        error.status === 429
          ? 'você pediu vários códigos seguidos. espere um minuto e tente de novo.'
          : 'não conseguimos enviar o código agora. tente de novo em instantes.',
      )
      return
    }
    setCodigoEnviado(true)
  }

  async function confirmarCodigo(e: FormEvent) {
    e.preventDefault()
    const token = codigo.replace(/\D/g, '')
    if (token.length < 6) return setErro('digite o código que chegou no seu e-mail')
    setErro('')
    setOcupado(true)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    setOcupado(false)
    if (error) setErro('esse código não confere ou já expirou. confira ou peça um novo.')
  }

  async function entrarComSenha(e: FormEvent) {
    e.preventDefault()
    const em = emailValido()
    if (!em) return
    if (!senha) return setErro('digite sua senha')
    setErro('')
    setOcupado(true)
    const { error } = await supabase.auth.signInWithPassword({ email: em, password: senha })
    setOcupado(false)
    if (error) {
      setErro(
        error.status === 429
          ? 'muitas tentativas seguidas. espere um minuto e tente de novo.'
          : 'e-mail ou senha não conferem. se você ainda não criou uma senha, entre com código.',
      )
    }
  }

  const aba = (m: Modo, rotulo: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === m}
      onClick={() => trocarModo(m)}
      className={`min-h-11 flex-1 rounded-full px-4 font-titulo font-semibold lowercase ${
        modo === m ? 'bg-destaque text-sobre-destaque' : 'text-texto hover:text-destaque'
      }`}
    >
      {rotulo}
    </button>
  )

  return (
    <Pagina titulo="entrar" largura="max-w-xl">
      <Titulo sub="primeira vez aqui? entre com código: sua conta é criada na hora.">entrar</Titulo>

      <div role="tablist" aria-label="como entrar" className="mb-8 flex gap-1 rounded-full border-2 border-campo p-1">
        {aba('codigo', 'com código')}
        {aba('senha', 'com senha')}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={modo + String(codigoEnviado)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {modo === 'codigo' && !codigoEnviado && (
            <form onSubmit={enviarCodigo} noValidate className="space-y-6">
              <CampoTexto
                rotulo="seu e-mail"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                erro={erro}
              />
              <Botao type="submit" carregando={ocupado}>receber código</Botao>
            </form>
          )}

          {modo === 'codigo' && codigoEnviado && (
            <form onSubmit={confirmarCodigo} noValidate className="space-y-6">
              <Aviso tipo="ok">
                enviamos um código para <strong>{email}</strong>. se não chegar em alguns minutos, olhe o spam.
              </Aviso>
              <CampoTexto
                rotulo="código"
                ajuda="pode digitar aqui ou clicar no link do e-mail, se estiver no mesmo aparelho."
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                erro={erro}
                className="w-full rounded-xl border-2 border-campo bg-fundo px-4 py-3 text-center font-titulo text-2xl tracking-[0.4em] text-texto focus:border-destaque focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Botao type="submit" carregando={ocupado}>entrar</Botao>
                <Botao type="button" variante="discreto" disabled={ocupado} onClick={() => enviarCodigo()}>
                  enviar outro código
                </Botao>
              </div>
            </form>
          )}

          {modo === 'senha' && (
            <form onSubmit={entrarComSenha} noValidate className="space-y-6">
              <CampoTexto rotulo="seu e-mail" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <CampoTexto rotulo="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} erro={erro} />
              <div className="flex flex-wrap items-center gap-3">
                <Botao type="submit" carregando={ocupado}>entrar</Botao>
                <Botao type="button" variante="discreto" onClick={() => trocarModo('codigo')}>
                  esqueci a senha / não tenho senha
                </Botao>
              </div>
              <p className="text-sm text-suave">a senha é opcional: você pode criar uma em "minha conta" depois de entrar com código.</p>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </Pagina>
  )
}
