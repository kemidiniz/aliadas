import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { Pagina, Titulo } from "../components/Pagina";
import { CampoTexto, CampoSelect } from "../components/Campo";
import { nomeHabilidade } from "../lib/habilidades";
import { Botao } from "../components/Botao";
import { Aviso, Carregando } from "../components/Aviso";
import { mensagemAmigavel } from "../lib/erros";
import { AREAS_PRO, SITUACAO_PRO, label } from "../lib/professional";
import { MetricasHabilidades } from "../components/MetricasHabilidades";
import IAAutomacoes from "./IAAutomacoes";
import FeedbackPainel from "./FeedbackPainel";
import AvaliacaoConversas, { pct } from "./AvaliacaoConversas";
import Acessos from "./Acessos";

// Cada aba aparece só para quem tem a permissão; o banco confere de novo em cada RPC.
type Tab = "visao" | "perfis" | "denuncias" | "feedback" | "ia" | "acessos";
export default function Curadoria() {
  const { adminAccess, recarregar } = useAuth();
  const [tab, setTab] = useState<Tab>("visao");
  const [contagem, setContagem] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase.rpc("mvp_admin_counts").then(({ data }) => {
      if (data) setContagem(data as Record<string, number>);
    });
  }, [tab]);
  const tabs: { id: Tab; label: string }[] = [];
  if (adminAccess.ver_visao_geral) tabs.push({ id: "visao", label: "Visão geral" });
  if (adminAccess.review_profiles) tabs.push({ id: "perfis", label: "Participantes" });
  if (adminAccess.handle_reports) tabs.push({ id: "denuncias", label: "Denúncias" });
  if (adminAccess.ver_feedback) tabs.push({ id: "feedback", label: "Avaliações e feedback" });
  if (adminAccess.ver_ia_automacoes) tabs.push({ id: "ia", label: "IA e automações" });
  if (adminAccess.principal) tabs.push({ id: "acessos", label: "Acessos" });
  const active = tabs.some((x) => x.id === tab) ? tab : tabs[0]?.id;
  const ir = (t: Tab) => {
    setTab(t);
    recarregar();
  };
  return (
    <Pagina titulo="Painel das embaixadoras">
      <Titulo sub="Acompanhe dúvidas e denúncias, cuide das contas e veja os resultados da comunidade.">Painel das embaixadoras</Titulo>
      <div role="tablist" aria-label="Áreas administrativas" className="mb-8 flex flex-wrap gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`admin-${t.id}`}
            id={`tab-${t.id}`}
            className={`rounded-xl border px-4 py-3 font-medium ${active === t.id ? "border-destaque bg-destaque text-sobre-destaque" : "border-campo"}`}
            onClick={() => ir(t.id)}
          >
            {t.label}
            {contagem[t.id] ? (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-xs text-vinho-noite">
                {contagem[t.id]}
                <span className="sr-only"> pendentes</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <section role="tabpanel" className="min-h-[60vh]" id={`admin-${active}`} aria-labelledby={`tab-${active}`}>
        {active === "visao" && <VisaoGeral ir={ir} pode={(t) => tabs.some((x) => x.id === t)} />}
        {active === "perfis" && <Profiles />}
        {active === "denuncias" && <><h2 className="mb-2 text-xl">Denúncias</h2><p className="mb-5 text-sm text-suave">Acompanhe cada ocorrência e atualize seu andamento. Se precisar pausar uma conta, use Participantes.</p><Reports /></>}
        {active === "feedback" && (
          <div className="space-y-12">
            <div>
              <h2 className="mb-4 text-xl">Feedback do site</h2>
              <FeedbackPainel />
            </div>
            <div>
              <h2 className="mb-4 text-xl">Avaliação das conversas</h2>
              <AvaliacaoConversas />
            </div>
          </div>
        )}
        {active === "ia" && <IAAutomacoes />}
        {active === "acessos" && <Acessos />}
        {!active && <Aviso>Nenhuma atribuição administrativa ativa.</Aviso>}
      </section>
    </Pagina>
  );
}

type Visao = {
  active_profiles: number;
  available_profiles: number;
  pending_invites: number;
  conversations_happened: number;
  useful_rate: number | null;
  open_reports: number;
  feedback_new: number;
  unanswered_questions: number;
};
// Só 6 cards; cada um leva à aba de detalhe (se a pessoa tiver acesso a ela).
function VisaoGeral({ ir, pode }: { ir: (t: Tab) => void; pode: (t: Tab) => boolean }) {
  const [m, setM] = useState<Visao | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    supabase.rpc("mvp_metrics").then(({ data, error }) => {
      if (error) setErro("Não foi possível carregar a visão geral agora.");
      else setM(data as Visao);
    });
  }, []);
  if (erro) return <Aviso tipo="erro">{erro}</Aviso>;
  if (!m) return <Carregando />;
  const cards: [string, string | number, Tab][] = [
    ["Participantes ativas", m.active_profiles ?? 0, "perfis"],
    ["Convites esperando resposta", m.pending_invites, "ia"],
    ["Conversas que aconteceram", m.conversations_happened, "feedback"],
    ["Conversas úteis", pct(m.useful_rate), "feedback"],
    ["Denúncias abertas", m.open_reports, "denuncias"],
    ["Feedbacks novos", m.feedback_new, "feedback"],
  ];
  const tarefas: [string, number, Tab][] = [
    ["Denúncias abertas", m.open_reports, "denuncias"],
    ["Dúvidas sem resposta", m.unanswered_questions ?? 0, "feedback"],
  ].filter(([, n, destino]) => Number(n)>0 && pode(destino as Tab)) as [string,number,Tab][];
  return (<div className="space-y-10">
    <section aria-labelledby="tarefas-hoje"><h2 id="tarefas-hoje" className="mb-4 text-xl">Para fazer hoje</h2>
      {tarefas.length ? <ul className="space-y-3">{tarefas.map(([nome,n,destino])=><li key={nome} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-superficie p-4"><span>{nome}: <strong>{n}</strong></span><Botao variante="secundario" onClick={()=>ir(destino)}>Abrir {destino === "perfis" ? "perfis" : destino === "denuncias" ? "denúncias" : "avaliações e feedback"}</Botao></li>)}</ul> : <p>Nada pendente hoje. Obrigada!</p>}
    </section>
    <section aria-labelledby="numeros"><h2 id="numeros" className="mb-4 text-xl">A comunidade em números</h2>
    <ul aria-label="Indicadores da comunidade" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(([rotulo, valor, destino]) => {
        const conteudo = (
          <>
            <span className="block text-sm text-suave">{rotulo}</span>
            <span className="mt-1 block font-titulo text-3xl font-bold text-destaque">{valor}</span>
          </>
        );
        return (
          <li key={rotulo}>
            {pode(destino) ? (
              <button
                type="button"
                onClick={() => ir(destino)}
                className="block h-full w-full rounded-2xl border border-linha p-5 text-left transition-colors hover:border-destaque hover:bg-superficie"
              >
                {conteudo}
                <span className="mt-3 block text-sm font-semibold text-destaque">Ver detalhes</span>
              </button>
            ) : (
              <div className="h-full rounded-2xl border border-linha p-5">{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul></section>
    <section aria-labelledby="onde-falta"><h2 id="onde-falta" className="mb-4 text-xl">Onde falta gente</h2><MetricasHabilidades apenasDemanda /></section>
  </div>);
}

type Profile = { id: string; name: string; status: string; situacao: string | null; area_principal: string | null; habilidades: string[] | null; available: boolean };
function Profiles() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(ev?: FormEvent) {
    ev?.preventDefault(); setErro("");
    const { data, error } = await supabase.rpc("mvp_admin_participants", { q: busca, filter_status: filtro });
    if (error) { setErro(mensagemAmigavel(error)); setRows([]); } else setRows(data);
  }
  useEffect(() => { load(); }, [filtro]);
  async function alterar(p: Profile, ativa: boolean) {
    if (!window.confirm(`${ativa ? "Reativar" : "Pausar"} a conta de ${p.name}?`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("mvp_admin_set_active", { target: p.id, active: ativa });
    setBusy(false);
    if (error) setErro(mensagemAmigavel(error)); else await load();
  }
  return <section className="space-y-5"><div><h2 className="text-xl">Participantes</h2><p className="mt-2 text-sm text-suave">O cadastro já libera a busca. Esta área serve para pausar ou reativar contas quando necessário; contatos privados não são exibidos.</p></div>
    <form onSubmit={load} className="flex flex-wrap items-end gap-4"><div className="min-w-48 flex-1"><CampoTexto rotulo="Buscar participante" value={busca} onChange={e => setBusca(e.target.value)} maxLength={80} /></div><CampoSelect rotulo="Contas" value={filtro} onChange={e => setFiltro(e.target.value)} opcoes={[{valor:"todos",rotulo:"Todas"},{valor:"ativas",rotulo:"Ativas"},{valor:"restritas",rotulo:"Pausadas ou restritas"}]} /><Botao type="submit">Buscar</Botao></form>
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
    {!rows ? <Carregando /> : !rows.length ? <p>Nenhuma participante encontrada.</p> : <ul className="divide-y divide-linha">{rows.map(p => {const ativa = ["pendente", "aprovado"].includes(p.status); return <li key={p.id} className="flex flex-wrap items-start justify-between gap-4 py-5"><div className="min-w-0 flex-1"><h3 className="text-lg">{p.name}</h3><p className="mt-1 text-sm text-suave">{ativa ? "Conta ativa" : "Conta pausada ou restrita"}{p.situacao ? ` · ${label(SITUACAO_PRO,p.situacao)}` : ""}{p.area_principal ? ` · ${label(AREAS_PRO,p.area_principal)}` : ""}</p><p className="mt-2 text-sm">{p.available ? (p.habilidades?.length ? p.habilidades.map(nomeHabilidade).join(" · ") : "Ainda não escolheu habilidades para receber convites.") : "Busca apoio, sem receber novos convites."}</p></div>{p.id !== session?.user.id && <Botao variante="secundario" carregando={busy} onClick={() => alterar(p,!ativa)}>{ativa ? "Pausar conta" : "Reativar conta"}</Botao>}</li>;})}</ul>}
  </section>;
}
type Report = {
  id: string;
  denunciado_id: string;
  name: string;
  motivo: string;
  status: string;
  created_at: string;
};
function Reports() {
  const [rows, setRows] = useState<Report[] | null>(null);
  const [error, setError] = useState("");
  async function load() {
    const { data, error } = await supabase.rpc("mvp_admin_reports");
    if (error) {
      setError(mensagemAmigavel(error));
      setRows([]);
    } else setRows(data);
  }
  useEffect(() => {
    load();
  }, []);
  async function update(id: string, status: string) {
    const { error } = await supabase.rpc("mvp_admin_report_status", {
      report_id: id,
      new_status: status,
    });
    if (error) setError(mensagemAmigavel(error));
    else await load();
  }
  return (
    <>
      {error && <Aviso tipo="erro">{error}</Aviso>}
      {!rows ? (
        <Carregando />
      ) : !rows.length ? (
        <p>Nenhuma denúncia registrada.</p>
      ) : (
        <ul className="space-y-5">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-linha p-5">
              <h3>{r.name ?? "Participante"}</h3>
              <p className="my-3 break-words">{r.motivo}</p>
              <label>
                Status da ocorrência
                <select
                  className="ml-3 rounded-xl border border-campo bg-fundo p-3"
                  value={r.status}
                  onChange={(e) => update(r.id, e.target.value)}
                >
                  {Object.entries({
                    aberta: "Aberta",
                    em_analise: "Em análise",
                    resolvida: "Resolvida",
                    descartada: "Descartada",
                  }).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
