import { useEffect, type ReactNode } from "react";

// Container e hierarquia compartilhados; conteúdo legível desde o primeiro frame.
export function Pagina({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = titulo === "aliadas" ? "aliadas" : `${titulo} · aliadas`;
  }, [titulo]);
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:py-14">
      <div className="w-full">{children}</div>
    </div>
  );
}

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
      {sub && <p className="mt-3 text-lg text-suave">{sub}</p>}
    </header>
  );
}
