import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Aviso, Carregando } from "../components/Aviso";
import { GOALS_PRO } from "../lib/professional";
import { MARCAS } from "../components/AvaliacaoConversa";

type Metricas = Record<string, unknown> & {
  average: number | null;
  requests_without_match?: Record<string, number>;
  tokens_month?: { input: number; output: number };
  useful_rate?: number | null;
  top_marks?: Record<string, number>;
};
type Rotina = { executado_em: string; expirados: number; pedidos_avaliacao: number };
type Execucao = {
  id: string;
  state: string;
  error_code: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};
const SEM = "Sem dados ainda";

// CSV sem dado pessoal: nenhum id de pessoa, nome ou contato.
export function baixarCsv(nome: string, cab: string[], linhas: unknown[][]) {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const corpo = [cab.join(","), ...linhas.map((l) => l.map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + corpo], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}-aliadas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const exportarCsv = (execucoes: Execucao[]) =>
  baixarCsv("execucoes", ["data", "estado", "erro", "modelo", "tokens_entrada", "tokens_saida", "id_execucao"],
    execucoes.map((l) => [l.created_at, l.state, l.error_code ?? "", l.model ?? "", l.input_tokens ?? 0, l.output_tokens ?? 0, l.id]));

export default function IndicadoresMvp() {
  const [metrics, setMetrics] = useState<Metricas | null>(null);
  const [logs, setLogs] = useState<Execucao[]>([]);
  const [rotina, setRotina] = useState<Rotina[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      supabase.rpc("mvp_metrics"),
      supabase
        .from("conversation_jobs")
        .select("id,state,error_code,model,input_tokens,output_tokens,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("conversation_expiry_runs").select("executado_em,expirados,pedidos_avaliacao").order("executado_em", { ascending: false }).limit(500),
    ]).then(([m, l, ro]) => {
      if (m.error || l.error) setError("Painel indisponível agora. Tente de novo em instantes.");
      else {
        setMetrics(m.data);
        setLogs(l.data ?? []);
        setRotina((ro.data as Rotina[]) ?? []);
      }
    });
  }, []);
  if (error) return <Aviso tipo="erro">{error}</Aviso>;
  if (!metrics) return <Carregando />;
  const n = (k: string) => Number(metrics[k] ?? 0);
  const rate = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1).replace(".", ",")}%` : SEM);
  const semMatch = Object.entries(metrics.requests_without_match ?? {}).sort((a, b) => b[1] - a[1]);
  const tokens = metrics.tokens_month ?? { input: 0, output: 0 };

  const grupos: [string, Record<string, string | number>][] = [
    [
      "Onde está travando",
      {
        "Perfis aguardando aprovação": n("pending_profiles"),
        "Convites parados há mais de 3 dias": n("stale_invites"),
        "Denúncias abertas": n("open_reports"),
        "Feedbacks no mês": n("feedback_month"),
      },
    ],
    [
      "Jornada",
      {
        "Pedidos criados": n("requests"),
        "Convites enviados": n("invites"),
        "Convites aceitos": n("accepted"),
        "Conversas confirmadas": n("confirmed"),
        "Taxa de realização": rate(n("confirmed"), n("accepted")),
        "Taxa de conversas úteis": rate(n("useful"), n("confirmed")),
        "Média das avaliações": metrics.average === null ? SEM : Number(metrics.average).toFixed(2).replace(".", ","),
        "Taxa de resposta": rate(n("responses"), 2 * n("accepted")),
      },
    ],
    [
      "Depois da conversa",
      {
        "Conversas que aconteceram": n("conversations_happened"),
        "Úteis (nota 4 ou 5)": metrics.useful_rate == null ? SEM : `${(Number(metrics.useful_rate) * 100).toFixed(1).replace(".", ",")}%`,
        "Avaliações pendentes": n("feedback_requests_pending"),
        "Convites expirados": n("expired_invites"),
      },
    ],
    [
      "IA no mês",
      {
        "Execuções": n("jobs_month"),
        "Execuções com erro": n("jobs_failed_month"),
        "Tokens de entrada": tokens.input,
        "Tokens de saída": tokens.output,
      },
    ],
  ];

  return (
    <section className="space-y-8">
      {grupos.map(([titulo, itens]) => (
        <div key={titulo}>
          <h2 className="mb-3 text-xl">{titulo}</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(itens).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-linha p-4">
                <dt className="text-sm text-suave">{k}</dt>
                <dd className="text-xl font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <div>
        <h2 className="mb-3 text-xl">O que elas trouxeram</h2>
        {Object.keys(metrics.top_marks ?? {}).length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(metrics.top_marks ?? {}).sort((a, b) => b[1] - a[1]).map(([m, c]) => (
              <li key={m} className="flex justify-between rounded-xl bg-superficie px-4 py-3 text-sm">
                <span>{MARCAS[m] ?? m}</span>
                <strong>{c}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-suave">{SEM}</p>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-xl">Pedidos sem ninguém compatível</h2>
        {semMatch.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {semMatch.map(([g, c]) => (
              <li key={g} className="flex justify-between rounded-xl bg-superficie px-4 py-3 text-sm">
                <span>{GOALS_PRO[g as keyof typeof GOALS_PRO] ?? g}</span>
                <strong>{c}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-suave">{SEM}</p>
        )}
      </div>
      <p className="text-sm text-suave">
        Conversa confirmada: ao menos uma participante disse que aconteceu. Útil: ao menos uma confirmação com nota 4 ou 5. Resposta: avaliações dividido por duas participantes em cada convite aceito.
      </p>
      <div>
        <h2 className="mb-3 text-xl">Execuções da automação</h2>
        {!logs.length ? (
          <p className="text-sm text-suave">{SEM}</p>
        ) : (
          <ul className="space-y-2">
            {logs.slice(0, 30).map((l) => (
              <li key={l.id} className="break-words rounded-xl bg-superficie p-4 text-sm">
                <p>
                  {new Date(l.created_at).toLocaleString("pt-BR")} · {l.state} · {l.error_code ?? "Sem erro"} · {l.model ?? "Sem modelo"} · tokens {l.input_tokens ?? 0}/{l.output_tokens ?? 0}
                </p>
                <p className="text-suave">Execução {l.id}</p>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={!logs.length}
          onClick={() => exportarCsv(logs)}
          className="mt-4 inline-flex h-12 items-center rounded-xl border-2 border-destaque px-5 font-semibold text-destaque hover:bg-superficie disabled:opacity-50"
        >
          Exportar execuções (CSV)
        </button>
      </div>
      <div>
        <h2 className="mb-3 text-xl">Rotina diária</h2>
        <p className="text-sm text-suave">
          {rotina.length
            ? `Última execução: ${new Date(rotina[0].executado_em).toLocaleString("pt-BR")} · ${rotina[0].expirados} expirados · ${rotina[0].pedidos_avaliacao} pedidos de avaliação`
            : SEM}
        </p>
        <button
          type="button"
          disabled={!rotina.length}
          onClick={() => baixarCsv("rotina-diaria", ["data", "convites_expirados", "pedidos_de_avaliacao"], rotina.map((x) => [x.executado_em, x.expirados, x.pedidos_avaliacao]))}
          className="mt-4 inline-flex h-12 items-center rounded-xl border-2 border-destaque px-5 font-semibold text-destaque hover:bg-superficie disabled:opacity-50"
        >
          Exportar rotina diária (CSV)
        </button>
      </div>
    </section>
  );
}
