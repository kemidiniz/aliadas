import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

// Peças visuais reutilizáveis: dão estrutura às telas (nada de texto corrido).

export function Cartao({ children, destaque = false, className = '' }: { children: ReactNode; destaque?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 ${
        destaque ? 'border-2 border-destaque bg-fundo' : 'border border-linha bg-superficie'
      } ${className}`}
    >
      {children}
    </div>
  )
}

type TomSelo = 'neutro' | 'destaque' | 'alerta' | 'suave'
const tons: Record<TomSelo, string> = {
  neutro: 'border border-campo text-texto',
  destaque: 'bg-destaque text-sobre-destaque',
  alerta: 'border border-erro text-erro',
  suave: 'bg-fundo text-suave border border-linha',
}

export function Selo({ children, tom = 'neutro' }: { children: ReactNode; tom?: TomSelo }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-titulo text-xs font-semibold ${tons[tom]}`}>
      {children}
    </span>
  )
}

export function Chips({ itens, rotulo }: { itens: string[]; rotulo?: string }) {
  if (!itens.length) return null
  return (
    <ul aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {itens.map((i) => (
        <li key={i} className="rounded-full bg-fundo px-3 py-1 text-sm text-texto ring-1 ring-linha">
          {i}
        </li>
      ))}
    </ul>
  )
}

// abas com contador (tablist acessível)
export function Abas<T extends string>({
  abas,
  atual,
  aoMudar,
  rotulo,
}: {
  abas: { id: T; rotulo: string; contagem?: number }[]
  atual: T
  aoMudar: (id: T) => void
  rotulo: string
}) {
  const reduzir = useReducedMotion()
  return (
    <div role="tablist" aria-label={rotulo} className="mb-8 flex gap-1 overflow-x-auto rounded-full border-2 border-campo p-1 sm:max-w-lg">
      {abas.map((a) => {
        const ativa = a.id === atual
        return (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => aoMudar(a.id)}
            className={`relative min-h-11 flex-1 whitespace-nowrap rounded-full px-2 sm:px-4 text-sm font-semibold sm:text-base ${
              ativa ? 'text-sobre-destaque' : 'text-texto hover:text-destaque'
            }`}
          >
            {ativa && (
              <motion.span
                layoutId={`aba-${rotulo}`}
                className="absolute inset-0 rounded-full bg-destaque"
                transition={reduzir ? { duration: 0 } : { type: 'spring', bounce: 0.15, duration: 0.35 }}
              />
            )}
            <span className="relative inline-flex items-center gap-2">
              {a.rotulo}
              {a.contagem !== undefined && a.contagem > 0 && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs ${
                    ativa ? 'bg-sobre-destaque text-destaque' : 'bg-coral text-vinho-noite'
                  }`}
                >
                  {a.contagem}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-campo px-6 py-12 text-center">
      <span aria-hidden className="relative mb-5 block h-14 w-20">
        <span className="absolute left-0 top-0 h-14 w-14 rounded-full border-2 border-destaque" />
        <span className="absolute right-0 top-0 h-14 w-14 rounded-full border-2 border-coral" />
      </span>
      <p className="font-titulo text-lg font-semibold">{titulo}</p>
      {children && <div className="mt-2 text-suave">{children}</div>}
    </div>
  )
}

// link com cara de botão (mailto, linkedin…)
export function Acao({ href, children, externo = false }: { href: string; children: ReactNode; externo?: boolean }) {
  return (
    <a
      href={href}
      {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-destaque px-5 font-titulo font-semibold text-destaque transition-colors hover:bg-destaque hover:text-sobre-destaque"
    >
      {children}
    </a>
  )
}

export function tempoRelativo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  const d = Math.floor(s / 86400)
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

// Estado de uma conversa
export type EstadoConversa =
  | "pendente"
  | "aceita"
  | "realizada"
  | "recusada"
  | "expirado";
const BADGE: Record<EstadoConversa, [string, string]> = {
  pendente: ["Pendente", "border border-campo text-texto"],
  aceita: ["Aceita", "bg-superficie text-destaque ring-1 ring-destaque"],
  realizada: ["Realizada", "bg-coral text-vinho-noite"],
  recusada: ["Recusada", "border border-linha text-suave"],
  expirado: ["Expirou", "border border-linha text-suave"],
};
export function Badge({ estado }: { estado: EstadoConversa }) {
  const [t, c] = BADGE[estado];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${c}`}
    >
      {t}
    </span>
  );
}

export function Skeleton({ className = "h-5 w-full" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-lg bg-superficie ${className}`}
    />
  );
}
export function CartaoCarregando() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-3 rounded-3xl border border-linha p-6">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
