import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function Rodape() {
  return (
    <footer className="mt-16 border-t border-linha">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Logo tamanho="text-xl" />
        <nav aria-label="rodapé">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 font-titulo text-sm font-semibold lowercase">
            <li><Link className="text-destaque underline underline-offset-4" to="/feedback">feedback</Link></li>
            <li><Link className="text-texto hover:text-destaque" to="/termo-de-conduta">termo de conduta</Link></li>
            <li><Link className="text-texto hover:text-destaque" to="/privacidade">privacidade</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
