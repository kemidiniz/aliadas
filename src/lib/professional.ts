export const AREAS_PRO = {
  tecnologia: "Tecnologia",
  educacao: "Educação",
  saude: "Saúde",
  negocios: "Negócios e gestão",
  comunicacao: "Comunicação",
  artes: "Artes e criação",
  ciencias: "Ciências",
  direito: "Direito",
  engenharia: "Engenharia",
  servicos: "Serviços",
  outras: "Outras áreas",
  decidindo: "Ainda estou decidindo",
};
// "Você hoje" (escolha única); substitui o momento de carreira na tela
export const SITUACAO_PRO = {
  trabalho: "Trabalho",
  estudo: "Estudo",
  trabalho_estudo: "Trabalho e estudo",
  transicao: "Em transição de carreira",
  buscando: "Buscando trabalho",
};
// Objetivos de conversa (mesmas chaves do banco)
export const GOALS_PRO = {
  situacao: "Uma situação no trabalho",
  entrevista: "Se preparar para uma entrevista",
  apresentacao: "Treinar uma apresentação",
  portfolio: "Feedback de portfólio",
  carreira: "Dicas de carreira",
  rede: "Ampliar a rede de contatos",
  projeto: "Opinião sobre um projeto",
  outro: "Outro objetivo profissional",
};
// Legado: não aparece mais na tela (a situação substitui o momento)
export const MOMENTS_PRO = {
  estudante: "Estudando ou em formação",
  inicio: "Começando a carreira",
  transicao: "Em transição de carreira",
  experiente: "Com experiência profissional",
};
// Canais de contato liberados após o aceite (a sala de chamada é um campo à parte)
export const CHANNELS_PRO = {
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meet: "Google Meet",
};
export const DAYS_PRO = [
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
];
export const slotsLabel = (slot: string) => {
  const [day, period] = slot.split("_");
  return `${DAYS_PRO[Number(day) - 1]} · ${period === "manha" ? "manhã" : period === "tarde" ? "tarde" : "noite"}`;
};
export type ProProfile = {
  profile_id: string;
  occupation: string | null;
  moment: string | null;
  areas: string[];
  situacao: string;
  area_principal: string;
  interesses: string[];
  can_help: string[];
  habilidades: string[];
  want_talk: string[];
  intentions: string[];
  channels: string[];
  slots: string[];
  ai_consent: boolean;
  available: boolean;
};
export type ProContacts = {
  linkedin: string | null;
  whatsapp: string | null;
  email: string | null;
  meet: string | null;
  nome_completo?: string | null;
  common_slots?: string[];
};
export type ProCard = {
  id: string;
  name: string;
  foto_path?: string | null;
  occupation: string | null;
  areas: string[];
  moment: string | null;
  situacao?: string;
  area_principal?: string;
  interesses?: string[];
  conversas?: number;
  marcas?: string[];
};
export type ProRequest = {
  id: string;
  candidate_id: string | null;
  state: string;
  mode: string;
  habilidades_necessarias: string[];
  habilidades_que_ajudam: string[];
  next_count: number;
  explanation: string;
  questions: string[];
  draft: string | null;
  goal: string;
  description: string | null;
  created_at: string;
};
export type ProInvite = {
  id: string;
  request_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  state: string;
  created_at: string;
  responded_at: string | null;
  horario_confirmado: string | null;
  goal?: string | null;
  goal_text?: string | null;
};
export type ProProposal = {
  id: string;
  invite_id: string;
  autora: string;
  inicio: string;
};
export const label = (map: Record<string, string>, k: string) => map[k] ?? k;

// Perfil completo para buscar e ser indicada (mesma regra de mvp_pode_buscar + assuntos)
export function perfilCompleto(p: ProProfile | null) {
  if (!p) return false;
  return Boolean(p.situacao && p.area_principal) && p.interesses.length > 0 && p.channels.some((c) => c in CHANNELS_PRO);
}

