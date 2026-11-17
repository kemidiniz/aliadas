import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { IconeConversas, IconeInicio, IconePainel, IconePerfil } from "./Icones";

// Navegação inferior no celular (só para quem entrou).
export function NavInferior() {
  const { session, curadora } = useAuth();
  const local = useLocation();
  const [pendentes, setPendentes] = useState(0);
  useEffect(() => {
    if (!session) return;
    supabase
      .from("conversation_invites")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", session.user.id)
      .eq("state", "pendente")
      .then(({ count }) => setPendentes(count ?? 0));
  }, [session, local.pathname]);
  if (!session) return null;
  const itens = [
    { to: "/", rotulo: "Início", Icone: IconeInicio, n: 0 },
    { to: "/minhas-conversas", rotulo: "Conversas", Icone: IconeConversas, n: pendentes },
    { to: "/meu-perfil", rotulo: "Perfil", Icone: IconePerfil, n: 0 },
    ...(curadora ? [{ to: "/painel", rotulo: "Painel", Icone: IconePainel, n: 0 }] : []),
  ];
  return (
    <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-fundo pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className={`grid ${curadora ? "grid-cols-4" : "grid-cols-3"}`}>
        {itens.map(({ to, rotulo, Icone, n }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${isActive ? "text-destaque" : "text-suave"}`
              }
            >
              <span className="relative">
                <Icone className="h-6 w-6" />
                {n > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs text-vinho-noite">
                    {n}
                    <span className="sr-only"> convites pendentes</span>
                  </span>
                )}
              </span>
              {rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
