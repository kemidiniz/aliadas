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
};
// Objetivos de conversa (mesmas chaves do banco)
export const GOALS_PRO = {
  situacao: "Uma situação no trabalho",
  entrevista: "Preparar uma entrevista",
  apresentacao: "Treinar uma apresentação",
  portfolio: "Feedback de portfólio",
  carreira: "Dicas de carreira",
  rede: "Ampliar a rede de contatos",
  projeto: "Opinião sobre um projeto",
  outro: "Outro objetivo profissional",
};
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
  occupation: string;
  moment: string;
  areas: string[];
  can_help: string[];
  want_talk: string[];
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
  common_slots?: string[];
};
export type ProCard = {
  id: string;
  name: string;
  occupation: string;
  areas: string[];
  moment: string;
};
export type ProRequest = {
  id: string;
  candidate_id: string | null;
  state: string;
  mode: string;
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
};
export type ProProposal = {
  id: string;
  invite_id: string;
  autora: string;
  inicio: string;
};
export const label = (map: Record<string, string>, k: string) => map[k] ?? k;
