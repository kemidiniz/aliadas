import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Perfil } from './tipos'

type AuthCtx = {
  session: Session | null
  perfil: Perfil | null
  curadora: boolean
  carregando: boolean
  recarregar: () => Promise<void>
  sair: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [curadora, setCuradora] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const carregarDados = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null)
      setCuradora(false)
      return
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('roles').select('role').eq('user_id', s.user.id).eq('role', 'curadora').maybeSingle(),
    ])
    setPerfil((p as Perfil) ?? null)
    setCuradora(Boolean(r))
  }, [])

  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return
      setSession(data.session)
      await carregarDados(data.session)
      if (ativo) setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s)
      // fora do callback para não travar o cliente do Supabase
      setTimeout(() => carregarDados(s), 0)
    })
    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [carregarDados])

  const recarregar = useCallback(() => carregarDados(session), [carregarDados, session])
  const sair = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <Ctx.Provider value={{ session, perfil, curadora, carregando, recarregar, sair }}>{children}</Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fora do AuthProvider')
  return c
}
