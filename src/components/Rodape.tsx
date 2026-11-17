import { Link } from "react-router-dom";
import { Logo } from "./Logo";

const LINKS = [
  { to: "/quem-somos", rotulo: "Quem somos" },
  { to: "/ajuda", rotulo: "Ajuda e feedback" },
  { to: "/termo-de-conduta", rotulo: "Termos de uso" },
  { to: "/privacidade", rotulo: "Privacidade" },
];

export function Rodape() {
  return (
    <footer className="mt-16 border-t border-linha">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo tamanho="text-xl" />
        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 font-titulo text-sm font-semibold">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link className="text-texto hover:text-destaque" to={l.to}>
                  {l.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-xs text-suave">© 2026 Kemily Diniz</p>
      </div>
    </footer>
  );
}
