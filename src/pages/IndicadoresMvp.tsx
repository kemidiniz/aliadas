import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Aviso, Carregando } from "../components/Aviso";
export default function IndicadoresMvp() {
  const [metrics, setMetrics] = useState<Record<string, number | null> | null>(
    null,
  );
  const [logs, setLogs] = useState<
    {
      id: string;
      state: string;
      error_code: string | null;
      model: string | null;
      input_tokens: number | null;
      output_tokens: number | null;
      created_at: string;
    }[]
  >([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      supabase.rpc("mvp_metrics"),
      supabase
        .from("conversation_jobs")
        .select(
          "id,state,error_code,model,input_tokens,output_tokens,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(30),
    ]).then(([m, l]) => {
      if (m.error || l.error)
        setError(
          "indicadores indisponíveis. confira as migrations locais antes da ativação.",
        );
      else {
        setMetrics(m.data);
        setLogs(l.data ?? []);
      }
    });
  }, []);
  if (error) return <Aviso tipo="erro">{error}</Aviso>;
  if (!metrics) return <Carregando />;
  const n = (k: string) => Number(metrics[k] ?? 0);
  const rate = (a: number, b: number) =>
    b ? `${((100 * a) / b).toFixed(1)}%` : "sem base";
  return (
    <section>
      <h2 className="mb-4 font-titulo text-2xl font-bold">
        indicadores da jornada
      </h2>
      <dl className="grid gap-4 sm:grid-cols-3">
        {Object.entries({
          "solicitações criadas": n("requests"),
          "convites enviados": n("invites"),
          "conexões aceitas": n("accepted"),
          "conversas confirmadas": n("confirmed"),
          "taxa de realização": rate(n("confirmed"), n("accepted")),
          "taxa de conversas úteis": rate(n("useful"), n("confirmed")),
          "média das avaliações":
            metrics.average === null
              ? "sem avaliações"
              : n("average").toFixed(2),
          "taxa de resposta": rate(n("responses"), 2 * n("accepted")),
          "confirmações divergentes": n("conflicting"),
        }).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-linha p-4">
            <dt className="text-sm text-suave">{k}</dt>
            <dd className="text-xl font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="my-5 text-sm text-suave">
        conversa confirmada: ao menos uma participante informou que aconteceu.
        útil: ao menos uma confirmação positiva com nota 4 ou 5. divergências
        ficam identificadas. ausência de resposta não confirma encontros.
        resposta: avaliações / duas participantes por conexão aceita.
      </p>
      <h3 className="mb-3 font-semibold">execuções da automação</h3>
      {!logs.length ? (
        <p>
          nenhuma execução registrada. isso não comprova funcionamento da IA.
        </p>
      ) : (
        <ul className="space-y-3">
          {logs.map((l) => (
            <li key={l.id} className="break-words rounded-xl bg-superficie p-4">
              <p>
                {new Date(l.created_at).toLocaleString("pt-BR")} · {l.state}
              </p>
              <p>
                {l.error_code ?? "sem erro registrado"} ·{" "}
                {l.model ?? "sem modelo"} · tokens: {l.input_tokens ?? 0} /{" "}
                {l.output_tokens ?? 0}
              </p>
              <p className="text-sm">execução: {l.id}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
