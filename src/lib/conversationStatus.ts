export type ConversationJobState = {
  state: string;
  mode: string;
  has_candidate: boolean;
  error_code?: string | null;
};
export function conversationStatus(
  job: ConversationJobState | null,
  searching = false,
  stalled = false,
) {
  if (searching) return "Encontrando uma aliada";
  if (!job) return "Consultando o resultado";
  if (!job.has_candidate) return "Nenhuma aliada disponível";
  if (job.mode === "generativa" && job.state === "concluida")
    return "Sugestão pronta";
  if (stalled)
    return "A IA está demorando: você pode continuar com compatibilidade básica";
  if (["pendente", "executando"].includes(job.state))
    return "Preparando a conversa com IA";
  if (["falha", "sem_consentimento"].includes(job.state))
    return "IA indisponível: mostrando compatibilidade básica";
  return "Compatibilidade básica: sem IA externa";
}
export const JOB_POLL_DELAYS = [0, 2000, 3000, 5000, 5000, 5000, 5000, 5000];
