import { MetricasHabilidades } from "../components/MetricasHabilidades";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Aviso, Carregando } from "../components/Aviso";
import { nomeHabilidade } from "../lib/habilidades";
import { GOALS_PRO } from "../lib/professional";

type MetricasIA = {
  pending_invites: number;
  pending_by_goal: Record<string,number>;
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
  objective_attempt?: number | null;
  result_skills?: string[];
};
const ESTADOS: Record<string,string> = { pendente: "Na fila", executando: "Processando", concluida: "Concluída", falha: "Falhou", sem_consentimento: "Sem consentimento", done: "Concluída", failed: "Falhou" };
const ERROS: Record<string,string> = { limite_global: "Limite diário atingido", limite_provedor: "Cota do Gemini atingida", ia_nao_configurada: "IA ainda não configurada", acesso_provedor: "Acesso ao Gemini indisponível", modelo_indisponivel: "Modelo indisponível", configuracao_provedor: "Configuração do Gemini precisa de revisão", falha_provedor: "Gemini indisponível", saida_invalida: "Resposta recusada pela validação", saida_truncada: "Resposta incompleta", bloqueado_provedor: "Resposta bloqueada pelo provedor", consentimento_revogado: "Consentimento retirado", revisao_iniciada: "Indicação já revisada", tempo_esgotado: "Tempo de espera excedido", fila_indisponivel: "Fila temporariamente indisponível", falha_ia: "Falha ao processar IA", sugestao_trocada: "Indicação trocada", categorias_invalidas: "Categorias inválidas", sem_candidatas: "Nenhuma candidata elegível", sem_consentimento: "Sem consentimento" };
const estado = (s:string) => ESTADOS[s] ?? "Estado em revisão";
const erroIA = (s:string|null) => s ? ERROS[s] ?? "Falha em revisão" : "Sem erro";
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
  baixarCsv("execucoes", ["data", "estado", "erro", "modelo", "tokens_entrada", "tokens_saida", "id_execucao", "etapa", "tentativa", "habilidades_retornadas"],
    execucoes.map((l) => [l.created_at, estado(l.state), erroIA(l.error_code), l.model ?? "", l.input_tokens ?? 0, l.output_tokens ?? 0, l.id, l.objective_attempt ? "Habilidades do objetivo" : "Fluxo anterior", l.objective_attempt ?? "", (l.result_skills ?? []).map(nomeHabilidade).join(" | ")]));

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
        .select("id,state,error_code,model,input_tokens,output_tokens,created_at,objective_attempt,result_skills")
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
    "Uso da IA (tokens enviados)": tokens.input,
    "Uso da IA (tokens recebidos)": tokens.output,
  };
  const botao =
    "mt-4 inline-flex h-12 items-center rounded-xl border-2 border-destaque px-5 font-semibold text-destaque hover:bg-superficie disabled:opacity-50";

  return (
    <section className="space-y-10">
      <MetricasHabilidades mostrarDemanda={false} />
      <div>
        <h2 className="mb-3 text-xl">IA no mês</h2>
        <p className="mb-4 text-sm text-suave">Uso da IA (tokens enviados / recebidos). Mede o custo da IA.</p>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(mes).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-linha p-4">
              <dt className="text-sm text-suave">{k}</dt>
              <dd className="text-xl font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <section aria-labelledby="convites-pendentes"><h2 id="convites-pendentes" className="mb-3 text-xl">Convites esperando resposta</h2>
        <p className="text-2xl font-semibold">{metrics.pending_invites ?? 0}</p>
        <p className="mt-2 text-sm text-suave">Convites aguardando decisão das destinatárias. O painel mostra só totais, sem mensagens nem contatos.</p>
        <ul className="mt-3 space-y-1 text-sm">{Object.entries(metrics.pending_by_goal ?? {}).map(([g,n])=><li key={g}>{GOALS_PRO[g as keyof typeof GOALS_PRO] ?? g}: {n}</li>)}</ul>
      </section>
      <div>
        <h2 className="mb-3 text-xl">Execuções da IA</h2><p className="mb-4 text-sm text-suave">Cada tentativa autorizada fica registrada, inclusive falhas. Uma execução concluída com modelo, consumo e habilidades retornadas comprova geração; escolha manual não é geração de IA.</p>
        {!logs.length ? (
          <p className="text-sm text-suave">{SEM}</p>
        ) : (
          <ul className="space-y-2">
            {logs.slice(0, 30).map((l) => (
              <li key={l.id} className="break-words rounded-xl bg-superficie p-4 text-sm">
                <p className="font-semibold">{l.objective_attempt ? `Habilidades do objetivo · tentativa ${l.objective_attempt}` : "Fluxo anterior"} · {estado(l.state)}</p>
                <p className="mt-1 text-suave">{new Date(l.created_at).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} (Brasília) · {l.model ?? "Sem modelo"} · Uso da IA: {l.input_tokens ?? 0} enviados / {l.output_tokens ?? 0} recebidos</p>
                {!!l.result_skills?.length && <p className="mt-2">Habilidades retornadas: {l.result_skills.map(nomeHabilidade).join(" · ")}</p>}
                {l.error_code && <p className="mt-2">{erroIA(l.error_code)}</p>}
                <details className="mt-2 text-xs text-suave"><summary className="cursor-pointer">Identificador da execução</summary><code className="break-all">{l.id}</code></details>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="mb-3 text-xl">Rotina diária</h2>
        <p className="text-sm text-suave">
          {rotina.length
            ? `Última execução: ${new Date(rotina[0].executado_em).toLocaleString("pt-BR")} · ${rotina[0].expirados} expirados · ${rotina[0].pedidos_avaliacao} pedidos de avaliação`
            : SEM}
        </p>
      </div>
      <section aria-labelledby="provas-banca"><h2 id="provas-banca" className="text-xl">Provas para a banca</h2><p className="mt-2 text-sm text-suave">Exportações sem nomes ou contatos. Testes locais não comprovam execuções reais.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={!logs.length} onClick={()=>exportarCsv(logs)} className={botao}>Exportar execuções (CSV)</button>
          <button type="button" disabled={!semMatch.length} onClick={()=>baixarCsv("pedidos-sem-compativel",["objetivo","pedidos"],semMatch.map(([g,c])=>[GOALS_PRO[g as keyof typeof GOALS_PRO] ?? g,c]))} className={botao}>Exportar pedidos sem compatível (CSV)</button>
          <button type="button" disabled={!rotina.length} onClick={()=>baixarCsv("rotina-diaria",["data","convites_expirados","pedidos_de_avaliacao"],rotina.map(x=>[x.executado_em,x.expirados,x.pedidos_avaliacao]))} className={botao}>Exportar rotina diária (CSV)</button>
        </div>
      </section>
    </section>
  );
}
