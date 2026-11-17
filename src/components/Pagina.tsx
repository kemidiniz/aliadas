import { useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";

// Container e hierarquia compartilhados; conteúdo legível desde o primeiro frame.
// Um container só para o site inteiro, igual ao do cabeçalho e do rodapé:
// o título de toda página começa alinhado ao logo.
export const CONTAINER = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";
export function Pagina({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { hash }=useLocation();
  useEffect(() => {
    if (!hash) return;
    let ativo=true;
    void document.fonts.ready.then(()=>requestAnimationFrame(()=>{
      if (!ativo) return;
      let id=hash.slice(1);try { id=decodeURIComponent(id); } catch { /* hash inválido não interrompe a página */ }
      document.getElementById(id)?.scrollIntoView();
    }));
    return ()=>{ativo=false;};
  },[hash,titulo]);
  useEffect(() => {
    document.title = titulo === "aliadas" ? "aliadas · Uma conversa pode abrir novos caminhos." : `${titulo} · aliadas`;
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
