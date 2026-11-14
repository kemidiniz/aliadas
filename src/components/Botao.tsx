import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { Link } from 'react-router-dom'

type Variante = 'principal' | 'secundario' | 'discreto' | 'perigo'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-titulo font-semibold lowercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-11'
const estilos: Record<Variante, string> = {
  principal: 'bg-destaque text-sobre-destaque px-6 py-3 hover:opacity-90',
  secundario: 'border-2 border-destaque text-destaque px-6 py-2.5 hover:bg-superficie',
  discreto: 'text-destaque underline underline-offset-4 px-2 py-2 hover:opacity-80',
  perigo: 'border-2 border-erro text-erro px-6 py-2.5 hover:bg-superficie',
}

export function classeBotao(v: Variante = 'principal', extra = '') {
  return `${base} ${estilos[v]} ${extra}`
}

type Props = HTMLMotionProps<'button'> & { variante?: Variante; carregando?: boolean }

export function Botao({ variante = 'principal', carregando, className = '', children, disabled, ...resto }: Props) {
  const reduzir = useReducedMotion()
  return (
    <motion.button
      whileHover={reduzir || disabled ? undefined : { y: -1 }}
      whileTap={reduzir || disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={classeBotao(variante, className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? 'só um instante…' : (children as React.ReactNode)}
    </motion.button>
  )
}

export function BotaoLink({ to, variante = 'principal', children, className = '' }: { to: string; variante?: Variante; children: React.ReactNode; className?: string }) {
  const reduzir = useReducedMotion()
  return (
    <motion.span className="inline-flex" whileHover={reduzir ? undefined : { y: -1 }} whileTap={reduzir ? undefined : { scale: 0.97 }} transition={{ duration: 0.2 }}>
      <Link to={to} className={classeBotao(variante, className)}>
        {children}
      </Link>
    </motion.span>
  )
}
