import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

// Entrada sutil do bloco quando ele aparece na tela.
export function Revelar({ children, atraso = 0, className = '' }: { children: ReactNode; atraso?: number; className?: string }) {
  const reduzir = useReducedMotion()
  if (reduzir) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, delay: atraso, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
