import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { mensagemAmigavel } from "../lib/erros";
import { Carregando } from "../components/Aviso";
import { useToast } from "../components/Toast";
import { PERGUNTAS_USABILIDADE, medidaParaCsv, respostaUsabilidade } from "../lib/feedbackUsabilidade";
import { MaisHistorico, RespostaAberta, useHistorico } from "../components/Historico";
import { baixarCsv } from "./IAAutomacoes";

type Linha = {
  id: string;
  created_at: string;
  tipo: string;
  nota_facilidade: number | null;
  encontrou_aliadas: string | null;
  problema_pagina: string | null;
  mudaria: string | null;
  problema_descricao: string | null;
  mensagem: string | null;
  status: string;
  email: string | null;
  clareza_fluxo: string | null;
  adequacao_ia: string | null;
  acompanhar_convites: string | null;
};
type Metricas = {
  por_tipo: Record<string, number>;
  nota_media: number | null;
  notas: number;
  conectou: Record<string, number>;
  problemas_por_pagina: Record<string, number>;
  novos: number;
  respondidos: number;
  usabilidade?: Record<string,{media:number|null;notas:number;positivas:number;nao_usei:number;sem_sugestoes:number;nao_cheguei:number}>;
};
const TIPOS: Record<string, string> = { duvida: "Dúvida", avaliacao: "Avaliação", problema: "Problema", indicacao: "Indicação (antiga)" };
const CONECTOU: Record<string, string> = { sim: "Sim", em_parte: "Em parte", nao: "Não" };
const SEM = "Sem dados ainda";
const texto = (l: Linha) => l.mensagem ?? l.problema_descricao ?? l.mudaria ?? "";

export default function FeedbackPainel() {
  const toast = useToast();
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [m, setM] = useState<Metricas | null>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const historico = useHistorico(`${mes}:${tipo}:${status}`);
  const [emails, setEmails] = useState<Record<string, boolean>>({});
  const [erro, setErro] = useState("");

  async function carregar() {
    setLinhas(null);
    const ini = new Date(`${mes}-01T00:00:00-03:00`);
    const fim = new Date(ini);
    fim.setMonth(fim.getMonth() + 1);
    const [r, l] = await Promise.all([
      supabase.rpc("mvp_feedback_metrics", { mes: `${mes}-01` }),
      supabase
        .from("feedback")
        .select("id,created_at,tipo,nota_facilidade,encontrou_aliadas,problema_pagina,mudaria,problema_descricao,mensagem,status,email,clareza_fluxo,adequacao_ia,acompanhar_convites")
        .gte("created_at", ini.toISOString())
        .lt("created_at", fim.toISOString())
        .order("created_at", { ascending: false }),
    ]);
    if (r.error || l.error) {
      setErro("Não foi possível carregar o feedback agora.");
      return setLinhas([]);
    }
    setErro("");
    setM(r.data as Metricas);
    setLinhas((l.data as Linha[]) ?? []);
  }
  useEffect(() => {
    carregar();
  }, [mes]);

  async function responder(id: string) {
    const { error } = await supabase.from("feedback").update({ status: "respondido" }).eq("id", id);
    if (error) return toast(mensagemAmigavel(error), "erro");
    toast("Marcado como respondido.");
    await carregar();
  }

  const visiveis = (linhas ?? []).filter((l) => (!tipo || l.tipo === tipo) && (!status || l.status === status));
  const lista = (obj: Record<string, number> | undefined, rot?: Record<string, string>) => {
    const e = Object.entries(obj ?? {});
    return e.length ? e.map(([k, v]) => `${rot?.[k] ?? k}: ${v}`).join(" · ") : SEM;
  };
  const cards: Record<string, string | number> = m
    ? {
        "Mensagens por tipo": lista(m.por_tipo, TIPOS),
        "Nota de facilidade": m.notas ? `${String(m.nota_media).replace(".", ",")} (${m.notas} ${m.notas === 1 ? "nota" : "notas"})` : SEM,
        "Conseguiu se conectar": lista(m.conectou, CONECTOU),
        "Problemas por página": lista(m.problemas_por_pagina),
        "Novas": m.novos,
        "Respondidas": m.respondidos,
      }
    : {};

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-2">
          <span className="block text-sm font-semibold">Mês</span>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-12 rounded-xl border-2 border-campo bg-fundo px-4" />
        </label>
      </div>
      {erro && <p className="text-erro" role="alert">{erro}</p>}
      {!linhas ? (
        <Carregando />
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(cards).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-linha p-4">
                <dt className="text-sm text-suave">{k}</dt>
                <dd className="mt-1 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <section aria-labelledby="medidas-usabilidade"><h3 id="medidas-usabilidade" className="mb-2 text-xl">Usabilidade e percepção da IA</h3>
            <p className="mb-4 text-sm text-suave">Médias de 1 a 5, calculadas apenas com respostas que deram nota. Uso não realizado e ausência de sugestões ficam separados. São percepções das participantes, sem substituir a validação dos casos da IA. Os indicadores são do mês; os filtros abaixo alteram a lista e o CSV.</p>
            <dl className="grid gap-4 lg:grid-cols-3">{PERGUNTAS_USABILIDADE.map(q=>{const u=m?.usabilidade?.[q.campo];return <div key={q.campo} className="space-y-2 rounded-xl border border-linha p-4"><dt className="text-sm text-suave">{q.titulo}</dt><dd className="font-semibold">{u?.notas ? `${String(u.media).replace(".",",")} de 5 · ${u.notas} ${u.notas===1?"nota":"notas"}` : SEM}</dd>{!!u?.notas && <dd className="text-sm">{u.positivas} com nota 4 ou 5 ({Math.round(100*u.positivas/u.notas)}%)</dd>}{u && <dd className="text-sm text-suave">{q.campo==="adequacao_ia" ? `Não usaram IA: ${u.nao_usei} · Sem sugestões: ${u.sem_sugestoes}` : q.campo==="acompanhar_convites" ? `Não chegaram à etapa: ${u.nao_cheguei}` : ""}</dd>}</div>;})}</dl>
          </section>
          <div className="flex flex-wrap items-end gap-4">
            <label className="space-y-2">
              <span className="block text-sm font-semibold">Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-12 rounded-xl border-2 border-campo bg-fundo px-4">
                <option value="">Todos</option>
                {Object.entries(TIPOS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-semibold">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 rounded-xl border-2 border-campo bg-fundo px-4">
                <option value="">Todos</option>
                <option value="novo">Novo</option>
                <option value="respondido">Respondido</option>
              </select>
            </label>
            <button
              type="button"
              disabled={!visiveis.length}
              onClick={() =>
                baixarCsv("feedback", ["registro", "data", "tipo", "nota", "conseguiu_se_conectar", "status", "clareza_do_fluxo", "adequacao_da_IA", "acompanhar_convites"],
                  visiveis.map((l) => [l.id, l.created_at, l.tipo, l.nota_facilidade ?? "", l.encontrou_aliadas ?? "", l.status, medidaParaCsv(l.clareza_fluxo), medidaParaCsv(l.adequacao_ia), medidaParaCsv(l.acompanhar_convites)]))
              }
              className="inline-flex h-12 items-center rounded-xl border-2 border-destaque px-5 font-semibold text-destaque hover:bg-superficie disabled:opacity-50"
            >
              Exportar medidas (CSV)
            </button>
          </div>
          {!visiveis.length ? (
            <p className="text-sm text-suave">{SEM}</p>
          ) : (
            <ul className="space-y-3">
              {visiveis.slice(0,historico.limite).map((l) => (
                <li key={l.id} className="space-y-2 rounded-2xl border border-linha p-4 text-sm">
                  <p className="text-suave">
                    {new Date(l.created_at).toLocaleString("pt-BR")} · {TIPOS[l.tipo] ?? l.tipo}
                    {l.nota_facilidade ? ` · nota ${l.nota_facilidade}` : ""}
                    {l.encontrou_aliadas ? ` · conectou: ${CONECTOU[l.encontrou_aliadas]}` : ""}
                    {l.problema_pagina ? ` · ${l.problema_pagina}` : ""} · {l.status === "respondido" ? "Respondido" : l.status === "novo" ? "Novo" : l.status}
                  </p>
                  {l.tipo==="avaliacao" && <dl className="space-y-1">{PERGUNTAS_USABILIDADE.map(q=><div key={q.campo}><dt className="inline font-semibold">{q.titulo} </dt><dd className="inline">{respostaUsabilidade(l[q.campo])}</dd></div>)}</dl>}
                  {texto(l) && <RespostaAberta texto={texto(l)} />}
                  <div className="flex flex-wrap items-center gap-4">
                    {l.email &&
                      (emails[l.id] ? (
                        <a href={`mailto:${l.email}`} className="text-link">{l.email}</a>
                      ) : (
                        <button type="button" className="font-semibold text-destaque underline underline-offset-4" onClick={() => setEmails({ ...emails, [l.id]: true })}>
                          Mostrar e-mail
                        </button>
                      ))}
                    {l.status !== "respondido" && (
                      <button type="button" className="font-semibold text-destaque underline underline-offset-4" onClick={() => responder(l.id)}>
                        Marcar como respondido
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <MaisHistorico total={visiveis.length} {...historico} />
        </>
      )}
    </section>
  );
}
