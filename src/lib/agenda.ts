// Horários em Brasília (UTC-3, sem horário de verão desde 2019).
const HORA: Record<string, number> = { manha: 9, tarde: 14, noite: 19 };
const DURACAO_MIN = 45;

export function isoBrasilia(data: string, hora: string) {
  return new Date(`${data}T${hora}:00-03:00`).toISOString();
}
function partesBrasilia(d: Date) {
  const b = new Date(d.getTime() - 3 * 3600_000);
  return {
    data: b.toISOString().slice(0, 10),
    hora: b.toISOString().slice(11, 16),
    dow: b.getUTCDay(), // 0 = domingo
  };
}
export const hojeBrasilia = () => partesBrasilia(new Date()).data;
export const limiteBrasilia = () =>
  partesBrasilia(new Date(Date.now() + 14 * 86400_000)).data;

// Até 3 sugestões nos próximos 14 dias, a partir dos períodos em comum
// (ou de quaisquer períodos informados). slot = "1_manha" (1 = segunda).
export function sugerirHorarios(slots: string[], max = 3): string[] {
  const out: string[] = [];
  const agora = Date.now() + 12 * 3600_000; // ao menos 12h de antecedência
  for (let dia = 0; dia < 14 && out.length < max; dia++) {
    const d = partesBrasilia(new Date(agora + dia * 86400_000));
    const num = d.dow === 0 ? 7 : d.dow;
    for (const s of slots) {
      const [n, per] = s.split("_");
      if (Number(n) !== num || !(per in HORA)) continue;
      const iso = isoBrasilia(d.data, `${String(HORA[per]).padStart(2, "0")}:00`);
      if (new Date(iso).getTime() > agora && !out.includes(iso)) out.push(iso);
      if (out.length >= max) break;
    }
  }
  return out;
}

export function formatarHorario(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const utc = (d: Date) =>
  d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function linkGoogleAgenda(iso: string, titulo: string, sala?: string | null) {
  const ini = new Date(iso);
  const fim = new Date(ini.getTime() + DURACAO_MIN * 60_000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: `${utc(ini)}/${utc(fim)}`,
    details: sala ? `Sala: ${sala}` : "Combinem o link pelo contato liberado.",
  });
  if (sala) p.set("location", sala);
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function baixarIcs(iso: string, titulo: string, sala?: string | null, uid = "conversa") {
  const ini = new Date(iso);
  const fim = new Date(ini.getTime() + DURACAO_MIN * 60_000);
  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//aliadas//conversa//PT",
    "BEGIN:VEVENT",
    `UID:${uid}@aliadas`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(ini)}`,
    `DTEND:${utc(fim)}`,
    `SUMMARY:${esc(titulo)}`,
    sala ? `LOCATION:${esc(sala)}` : "",
    `DESCRIPTION:${esc(sala ? `Sala: ${sala}` : "Combinem o link pelo contato liberado.")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const url = URL.createObjectURL(
    new Blob([linhas.join("\r\n")], { type: "text/calendar" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "conversa-aliadas.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Sala válida (mesma regra da migration 016)
export const SALA_VALIDA =
  /^https:\/\/(meet\.google\.com|([a-z0-9-]+\.)?zoom\.us|teams\.microsoft\.com|teams\.live\.com|([a-z0-9-]+\.)?whereby\.com|meet\.jit\.si)\/[A-Za-z0-9._~%/?=&#+-]+$/;
