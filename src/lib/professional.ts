export const AREAS_PRO = {
  tecnologia: "tecnologia",
  educacao: "educação",
  saude: "saúde",
  negocios: "negócios e gestão",
  comunicacao: "comunicação",
  artes: "artes e criação",
  ciencias: "ciências",
  direito: "direito",
  engenharia: "engenharia",
  servicos: "serviços",
  outras: "outras áreas",
};
export const GOALS_PRO = {
  situacao: "conversar sobre uma situação profissional",
  entrevista: "preparar uma entrevista de emprego",
  apresentacao: "treinar uma apresentação profissional",
  portfolio: "receber feedback sobre um portfólio",
  carreira: "trocar dicas e conselhos de carreira",
  rede: "ampliar a rede de contatos",
  projeto: "receber uma opinião sobre um projeto",
  outro: "outro objetivo profissional",
};
export const MOMENTS_PRO = {
  estudante: "estudando ou em formação",
  inicio: "começando a carreira",
  transicao: "em transição de carreira",
  experiente: "com experiência profissional",
};
export const CHANNELS_PRO = {
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  email: "e-mail",
  meet: "Google Meet",
};
export const INTENTIONS_PRO = {
  buscar: "busco uma troca",
  compartilhar: "quero compartilhar",
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
  themes: string[];
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
  intention: string;
};
export type ProInvite = {
  id: string;
  request_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  state: string;
  sender_time: string | null;
  recipient_time: string | null;
};
