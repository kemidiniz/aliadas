import { useId, useState } from "react";
import { HABILIDADES } from "../lib/habilidades";
import { CampoTexto } from "./Campo";
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
export function EscolhaHabilidades({ valores, aoMudar }: { valores: string[]; aoMudar: (v: string[]) => void }) {
  const [busca, setBusca] = useState("");
  const id = useId();
  const filtradas = HABILIDADES.filter(h => normalizar([h.nome, h.grupo, ...h.sinonimos].join(" ")).includes(normalizar(busca.trim())));
  return <fieldset className="space-y-3" aria-describedby={`${id}-ajuda`}>
    <legend className="mb-2 text-sm font-semibold">Posso ajudar com</legend>
    <p id={`${id}-ajuda`} className="text-sm text-suave">Escolha o que você sabe fazer e toparia compartilhar numa conversa.</p>
    <CampoTexto rotulo="Buscar habilidades" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Ex.: entrevista, dados, portfólio" />
    <p className="text-sm text-suave" role="status">{valores.length} de 8 habilidades escolhidas</p>
    <div className="max-h-80 space-y-4 overflow-y-auto rounded-xl border border-linha p-3">
      {[...new Set(filtradas.map(h => h.grupo))].map(grupo => <fieldset key={grupo}>
        <legend className="mb-2 text-sm font-semibold">{grupo}</legend>
        <div className="space-y-2">{filtradas.filter(h => h.grupo === grupo).map(h => <label key={h.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-superficie">
          <input type="checkbox" className="mt-1 accent-vinho" checked={valores.includes(h.id)} disabled={!valores.includes(h.id) && valores.length >= 8} onChange={() => aoMudar(valores.includes(h.id) ? valores.filter(v => v !== h.id) : [...valores, h.id])} />
          <span><span className="block text-sm font-semibold">{h.nome}</span><span className="block text-xs text-suave">{h.descricao}</span></span>
        </label>)}</div>
      </fieldset>)}
      {!filtradas.length && <p className="text-sm text-suave">Nenhuma habilidade encontrada. Tente outra palavra.</p>}
    </div>
  </fieldset>;
}
