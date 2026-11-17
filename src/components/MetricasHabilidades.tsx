import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
export type SkillMetrics = { first_choice_rate: number | null; ia: number; regra: number; sem_compativel: number; habilidades: { id: string; nome: string; pedidas: number; oferecidas: number }[] };
export function MetricasHabilidades({ apenasDemanda = false, mostrarDemanda = true }: { apenasDemanda?: boolean; mostrarDemanda?: boolean }) {
  const [m, setM] = useState<SkillMetrics | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => { supabase.rpc("mvp_skill_metrics").then(({ data, error }) => { if (error) setErro(true); else if (data && !Array.isArray(data)) setM(data as SkillMetrics); }); }, []);
  if (erro) return <p role="alert">Não foi possível carregar as métricas de habilidades.</p>;
  if (!m) return <p className="text-sm text-suave">Carregando indicadores de habilidades…</p>;
  const total = m.ia + m.regra;
  const pct = (n: number | null) => n === null ? "Sem dados ainda" : `${Math.round(n * 100)}%`;
  return <div className="space-y-6">
    {!apenasDemanda && <dl className="grid gap-4 sm:grid-cols-3">
      {[["Indicações aceitas na 1ª recomendação", pct(m.first_choice_rate)], ["Pedidos resolvidos pela IA", pct(total ? m.ia / total : null)], ["Pedidos resolvidos pelo plano B", pct(total ? m.regra / total : null)]].map(([label, value]) => <div key={label} className="rounded-xl border border-linha p-4"><dt className="text-sm text-suave">{label}</dt><dd className="mt-2 text-xl font-semibold">{value}</dd></div>)}
      <p className="text-xs text-suave sm:col-span-3">Primeira recomendação: convite enviado sem tocar em “Ver outra indicação”. Não representa aceite nem realização da conversa.</p>
    </dl>}
    {mostrarDemanda && <section aria-label="Habilidades pedidas e oferecidas">
      <h3 className="mb-3 text-lg">Habilidades mais pedidas × mais oferecidas</h3>
      <p className="mb-3 text-sm text-suave">{m.sem_compativel} {m.sem_compativel === 1 ? "pedido sem ninguém compatível" : "pedidos sem ninguém compatível"}. Ofertas consideram perfis aprovados e disponíveis.</p>
      {!m.habilidades.some(h=>h.pedidas>0 || h.oferecidas>0) && <p className="text-sm text-suave">As habilidades aparecem aqui quando os perfis e pedidos forem preenchidos.</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2 pr-3">Habilidade</th><th className="pr-3">Pedida</th><th>Oferecida</th></tr></thead><tbody>{[...m.habilidades].filter(h=>h.pedidas>0 || h.oferecidas>0).sort((a,b) => (b.pedidas-b.oferecidas)-(a.pedidas-a.oferecidas)).map(h => <tr key={h.id} className="border-t border-linha"><th scope="row" className="py-2 pr-3 font-normal">{h.nome}</th><td>{h.pedidas}</td><td>{h.oferecidas}</td></tr>)}</tbody></table></div>
    </section>}
  </div>;
}
