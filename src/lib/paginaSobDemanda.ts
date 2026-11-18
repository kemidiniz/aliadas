import { lazy, type ComponentType } from "react";

const CHAVE_RECARGA = "aliadas:recuperacao-de-pagina";
const INTERVALO_RECARGA = 60_000;

export function erroDeModulo(erro: unknown): boolean {
  return erro instanceof Error && /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk .+ failed/i.test(erro.message);
}

function atualizarUmaVez(erro: unknown) {
  if (!erroDeModulo(erro) || !navigator.onLine) return;
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE_RECARGA) || 0);
    if (Date.now() - ultima < INTERVALO_RECARGA) return;
    // A trava precisa sobreviver à recarga. Se o armazenamento estiver bloqueado,
    // oferecemos o botão de tentar novamente em vez de arriscar um ciclo.
    sessionStorage.setItem(CHAVE_RECARGA, String(Date.now()));
  } catch { return; }
  window.location.reload();
}

// Uma aba aberta pode guardar os nomes dos arquivos de uma publicação anterior.
// Recupera a versão atual preservando URL e sessão, sem repetir envios ou RPCs.
export function paginaSobDemanda<T extends ComponentType<any>>(carregar: () => Promise<{ default: T }>) {
  return lazy(() => carregar().catch(erro => {
    atualizarUmaVez(erro);
    // Se a recarga falhar ou for cancelada, a página mostra a recuperação manual.
    throw erro;
  }));
}
