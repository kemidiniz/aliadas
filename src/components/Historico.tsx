import { useEffect, useRef, useState } from "react";
export function useHistorico(chave = "") {
  const [limite, setLimite] = useState(3);
  useEffect(() => { setLimite(3); }, [chave]);
  return { limite, mais: () => setLimite(n => n + 3), recolher: () => setLimite(3) };
}
export function MaisHistorico({ total, limite, mais, recolher }: { total: number; limite: number; mais: () => void; recolher: () => void }) {
  if (total <= 3) return null;
  return <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
    <span aria-live="polite" className="text-suave">Mostrando {Math.min(total,limite)} de {total}</span>
    {limite < total && <button type="button" onClick={mais} className="font-semibold text-destaque underline underline-offset-4">+ Ver mais</button>}
    {limite > 3 && <button type="button" onClick={recolher} className="font-semibold text-destaque underline underline-offset-4">Mostrar menos</button>}
  </div>;
}
export function RespostaAberta({ texto }: { texto: string }) {
  const [aberta, setAberta] = useState(false);
  const [cortada, setCortada] = useState(false);
  const paragrafo = useRef<HTMLParagraphElement>(null);
  useEffect(()=>{
    const p=paragrafo.current;if(!p||aberta)return;
    const medir=()=>setCortada(p.scrollHeight>p.clientHeight+1);
    medir();const observer=new ResizeObserver(medir);observer.observe(p);return()=>observer.disconnect();
  },[texto,aberta]);
  return <div><p ref={paragrafo} className={`whitespace-pre-wrap break-words ${aberta ? "" : "line-clamp-3"}`}>{texto}</p>{(aberta || cortada) && <button type="button" aria-expanded={aberta} onClick={()=>setAberta(v=>!v)} className="mt-2 text-sm font-semibold text-destaque underline underline-offset-4">{aberta ? "Recolher resposta" : "Ler resposta completa"}</button>}</div>;
}
