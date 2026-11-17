import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Aviso, Carregando } from "../components/Aviso";
import { GOALS_PRO } from "../lib/professional";

type MetricasIA = {
  jobs_month: number;
  jobs_failed_month: number;
  tokens_month: { input: number; output: number };
  requests_without_match: Record<string, number>;
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

// Aba "IA e automações": execuções, tokens e erros do mês, rotina diária e
// pedidos sem ninguém compatível. Permissão: ver_ia_automacoes (checada no banco).
export default function IAAutomacoes() {
  const [metrics, setMetrics] = useState<MetricasIA | null>(null);
  const [logs, setLogs] = useState<Execucao[]>([]);
  const [rotina, setRotina] = useState<Rotina[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      supabase.rpc("mvp_ai_metrics"),
      supabase
        .from("conversation_jobs")
        .select("id,state,error_code,model,input_tokens,output_tokens,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("conversation_expiry_runs").select("executado_em,expirados,pedidos_avaliacao").order("executado_em", { ascending: false }).limit(500),
    ]).then(([m, l, ro]) => {
      if (m.error || l.error) setError("Não foi possível carregar IA e automações agora. Tente de novo em instantes.");
      else {
        setMetrics(m.data as MetricasIA);
        setLogs(l.data ?? []);
        setRotina((ro.data as Rotina[]) ?? []);
      }
    });
  }, []);
  if (error) return <Aviso tipo="erro">{error}</Aviso>;
  if (!metrics) return <Carregando />;
  const semMatch = Object.entries(metrics.requests_without_match ?? {}).sort((a, b) => b[1] - a[1]);
  const tokens = metrics.tokens_month ?? { input: 0, output: 0 };
  const mes: Record<string, number> = {
    "Execuções no mês": Number(metrics.jobs_month ?? 0),
    "Execuções com erro": Number(metrics.jobs_failed_month ?? 0),
    "Tokens de entrada": tokens.input,
    "Tokens de saída": tokens.output,
  };
  const botao =
    "mt-4 inline-flex h-12 items-center rounded-xl border-2 border-destaque px-5 font-semibold text-destaque hover:bg-superficie disabled:opacity-50";

  return (
    <section className="space-y-10">
      <div>
        <h2 className="mb-3 text-xl">IA no mês</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(mes).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-linha p-4">
              <dt className="text-sm text-suave">{k}</dt>
              <dd className="text-xl font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
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
        <button
          type="button"
          disabled={!semMatch.length}
          onClick={() => baixarCsv("pedidos-sem-compativel", ["objetivo", "pedidos"], semMatch.map(([g, c]) => [GOALS_PRO[g as keyof typeof GOALS_PRO] ?? g, c]))}
          className={botao}
        >
          Exportar pedidos sem compatível (CSV)
        </button>
      </div>
      <div>
        <h2 className="mb-3 text-xl">Execuções da IA</h2>
        {!logs.length ? (
          <p className="text-sm text-suave">{SEM}</p>
        ) : (
          <ul className="space-y-2">
            {logs.slice(0, 30).map((l) => (
              <li key={l.id} className="break-words rounded-xl bg-superficie p-4 text-sm">
                {new Date(l.created_at).toLocaleString("pt-BR")} · {l.state} · {l.error_code ?? "Sem erro"} · {l.model ?? "Sem modelo"} · tokens {l.input_tokens ?? 0}/{l.output_tokens ?? 0}
              </li>
            ))}
          </ul>
        )}
        <button type="button" disabled={!logs.length} onClick={() => exportarCsv(logs)} className={botao}>
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
          className={botao}
        >
          Exportar rotina diária (CSV)
        </button>
      </div>
    </section>
  );
}
