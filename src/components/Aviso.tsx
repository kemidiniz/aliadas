import type { ReactNode } from 'react'

export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'erro' | 'ok'; children: ReactNode }) {
  const cor = tipo === 'erro' ? 'border-erro text-erro' : tipo === 'ok' ? 'border-destaque text-texto' : 'border-linha text-texto'
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-2xl border-l-4 bg-superficie px-4 py-3 ${cor}`}>
      {children}
    </div>
  )
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <p role="status" className="py-10 text-center text-suave">
      <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-coral align-middle" aria-hidden />
      {texto}
    </p>
  )
}
