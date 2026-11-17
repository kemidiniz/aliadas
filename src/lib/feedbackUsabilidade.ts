export const PERGUNTAS_USABILIDADE = [
  { campo: "clareza_fluxo", titulo: "Ficou claro o próximo passo em cada tela?", extremos: ["1 — Nada claro", "5 — Muito claro"], extras: [] },
  { campo: "adequacao_ia", titulo: "As habilidades sugeridas pela IA combinaram com seu objetivo?", extremos: ["1 — Não combinaram", "5 — Combinaram muito"], extras: [{ valor: "nao_usei", rotulo: "Não usei a IA" }, { valor: "sem_sugestoes", rotulo: "A IA não trouxe sugestões" }] },
  { campo: "acompanhar_convites", titulo: "Foi fácil encontrar onde acompanhar seus convites?", extremos: ["1 — Muito difícil", "5 — Muito fácil"], extras: [{ valor: "nao_cheguei", rotulo: "Não enviei nem recebi convites" }] },
] as const;
export const RESPOSTAS_USABILIDADE: Record<string,string> = {nao_usei:"Não usou a IA",sem_sugestoes:"IA não trouxe sugestões",nao_cheguei:"Não chegou à etapa de convites"};
export const respostaUsabilidade = (v: string | null | undefined) => v ? RESPOSTAS_USABILIDADE[v] ?? `${v} de 5` : "Não respondeu";

export const medidaParaCsv = (v: string | null | undefined): string | number => v && /^[1-5]$/.test(v) ? Number(v) : v ? RESPOSTAS_USABILIDADE[v] ?? "" : "";
