import { useState } from "react";

// O círculo reserva o espaço. A imagem só aparece depois de decodificada;
// enquanto isso, mostra as iniciais, sem exibir o texto alternativo como erro.
export function FotoRedonda({ src, alternativa, iniciais, tamanho = 64 }: { src?: string | null; alternativa: string; iniciais: string; tamanho?: number }) {
  const [carregada, setCarregada] = useState<string | null>(null);
  const pronta = Boolean(src && carregada === src);
  return <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-coral bg-vinho font-titulo font-semibold text-off-white" style={{ width: tamanho, height: tamanho, fontSize: tamanho * .36 }}>
    <span aria-hidden>{iniciais}</span>
    {src ? <img key={src} src={src} alt={alternativa} width={tamanho} height={tamanho} onLoad={() => setCarregada(src)} onError={() => setCarregada(null)} className={`absolute inset-0 h-full w-full object-cover ${pronta ? "opacity-100" : "opacity-0"}`} /> : <span role="img" aria-label={alternativa} className="sr-only" />}
  </span>;
}
