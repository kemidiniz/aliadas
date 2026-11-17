import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { Pagina, Titulo } from "../components/Pagina";
import { Botao } from "../components/Botao";
import { Aviso, Carregando } from "../components/Aviso";
import { mensagemAmigavel } from "../lib/erros";
import { AREAS_PRO, MOMENTS_PRO, GOALS_PRO } from "../lib/professional";
import IndicadoresMvp from "./IndicadoresMvp";
import Embaixadoras from "./Embaixadoras";
type Tab = "painel" | "perfis" | "denuncias" | "embaixadoras";
export default function Curadoria() {
  const { adminAccess, recarregar } = useAuth();
  const [tab, setTab] = useState<Tab>("painel");
  const [contagem, setContagem] = useState<Record<string, number>>({});
  useEffect(() => {
    // contadores das abas; sem acesso ao painel, as abas ficam sem número
    supabase.rpc("mvp_metrics").then(({ data }) => {
      if (data) setContagem({ perfis: Number(data.pending_profiles ?? 0), denuncias: Number(data.open_reports ?? 0) });
    });
  }, [tab]);
  const tabs: { id: Tab; label: string }[] = [];
  if (adminAccess.principal || adminAccess.legacy)
    tabs.push({ id: "painel", label: "Painel" });
  if (adminAccess.review_profiles) tabs.push({ id: "perfis", label: "Perfis" });
  if (adminAccess.handle_reports)
    tabs.push({ id: "denuncias", label: "Denúncias" });
  if (adminAccess.principal)
    tabs.push({ id: "embaixadoras", label: "Embaixadoras" });
  const active = tabs.some((x) => x.id === tab) ? tab : tabs[0]?.id;
  return (
    <Pagina titulo="Administração">
      <Titulo sub="Acesso restrito às atribuições autorizadas para sua conta.">
        Administração
      </Titulo>
      {adminAccess.legacy && (
        <div className="mb-6">
          <Aviso>
            Acesso administrativo legado preservado. A identificação da
            administradora principal está preparada para migração e depende de
            autorização para aplicar os papéis.
          </Aviso>
        </div>
      )}
      <div
        role="tablist"
        aria-label="Áreas administrativas"
        className="mb-8 flex flex-wrap gap-3"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`admin-${t.id}`}
            id={`tab-${t.id}`}
            className={`rounded-xl border px-4 py-3 font-medium ${active === t.id ? "border-destaque bg-destaque text-sobre-destaque" : "border-campo"}`}
            onClick={() => {
              setTab(t.id);
              recarregar();
            }}
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
      <section
        role="tabpanel"
        id={`admin-${active}`}
        aria-labelledby={`tab-${active}`}
      >
        {active === "perfis" && <Profiles />}
        {active === "denuncias" && <Reports />}
        {active === "painel" && <IndicadoresMvp />}
        {active === "embaixadoras" && <Embaixadoras />}
        {!active && <Aviso>Nenhuma atribuição administrativa ativa.</Aviso>}
      </section>
    </Pagina>
  );
}
type Profile = {
  id: string;
  name: string;
  status: string;
  occupation: string | null;
  moment: string | null;
  areas: string[] | null;
  themes: string[] | null;
};
function Profiles() {
  const { session, recarregar } = useAuth();
  const [filter, setFilter] = useState("pendente");
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setRows(null);
    const { data, error } = await supabase.rpc("mvp_admin_profiles", {
      filter_status: filter,
    });
    if (error) {
      setError(
        mensagemAmigavel(
          error,
          "Não foi possível carregar os perfis autorizados.",
        ),
      );
      setRows([]);
    } else {
      setRows(data);
      setError("");
    }
  }
  useEffect(() => {
    load();
  }, [filter]);
  async function review(id: string, status: string) {
    setBusy(true);
    const { error } = await supabase.rpc("mvp_admin_review", {
      target: id,
      new_status: status,
    });
    setBusy(false);
    if (error) {
      setError(mensagemAmigavel(error));
      await recarregar();
    } else await load();
  }
  return (
    <>
      <label className="mb-6 block">
        Mostrar perfis
        <select
          className="ml-3 rounded-xl border border-campo bg-fundo p-3"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {Object.entries({
            pendente: "Pendentes",
            aprovado: "Aprovados",
            reprovado: "Reprovados",
            pausado: "Pausados",
          }).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {error && <Aviso tipo="erro">{error}</Aviso>}
      {!rows ? (
        <Carregando />
      ) : !rows.length ? (
        <p>Nenhum perfil neste estado.</p>
      ) : (
        <ul className="space-y-5">
          {rows.map((p) => (
            <li key={p.id} className="rounded-2xl border border-linha p-6">
              <h2 className="text-xl">{p.name}</h2>
              <p className="mt-2">
                {p.occupation ??
                  "Perfil histórico: a participante ainda precisa completar os dados profissionais."}
              </p>
              <p className="mt-3 text-sm text-suave">
                {MOMENTS_PRO[p.moment as keyof typeof MOMENTS_PRO] ?? ""}
              </p>
              <p className="mt-2 text-sm">
                {p.areas
                  ?.map((x) => AREAS_PRO[x as keyof typeof AREAS_PRO] ?? x)
                  .join(", ")}
              </p>
              <p className="mt-2 text-sm">
                {p.themes
                  ?.map((x) => GOALS_PRO[x as keyof typeof GOALS_PRO] ?? x)
                  .join("; ")}
              </p>
              {p.id === session?.user.id ? (
                <p className="mt-4 text-sm text-suave">
                  Seu perfil deve ser avaliado por outra responsável autorizada.
                </p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  {p.status !== "aprovado" && (
                    <Botao
                      carregando={busy}
                      onClick={() => review(p.id, "aprovado")}
                    >
                      Aprovar perfil
                    </Botao>
                  )}
                  {p.status !== "reprovado" && (
                    <Botao
                      variante="secundario"
                      carregando={busy}
                      onClick={() => review(p.id, "reprovado")}
                    >
                      Reprovar perfil
                    </Botao>
                  )}
                  {p.status === "aprovado" && (
                    <Botao
                      variante="discreto"
                      carregando={busy}
                      onClick={() => review(p.id, "pausado")}
                    >
                      Pausar perfil
                    </Botao>
                  )}
                </div>
              )}
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
