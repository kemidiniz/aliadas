import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

// Transição suave entre páginas (300 ms) e título da aba.
export function Pagina({ titulo, children, largura = 'max-w-3xl' }: { titulo: string; children: ReactNode; largura?: string }) {
  const reduzir = useReducedMotion()
  useEffect(() => {
    document.title = titulo === 'aliadas' ? 'aliadas' : `${titulo} · aliadas`
  }, [titulo])
  return (
    <motion.div
      initial={reduzir ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`mx-auto w-full ${largura} px-5 py-10 sm:py-14`}
    >
      {children}
    </motion.div>
  )
}

export function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="font-titulo text-3xl font-bold text-destaque sm:text-4xl">{children}</h1>
      {sub && <p className="mt-3 text-lg text-suave">{sub}</p>}
    </header>
  )
}
