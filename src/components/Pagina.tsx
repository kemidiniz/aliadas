import { useEffect, type ReactNode } from "react";

// Container e hierarquia compartilhados; conteúdo legível desde o primeiro frame.
// Larguras por tipo de tela: texto (leitura), form (formulários) e app (painéis).
const LARGURAS = { texto: "max-w-[720px]", form: "max-w-[960px]", app: "max-w-[1200px]" };
export function Pagina({
  titulo,
  children,
  largura = "app",
}: {
  titulo: string;
  children: ReactNode;
  largura?: keyof typeof LARGURAS;
}) {
  useEffect(() => {
    document.title = titulo === "aliadas" ? "aliadas" : `${titulo} · aliadas`;
  }, [titulo]);
  return (
    <div className={`mx-auto w-full ${LARGURAS[largura]} px-5 py-8 sm:py-10`}>
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
      {sub && <p className="mt-2 text-base text-suave">{sub}</p>}
    </header>
  );
}
