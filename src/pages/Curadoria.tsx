import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { Pagina, Titulo } from "../components/Pagina";
import { Botao } from "../components/Botao";
import { Aviso, Carregando } from "../components/Aviso";
import { mensagemAmigavel } from "../lib/erros";
import { AREAS_PRO, SITUACAO_PRO, GOALS_PRO, label } from "../lib/professional";
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
  if (adminAccess.review_profiles) tabs.push({ id: "perfis", label: "Perfis" });
  if (adminAccess.handle_reports) tabs.push({ id: "denuncias", label: "Denúncias" });
  if (adminAccess.ver_feedback) tabs.push({ id: "feedback", label: "Feedback" });
  if (adminAccess.ver_ia_automacoes) tabs.push({ id: "ia", label: "IA e automações" });
  if (adminAccess.principal) tabs.push({ id: "acessos", label: "Acessos" });
  const active = tabs.some((x) => x.id === tab) ? tab : tabs[0]?.id;
  const ir = (t: Tab) => {
    setTab(t);
    recarregar();
  };
  return (
    <Pagina titulo="Painel das embaixadoras">
      <Titulo sub="Cada aba aparece de acordo com os acessos da sua conta.">Painel das embaixadoras</Titulo>
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
        {active === "denuncias" && <Reports />}
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
  pending_profiles: number;
  pending_invites: number;
  conversations_happened: number;
  useful_rate: number | null;
  open_reports: number;
  feedback_new: number;
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
    ["Perfis aguardando aprovação", m.pending_profiles, "perfis"],
    ["Convites esperando resposta", m.pending_invites, "feedback"],
    ["Conversas que aconteceram", m.conversations_happened, "feedback"],
    ["Conversas úteis", pct(m.useful_rate), "feedback"],
    ["Denúncias abertas", m.open_reports, "denuncias"],
    ["Feedbacks novos", m.feedback_new, "feedback"],
  ];
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </ul>
  );
}

type Profile = {
  id: string;
  name: string;
  status: string;
  situacao: string | null;
  area_principal: string | null;
  interesses: string[] | null;
  can_help: string[] | null;
};
// Só os perfis que aguardam aprovação, com aprovar ou recusar.
function Profiles() {
  const { session, recarregar } = useAuth();
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recusa, setRecusa] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  async function load() {
    const { data, error } = await supabase.rpc("mvp_admin_profiles", { filter_status: "pendente" });
    if (error) {
      setError(mensagemAmigavel(error, "Não foi possível carregar os perfis."));
      setRows([]);
    } else {
      setRows(data);
      setError("");
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function review(id: string, status: string) {
    setBusy(true);
    const { error } = await supabase.rpc("mvp_admin_review_with_reason", { target: id, new_status: status, reason: status === "reprovado" ? motivo : "" });
    setBusy(false);
    if (error) {
      setError(mensagemAmigavel(error));
      await recarregar();
    } else { setRecusa(null); setMotivo(""); await load(); }
  }
  return (
    <>
      <h2 className="mb-5 text-xl">Perfis aguardando aprovação</h2>
      {error && <Aviso tipo="erro">{error}</Aviso>}
      {!rows ? (
        <Carregando />
      ) : !rows.length ? (
        <p className="text-suave">Nenhum perfil aguardando aprovação.</p>
      ) : (
        <ul className="space-y-5">
          {rows.map((p) => (
            <li key={p.id} className="rounded-2xl border border-linha p-6">
              <h3 className="text-lg">{p.name}</h3>
              <dl className="mt-3 space-y-1 text-sm">
                {p.situacao && (
                  <div>
                    <dt className="inline text-suave">Hoje: </dt>
                    <dd className="inline">{label(SITUACAO_PRO, p.situacao)}</dd>
                  </div>
                )}
                {p.area_principal && (
                  <div>
                    <dt className="inline text-suave">Área: </dt>
                    <dd className="inline">{label(AREAS_PRO, p.area_principal)}</dd>
                  </div>
                )}
                {!!p.interesses?.length && (
                  <div>
                    <dt className="inline text-suave">Interesses: </dt>
                    <dd className="inline">{p.interesses.map((x) => label(AREAS_PRO, x)).join(", ")}</dd>
                  </div>
                )}
                {!!p.can_help?.length && (
                  <div>
                    <dt className="inline text-suave">Pode ajudar com: </dt>
                    <dd className="inline">{p.can_help.map((x) => label(GOALS_PRO, x)).join("; ")}</dd>
                  </div>
                )}
                {!p.situacao && <p className="text-suave">Ainda não completou o primeiro acesso.</p>}
              </dl>
              {p.id === session?.user.id ? (
                <p className="mt-4 text-sm text-suave">Seu perfil deve ser avaliado por outra embaixadora.</p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  <Botao carregando={busy} onClick={() => review(p.id, "aprovado")}>
                    Aprovar
                  </Botao>
                  <Botao variante="secundario" carregando={busy} onClick={() => { setRecusa(p.id); setMotivo(""); }}>
                    Não aprovar
                  </Botao>
                </div>
              )}
              {recusa === p.id && <div className="mt-4 space-y-3">
                <label className="block text-sm font-semibold">Motivo (opcional)<textarea className="mt-2 w-full rounded-xl border-2 border-campo bg-fundo p-3" value={motivo} maxLength={500} onChange={e => setMotivo(e.target.value)} /></label>
                <div className="flex gap-3"><Botao carregando={busy} onClick={() => review(p.id, "reprovado")}>Confirmar decisão</Botao><Botao variante="discreto" onClick={() => setRecusa(null)}>Cancelar</Botao></div>
              </div>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
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
