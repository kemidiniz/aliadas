import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Carregando } from './Aviso'
import { Botao } from './Botao'
import { Pagina, Titulo } from './Pagina'

// Guarda de rota. É só conforto de navegação: quem protege os dados é o RLS.
export function Protegida({ children, precisaPerfil = true, apenasCuradora = false }: { children: ReactNode; precisaPerfil?: boolean; apenasCuradora?: boolean }) {
  const { session, perfil, curadora, carregando, erroPerfil, recarregar } = useAuth()
  const local = useLocation()
  if (carregando) return <Carregando />
  if (!session) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  if (erroPerfil && !perfil) return <Pagina titulo="Tentar novamente"><Titulo>Não conseguimos carregar sua conta</Titulo><p className="mb-5 text-suave">Confira sua conexão e tente novamente.</p><Botao onClick={()=>void recarregar()}>Tentar novamente</Botao></Pagina>
  if (apenasCuradora && !curadora) return <Navigate to="/" replace />
  if (precisaPerfil && !perfil && !curadora) return <Navigate to="/cadastro" replace />
  return <>{children}</>
}
