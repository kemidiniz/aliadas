import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { CampoTexto } from "../components/Campo";
import { Botao } from "../components/Botao";
import { Aviso, Carregando } from "../components/Aviso";
import { mensagemAmigavel } from "../lib/erros";
type Member = {
  id: string;
  name: string;
  ambassador: boolean;
  review_profiles: boolean;
  handle_reports: boolean;
};
type Audit = {
  id: string;
  actor_id: string;
  target_id: string;
  action: string;
  created_at: string;
};
export default function Embaixadoras() {
  const { adminAccess } = useAuth();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const [m, a] = await Promise.all([
      supabase.rpc("mvp_admin_members", { search }),
      supabase.rpc("mvp_admin_audit"),
    ]);
    if (m.error || a.error)
      setMsg("Não foi possível consultar as autorizações.");
    else {
      setMembers(m.data);
      setAudit(a.data);
    }
  }
  useEffect(() => {
    if (adminAccess.principal) load();
  }, [adminAccess.principal]);
  async function save(m: Member, enabled: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("mvp_manage_ambassador", {
      target: m.id,
      review_profiles: m.review_profiles,
      handle_reports: m.handle_reports,
      enabled,
    });
    setMsg(
      error ? mensagemAmigavel(error) : "Autorização registrada na auditoria.",
    );
    setBusy(false);
    if (!error) await load();
  }
  if (!adminAccess.principal)
    return (
      <Aviso tipo="erro">
        Somente a administradora principal pode gerenciar embaixadoras.
      </Aviso>
    );
  return (
    <section>
      <h2>Embaixadoras</h2>
      <p className="mt-3 text-suave">
        Autorize uma participante existente por seu identificador de conta.
        Nenhuma embaixadora pode delegar permissões ou acessar contatos privados
        por esta função.
      </p>
      <form
        className="my-6 flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <div className="min-w-0 flex-1">
          <CampoTexto
            rotulo="Buscar participante por nome ou ID da conta"
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Botao type="submit" variante="secundario">
          Consultar
        </Botao>
      </form>
      {msg && <Aviso>{msg}</Aviso>}
      {!members ? (
        <Carregando />
      ) : (
        <ul className="mt-5 space-y-5">
          {members.map((m) => (
            <li key={m.id} className="rounded-xl border border-linha p-5">
              <h3>{m.name}</h3>
              <p className="my-2 break-all text-xs text-suave">
                ID conferível no Supabase Auth: {m.id}
              </p>
              <p className="mb-3 text-sm">
                {m.ambassador ? "Embaixadora autorizada" : "Participante comum"}
              </p>
              <div className="flex flex-wrap gap-5">
                {(["review_profiles", "handle_reports"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={m[k]}
                      onChange={(e) =>
                        setMembers(
                          members.map((x) =>
                            x.id === m.id ? { ...x, [k]: e.target.checked } : x,
                          ),
                        )
                      }
                    />
                    {k === "review_profiles"
                      ? "Avaliar perfis"
                      : "Tratar denúncias"}
                  </label>
                ))}
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-destaque underline">
                  Revisar autorização
                </summary>
                <p className="my-3 text-sm">
                  Confirme o ID da participante acima e as atribuições
                  selecionadas. A ação será registrada com a sua conta.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Botao carregando={busy} onClick={() => save(m, true)}>
                    {m.ambassador
                      ? "Salvar permissões"
                      : "Conceder papel de embaixadora"}
                  </Botao>
                  {m.ambassador && (
                    <Botao
                      variante="perigo"
                      carregando={busy}
                      onClick={() => save(m, false)}
                    >
                      Revogar acesso de embaixadora
                    </Botao>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      <h3 className="mt-10">Auditoria de concessões e revogações</h3>
      {audit.length ? (
        <ul className="mt-4 space-y-3">
          {audit.map((a) => (
            <li
              key={a.id}
              className="break-words border-b border-linha pb-3 text-sm"
            >
              {new Date(a.created_at).toLocaleString("pt-BR")} · {a.action} ·
              Conta: {a.target_id}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-suave">Nenhuma ação registrada.</p>
      )}
    </section>
  );
}
