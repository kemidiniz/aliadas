import { useEffect, type RefObject } from "react";
import { useBlocker } from "react-router-dom";
export const chaveRascunhoPerfil = (uid: string) => `aliadas:rascunho-perfil:${uid}`;
export function limparRascunhosPerfil() {
  for (const key of Object.keys(sessionStorage))
    if (key.startsWith("aliadas:rascunho-perfil:")) sessionStorage.removeItem(key);
}
export function useAvisoPerfil(sujo: boolean, liberado: RefObject<boolean>) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    sujo && !liberado.current && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    let ativo = true;
    queueMicrotask(() => {
      if (!ativo) return;
      if (window.confirm("Você tem mudanças não salvas. Sair mesmo assim?")) blocker.proceed();
      else blocker.reset();
    });
    return () => { ativo = false; };
  }, [blocker]);
  useEffect(() => {
    if (!sujo) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);
}
