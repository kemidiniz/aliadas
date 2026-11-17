import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { GOALS_PRO, type ProRequest } from "../lib/professional";

// Histórico das 10 buscas mais recentes, recolhido (fica em Meu perfil).
export function MinhasBuscas({ eu }: { eu: string }) {
  const [buscas, setBuscas] = useState<(ProRequest & { convidada: boolean })[] | null>(null);
  async function carregar() {
    if (buscas) return;
    const [r, i] = await Promise.all([
      supabase.from("conversation_requests").select("*").eq("owner_id", eu).order("created_at", { ascending: false }).limit(10),
      supabase.from("conversation_invites").select("request_id").eq("sender_id", eu),
    ]);
    const enviados = new Set(((i.data as { request_id: string }[]) ?? []).map((x) => x.request_id));
    setBuscas(((r.data as ProRequest[]) ?? []).map((x) => ({ ...x, convidada: enviados.has(x.id) })));
  }
  useEffect(() => setBuscas(null), [eu]);
  return (
    <details onToggle={(e) => (e.currentTarget.open ? carregar() : undefined)} className="group">
      <summary className="cursor-pointer font-semibold text-destaque">Ver as 10 mais recentes</summary>
      {!buscas ? (
        <p className="mt-3 text-sm text-suave">Carregando…</p>
      ) : !buscas.length ? (
        <p className="mt-3 text-sm text-suave">Você ainda não fez nenhuma busca.</p>
      ) : (
        <ul className="mt-3 divide-y divide-linha">
          {buscas.map((b) => (
            <li key={b.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <span>{b.goal === "outro" && b.description ? b.description : GOALS_PRO[b.goal as keyof typeof GOALS_PRO] ?? b.goal}</span>
              <span className="text-suave">
                {new Date(b.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} ·{" "}
                {b.convidada ? "Convite enviado" : b.candidate_id ? "Com indicação" : "Ninguém compatível"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
