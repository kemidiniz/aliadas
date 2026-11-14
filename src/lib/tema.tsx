import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Tema = 'claro' | 'escuro'
const CHAVE = 'aliadas-tema'
const Ctx = createContext<{ tema: Tema; alternar: () => void } | null>(null)

function temaInicial(): Tema {
  const salvo = localStorage.getItem(CHAVE)
  if (salvo === 'claro' || salvo === 'escuro') return salvo
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro')
  }, [tema])

  // segue o sistema enquanto a pessoa não escolheu manualmente
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const ouvir = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(CHAVE)) setTema(e.matches ? 'escuro' : 'claro')
    }
    mq.addEventListener('change', ouvir)
    return () => mq.removeEventListener('change', ouvir)
  }, [])

  const alternar = () =>
    setTema((t) => {
      const novo = t === 'escuro' ? 'claro' : 'escuro'
      localStorage.setItem(CHAVE, novo)
      return novo
    })

  return <Ctx.Provider value={{ tema, alternar }}>{children}</Ctx.Provider>
}

export function useTema() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTema fora do TemaProvider')
  return c
}
