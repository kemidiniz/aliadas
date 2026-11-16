import { Link } from 'react-router-dom'

// al·ia·das: o "ia" em coral e mais pesado; o resto em vinho (ou off-white no escuro)
export function Logo({ tamanho = 'text-2xl' }: { tamanho?: string }) {
  return (
    <Link to="/" aria-label="aliadas, página inicial" className={`font-titulo font-bold lowercase tracking-tight ${tamanho}`}>
      <span className="text-logo">al</span>
      <span className="text-coral font-bold">ia</span>
      <span className="text-logo">das</span>
    </Link>
  )
}
