import { useId, useState } from "react";
import { HABILIDADES } from "../lib/habilidades";
import { CampoTexto } from "./Campo";
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
export function EscolhaHabilidades({ valores, aoMudar, max = 8, rotulo = "Posso ajudar com", ajuda = "Escolha o que você sabe fazer e toparia compartilhar numa conversa." }: { valores: string[]; aoMudar: (v: string[]) => void; max?: number; rotulo?: string; ajuda?: string }) {
  const [busca, setBusca] = useState("");
  const id = useId();
  const filtradas = HABILIDADES.filter(h => normalizar([h.nome, h.grupo, ...h.sinonimos].join(" ")).includes(normalizar(busca.trim())));
  return <fieldset className="min-w-0 space-y-3" aria-describedby={`${id}-ajuda`}>
    <legend className="mb-2 text-sm font-semibold">{rotulo}</legend>
    <p id={`${id}-ajuda`} className="text-sm text-suave">{ajuda}</p>
    {!!valores.length && <ul aria-label="Habilidades escolhidas" className="flex flex-wrap gap-2">{valores.map(v => <li key={v}><button type="button" aria-label={`Remover ${HABILIDADES.find(h => h.id === v)?.nome ?? v}`} onClick={() => aoMudar(valores.filter(x => x !== v))} className="rounded-full border border-destaque bg-superficie px-3 py-2 text-sm">{HABILIDADES.find(h => h.id === v)?.nome ?? v}<span aria-hidden className="ml-2">×</span></button></li>)}</ul>}
    <details className="rounded-xl border border-campo bg-fundo">
      <summary className="cursor-pointer px-4 py-3 font-medium">Escolher habilidades <span className="ml-2 text-sm font-normal text-suave">{valores.length} de {max}</span></summary>
      <div className="space-y-3 border-t border-linha p-3">
        <CampoTexto rotulo="Buscar habilidades" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Ex.: entrevista, dados, portfólio" />
        <div className="max-h-72 space-y-4 overflow-y-auto overscroll-contain">
          {[...new Set(filtradas.map(h => h.grupo))].map(grupo => <fieldset key={grupo}>
            <legend className="mb-2 text-sm font-semibold">{grupo}</legend>
            {filtradas.filter(h => h.grupo === grupo).map(h => <label key={h.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-superficie">
              <input type="checkbox" className="mt-1 accent-vinho" checked={valores.includes(h.id)} disabled={!valores.includes(h.id) && valores.length >= max} onChange={() => aoMudar(valores.includes(h.id) ? valores.filter(v => v !== h.id) : [...valores, h.id])} />
              <span><span className="block text-sm font-semibold">{h.nome}</span><span className="block text-xs text-suave">{h.descricao}</span></span>
            </label>)}
          </fieldset>)}
          {!filtradas.length && <p className="text-sm text-suave">Nenhuma habilidade encontrada. Tente outra palavra.</p>}
        </div>
      </div>
    </details>
    <p className="sr-only" role="status">{valores.length} de {max} habilidades escolhidas</p>
  </fieldset>;
}
