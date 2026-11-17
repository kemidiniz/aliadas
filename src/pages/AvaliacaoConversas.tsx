import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Aviso, Carregando } from "../components/Aviso";
import { MARCAS } from "../components/AvaliacaoConversa";

type Metricas = {
  conversations_happened: number;
  useful_rate: number | null;
  top_marks: Record<string, number>;
  feedback_requests_pending: number;
  expired_invites: number;
};
const SEM = "Sem dados ainda";
export const pct = (v: number | null | undefined) =>
  v == null ? SEM : `${(Number(v) * 100).toFixed(1).replace(".", ",")}%`;

// Aba Feedback, parte 2. Permissão: ver_feedback (checada no banco).
export default function AvaliacaoConversas() {
  const [m, setM] = useState<Metricas | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    supabase.rpc("mvp_conversation_metrics").then(({ data, error }) => {
      if (error) setErro("Não foi possível carregar a avaliação das conversas agora.");
      else setM(data as Metricas);
    });
  }, []);
  if (erro) return <Aviso tipo="erro">{erro}</Aviso>;
  if (!m) return <Carregando />;
  const cards: Record<string, string | number> = {
    "Conversas que aconteceram": m.conversations_happened,
    "Úteis (nota 4 ou 5)": pct(m.useful_rate),
    "Avaliações pendentes": m.feedback_requests_pending,
    "Convites expirados": m.expired_invites,
  };
  const marcas = Object.entries(m.top_marks ?? {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(cards).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-linha p-4">
            <dt className="text-sm text-suave">{k}</dt>
            <dd className="text-xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="mb-3 text-lg">O que elas trouxeram</h3>
        {marcas.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {marcas.map(([k, c]) => (
              <li key={k} className="flex justify-between rounded-xl bg-superficie px-4 py-3 text-sm">
                <span>{MARCAS[k] ?? k}</span>
                <strong>{c}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-suave">{SEM}</p>
        )}
      </div>
      <p className="text-sm text-suave">
        Aconteceu: ao menos uma participante disse que sim. Útil: entre essas, ao menos uma deu nota 4 ou 5.
      </p>
    </div>
  );
}
