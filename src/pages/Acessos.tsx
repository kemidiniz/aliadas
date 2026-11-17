import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Caixinha, CampoTexto } from "../components/Campo";
import { Botao } from "../components/Botao";
import { Aviso, Carregando } from "../components/Aviso";
import { useToast } from "../components/Toast";
import { mensagemAmigavel } from "../lib/erros";

// Aba "Acessos": só para a administradora principal (o banco confere de novo).
// Nenhum perfil é listado antes da busca; o e-mail chega mascarado do servidor.
export const PERMISSOES = {
  ver_visao_geral: "Visão geral",
  avaliar_perfis: "Avaliar perfis",
  tratar_denuncias: "Tratar denúncias",
  ver_feedback: "Ver feedback",
  ver_ia_automacoes: "Ver IA e automações",
} as const;
const DESCRICOES = {
 ver_visao_geral: "Mostra os indicadores e onde faltam habilidades na comunidade.",
 avaliar_perfis: "Permite revisar, aprovar ou não aprovar novos perfis.",
 tratar_denuncias: "Permite consultar denúncias e acompanhar o tratamento.",
 ver_feedback: "Mostra avaliações das conversas, feedback e dúvidas do site.",
 ver_ia_automacoes: "Mostra execuções da IA, consumo, erros e exportações.",
};
type Permissao = keyof typeof PERMISSOES;
type Pessoa = { id: string; name: string; email: string | null } & Record<Permissao, boolean>;
type Registro = {
  id: string;
  action: string;
  actor_name: string | null;
  target_name: string | null;
  permissions: Partial<Record<Permissao | "review_profiles" | "handle_reports", boolean>>;
  created_at: string;
};
const CHAVES = Object.keys(PERMISSOES) as Permissao[];
const ACAO: Record<string, string> = { grant: "Concedeu", revoke: "Revogou", bootstrap: "Definiu a administradora principal" };

function Etiquetas({ p }: { p: Pessoa }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Permissões">
      {CHAVES.filter((k) => p[k]).map((k) => (
        <li key={k} className="rounded-full bg-superficie px-3 py-1 text-xs font-semibold text-destaque">
          {PERMISSOES[k]}
        </li>
      ))}
    </ul>
  );
}

function VerId({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);
  return aberto ? (
    <code className="break-all text-xs text-suave">{id}</code>
  ) : (
    <button type="button" className="text-xs font-semibold text-suave underline underline-offset-4" onClick={() => setAberto(true)}>
      Ver ID
    </button>
  );
}

export default function Acessos() {
  const { adminAccess } = useAuth();
  const toast = useToast();
  const [embaixadoras, setEmbaixadoras] = useState<Pessoa[] | null>(null);
  const [auditoria, setAuditoria] = useState<Registro[]>([]);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Pessoa[] | null>(null);
  const [escolhida, setEscolhida] = useState<Pessoa | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    const [e, a] = await Promise.all([supabase.rpc("mvp_admin_ambassadors"), supabase.rpc("mvp_admin_audit")]);
    if (e.error || a.error) return setErro("Não foi possível consultar os acessos agora.");
    setEmbaixadoras(e.data as Pessoa[]);
    setAuditoria(a.data as Registro[]);
  }
  useEffect(() => {
    if (adminAccess.principal) carregar();
  }, [adminAccess.principal]);

  async function buscar(ev: FormEvent) {
    ev.preventDefault();
    if (busca.trim().length < 2) return setErro("Digite ao menos 2 letras do nome ou do e-mail.");
    setErro("");
    setEscolhida(null);
    const { data, error } = await supabase.rpc("mvp_admin_search", { q: busca.trim() });
    if (error) return setErro(mensagemAmigavel(error));
    setResultados(data as Pessoa[]);
  }

  async function salvar() {
    if (!escolhida) return;
    setOcupado(true);
    const { error } = await supabase.rpc("mvp_salvar_acessos", {
      target: escolhida.id,
      ver_visao_geral: escolhida.ver_visao_geral,
      avaliar_perfis: escolhida.avaliar_perfis,
      tratar_denuncias: escolhida.tratar_denuncias,
      ver_feedback: escolhida.ver_feedback,
      ver_ia_automacoes: escolhida.ver_ia_automacoes,
    });
    setOcupado(false);
    if (error) return toast(mensagemAmigavel(error), "erro");
    toast(CHAVES.some((k) => escolhida[k]) ? "Acessos salvos e registrados na auditoria." : "Acesso revogado e registrado na auditoria.");
    setEscolhida(null);
    setResultados(null);
    setBusca("");
    await carregar();
  }

  if (!adminAccess.principal) return <Aviso tipo="erro">Somente a administradora principal gerencia acessos.</Aviso>;

  return (
    <section className="max-w-[760px] space-y-10">
      <div>
        <h2 className="mb-3 text-xl">Embaixadoras com acesso</h2>
        {!embaixadoras ? (
          <Carregando />
        ) : !embaixadoras.length ? (
          <p className="text-sm text-suave">Ninguém tem acesso ao painel além de você.</p>
        ) : (
          <ul className="space-y-3">
            {embaixadoras.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-linha p-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-semibold">
                    {p.name} <span className="font-normal text-suave">· {p.email ?? "sem e-mail"}</span>
                  </p>
                  <Etiquetas p={p} />
                </div>
                <Botao variante="secundario" onClick={() => setEscolhida({ ...p })} aria-label={`Editar acessos de ${p.name}`}>
                  Editar
                </Botao>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-xl">Dar acesso</h2>
        <form onSubmit={buscar} className="flex flex-wrap items-start gap-3" noValidate>
          <div className="min-w-0 flex-1">
            <CampoTexto
              rotulo="Buscar pessoa por nome ou e-mail"
              value={busca}
              maxLength={80}
              erro={erro || undefined}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Botao type="submit" variante="secundario" className="sm:mt-7">
            Buscar
          </Botao>
        </form>
        {resultados && (
          <ul className="mt-4 space-y-2" aria-label="Resultados da busca">
            {!resultados.length && <li className="text-sm text-suave">Ninguém encontrado.</li>}
            {resultados.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-linha p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-suave">{p.email ?? "sem e-mail"}</p>
                  <VerId id={p.id} />
                </div>
                <Botao variante="discreto" onClick={() => setEscolhida({ ...p })}>
                  Escolher
                </Botao>
              </li>
            ))}
          </ul>
        )}
      </div>

      {escolhida && (
        <div role="region" aria-label={`Acessos de ${escolhida.name}`} className="space-y-4 rounded-2xl border-2 border-destaque p-5">
          <div>
            <p className="font-semibold">{escolhida.name}</p>
            <p className="text-sm text-suave">{escolhida.email ?? "sem e-mail"}</p>
            <VerId id={escolhida.id} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CHAVES.map((k) => (
              <Caixinha key={k} marcado={escolhida[k]} aoMudar={(v) => setEscolhida({ ...escolhida, [k]: v })}>
                <span className="block">{PERMISSOES[k]}</span><span className="mt-1 block text-xs font-normal text-suave">{DESCRICOES[k]}</span>
              </Caixinha>
            ))}
          </div>
          <p className="text-sm text-suave">Sem nenhuma caixa marcada, o acesso é revogado. Tudo fica registrado na auditoria.</p>
          <div className="flex flex-wrap gap-3">
            <Botao carregando={ocupado} onClick={salvar}>
              Salvar acessos
            </Botao>
            <Botao variante="discreto" onClick={() => setEscolhida(null)}>
              Cancelar
            </Botao>
          </div>
        </div>
      )}

      <details className="rounded-2xl border border-linha p-4">
        <summary className="cursor-pointer font-semibold">Auditoria de concessões e revogações</summary>
        {auditoria.length ? (
          <ul className="mt-4 space-y-3">
            {auditoria.map((a) => {
              const perms = CHAVES.filter((k) => a.permissions?.[k]).map((k) => PERMISSOES[k]);
              if (a.permissions?.review_profiles) perms.push(PERMISSOES.avaliar_perfis);
              if (a.permissions?.handle_reports) perms.push(PERMISSOES.tratar_denuncias);
              return (
                <li key={a.id} className="break-words border-b border-linha pb-3 text-sm">
                  {new Date(a.created_at).toLocaleString("pt-BR")} · {a.actor_name ?? "Conta removida"} · {ACAO[a.action] ?? a.action}
                  {a.action !== "bootstrap" && <> · {a.target_name ?? "Conta removida"}</>}
                  {perms.length > 0 && <> · {[...new Set(perms)].join(", ")}</>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-suave">Nenhuma ação registrada.</p>
        )}
      </details>
    </section>
  );
}
