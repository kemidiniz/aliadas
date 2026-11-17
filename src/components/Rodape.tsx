import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth } from "../lib/auth";

export function Rodape() {
  const { curadora } = useAuth();
  return (
    <footer className="mt-16 border-t border-linha">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo tamanho="text-xl" />
          <p className="mt-3 max-w-xs text-xs text-suave">
            Criada na formação em IA Aplicada da {"{reprograma}"}. A{" "}
            {"{reprograma}"} não administra nem patrocina a plataforma.
          </p>
        </div>
        <nav aria-label="Rodapé">
          {curadora && (
            <Link
              className="mb-3 block text-destaque underline"
              to="/curadoria"
            >
              Administração
            </Link>
          )}
          <ul className="flex flex-wrap gap-x-5 gap-y-2 font-titulo text-sm font-semibold">
            <li>
              <Link
                className="text-destaque underline underline-offset-4"
                to="/feedback"
              >
                Feedback
              </Link>
            </li>
            <li>
              <Link className="text-texto hover:text-destaque" to="/quem-somos">
                Quem somos
              </Link>
            </li>
            <li>
              <Link
                className="text-texto hover:text-destaque"
                to="/termo-de-conduta"
              >
                Termos de uso
              </Link>
            </li>
            <li>
              <Link
                className="text-texto hover:text-destaque"
                to="/privacidade"
              >
                Privacidade
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
