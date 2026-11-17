import { useEffect, type ReactNode } from "react";

// Container e hierarquia compartilhados; conteúdo legível desde o primeiro frame.
// Um container só para o site inteiro, igual ao do cabeçalho e do rodapé:
// o título de toda página começa alinhado ao logo.
export const CONTAINER = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";
export function Pagina({ titulo, children }: { titulo: string; children: ReactNode }) {
  useEffect(() => {
    document.title = titulo === "aliadas" ? "aliadas" : `${titulo} · aliadas`;
  }, [titulo]);
  return <div className={`${CONTAINER} py-8 sm:py-10`}>{children}</div>;
}

// Largura de leitura dentro do container, alinhada à esquerda (sem centralizar)
export const Leitura = ({ children }: { children: ReactNode }) => <div className="max-w-[720px]">{children}</div>;
export const Formulario = ({ children }: { children: ReactNode }) => <div className="max-w-[760px]">{children}</div>;

export function Titulo({
  children,
  sub,
}: {
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <h1 className="font-titulo text-3xl font-bold text-destaque sm:text-4xl">
        {children}
      </h1>
      {sub && <p className="mt-2 text-base text-suave">{sub}</p>}
    </header>
  );
}
