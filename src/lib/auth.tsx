import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Perfil } from "./tipos";

export type AdminAccess = {
  principal: boolean;
  legacy: boolean;
  review_profiles: boolean;
  handle_reports: boolean;
  ver_visao_geral?: boolean;
  ver_feedback?: boolean;
  ver_ia_automacoes?: boolean;
};
const NO_ADMIN: AdminAccess = {
  principal: false,
  legacy: false,
  review_profiles: false,
  handle_reports: false,
};

type AuthCtx = {
  session: Session | null;
  perfil: Perfil | null;
  curadora: boolean;
  adminAccess: AdminAccess;
  carregando: boolean;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [adminAccess, setAdminAccess] = useState<AdminAccess>(NO_ADMIN);
  const revision = useRef(0);
  const curadora =
    adminAccess.principal ||
    adminAccess.legacy ||
    adminAccess.review_profiles ||
    adminAccess.handle_reports ||
    Boolean(adminAccess.ver_visao_geral || adminAccess.ver_feedback || adminAccess.ver_ia_automacoes);
  const [carregando, setCarregando] = useState(true);

  const carregarDados = useCallback(async (s: Session | null) => {
    const requestRevision = ++revision.current;
    if (!s) {
      setPerfil(null);
      setAdminAccess(NO_ADMIN);
      return true;
    }
    const [{ data: p }, { data: r }, access] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase
        .from("roles")
        .select("role")
        .eq("user_id", s.user.id)
        .eq("role", "curadora")
        .maybeSingle(),
      supabase.rpc("mvp_admin_access"),
    ]);
    if (requestRevision !== revision.current) return false;
    setPerfil((p as Perfil) ?? null);
    if (!access.error && access.data && !Array.isArray(access.data))
      setAdminAccess(access.data as AdminAccess);
    else if (["PGRST202", "42883"].includes(access.error?.code ?? "") && r)
      setAdminAccess({
        principal: false,
        legacy: true,
        review_profiles: true,
        handle_reports: true,
        ver_visao_geral: true,
        ver_feedback: true,
        ver_ia_automacoes: true,
      });
    else setAdminAccess(NO_ADMIN);
    return true;
  }, []);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      const applied = await carregarDados(data.session);
      if (ativo && applied) setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      // link de "esqueci a senha" aberto: leva para criar a senha nova
      if (evento === "PASSWORD_RECOVERY")
        sessionStorage.setItem(CHAVE_NOVA_SENHA, "1");
      setSession(s);
      // fora do callback para não travar o cliente do Supabase
      setTimeout(
        () =>
          carregarDados(s).then((applied) => {
            if (ativo && applied) setCarregando(false);
          }),
        0,
      );
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [carregarDados]);

  const recarregar = useCallback(async () => {
    await carregarDados(session);
  }, [carregarDados, session]);
  useEffect(() => {
    const refresh = () => {
      if (session) carregarDados(session);
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [session, carregarDados]);
  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        perfil,
        curadora,
        adminAccess,
        carregando,
        recarregar,
        sair,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}

// marca que a pessoa veio do "esqueci a senha" (some depois que ela cria a nova)
export const CHAVE_NOVA_SENHA = "aliadas-nova-senha";
