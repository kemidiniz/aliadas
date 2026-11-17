import { Link } from "react-router-dom";
import { Logo } from "./Logo";

const LINKS = [
 { to:"/sobre",rotulo:"Sobre nós" },
 { to:"/ajuda",rotulo:"Ajuda e feedback" },
 { to:"/termos-e-privacidade",rotulo:"Termos e privacidade" },
];

export function Rodape() {
  return (
    <footer className="mt-16 border-t border-linha">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-8">
        <Logo tamanho="text-xl" />
        <nav aria-label="Rodapé" className="-mx-4 self-stretch sm:mx-0 sm:self-auto">
          <ul className="flex flex-nowrap items-center justify-between gap-1 whitespace-nowrap text-[14px] font-normal sm:gap-5 sm:font-semibold">
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
