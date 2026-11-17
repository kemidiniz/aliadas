export type ConversationJobState = { state: string; mode: string; has_candidate: boolean; error_code?: string | null };
export function conversationStatus(job: ConversationJobState | null, searching = false, stalled = false) {
  if (searching) return "A IA está procurando quem pode ajudar…";
  if (!job) return "Encontrando uma aliada";
  if (stalled || job.error_code === "tempo_esgotado") return "A IA está demorando. Mostramos uma indicação pelas habilidades.";
  if (["pendente", "executando"].includes(job.state)) return "A IA está procurando quem pode ajudar…";
  if (!job.has_candidate) return "Ninguém compatível agora. Tente outro objetivo ou volte em alguns dias.";
  if (job.mode === "ia" && job.state === "concluida") return "Indicação pronta";
  return "Indicação pelas habilidades, sem IA.";
}
export const JOB_POLL_DELAYS = [0, 2000, 3000, 5000, 5000];
