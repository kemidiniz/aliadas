import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useTema } from '../lib/tema'
import { Logo } from './Logo'

function BotaoTema() {
  const { tema, alternar } = useTema()
  const escuro = tema === 'escuro'
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? 'usar tema claro' : 'usar tema escuro'}
      aria-pressed={escuro}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-campo text-destaque hover:border-destaque"
    >
      {/* meia-lua / círculo cheio: formas simples, sem ícones de brilho */}
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
        {escuro ? (
          <circle cx="10" cy="10" r="6" fill="currentColor" />
        ) : (
          <path d="M14.5 13.5A6.5 6.5 0 0 1 7 3.2a6.5 6.5 0 1 0 7.5 10.3Z" fill="currentColor" />
        )}
      </svg>
    </button>
  )
}

export function Cabecalho() {
  const { session, perfil, curadora } = useAuth()
  const [aberto, setAberto] = useState(false)
  const local = useLocation()
  const reduzir = useReducedMotion()

  useEffect(() => {
    setAberto(false)
  }, [local.pathname])

  const links: { to: string; rotulo: string }[] = session
    ? [
        ...(perfil ? [] : [{ to: '/cadastro', rotulo: 'meu cadastro' }]),
        { to: '/minhas-aliadas', rotulo: 'minhas aliadas' },
        { to: '/forum', rotulo: 'fórum' },
        { to: '/meu-pitch', rotulo: 'meu pitch' },
        { to: '/conexoes', rotulo: 'conexões' },
        { to: '/minha-conta', rotulo: 'minha conta' },
        ...(curadora ? [{ to: '/curadoria', rotulo: 'curadoria' }] : []),
      ]
    : [
        { to: '/entrar', rotulo: 'entrar' },
      ]

  const classeLink = ({ isActive }: { isActive: boolean }) =>
    `block rounded-full px-3 py-2 font-titulo font-semibold lowercase ${
      isActive ? 'text-destaque underline decoration-coral decoration-2 underline-offset-8' : 'text-texto hover:text-destaque'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-fundo/85 backdrop-blur-md">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-destaque focus:px-4 focus:py-2 focus:text-sobre-destaque">
        pular para o conteúdo
      </a>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Logo />
        <nav aria-label="principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} className={classeLink}>
                  {l.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <BotaoTema />
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-full border-2 border-campo px-4 font-titulo font-semibold lowercase text-destaque lg:hidden"
            aria-expanded={aberto}
            aria-controls="menu-celular"
            onClick={() => setAberto((a) => !a)}
          >
            {aberto ? 'fechar' : 'menu'}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {aberto && (
          <motion.nav
            id="menu-celular"
            aria-label="principal"
            className="overflow-hidden border-t border-linha lg:hidden"
            initial={reduzir ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduzir ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduzir ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ul className="space-y-1 px-5 py-4 text-lg">
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} className={classeLink}>
                    {l.rotulo}
                  </NavLink>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
