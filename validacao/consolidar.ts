// Consolida as avaliações das duas rodadas. Regra do edital:
// caso aprovado = pelo menos 2 das 3 avaliadoras marcaram "aprovado".
// deno run --allow-read --allow-write=validacao validacao/consolidar.ts
import { args, lerCsv } from "./csv.ts";

const a = args(Deno.args);
const pasta = a["pasta"] || "validacao";
const VALIDOS = ["aprovado", "ajustar", "reprovado"];
const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
type Caso = { basicoAprovado: boolean; basicoCompleto: boolean; caso: string; vereditos: string[]; comentarios: string[]; aprovado: boolean; completo: boolean };

async function ler(n: number): Promise<Caso[] | null> {
  let txt: string;
  try { txt = await Deno.readTextFile(`${pasta}/avaliacao-rodada-${n}.csv`); } catch { return null; }
  return lerCsv(txt).map((l) => {
    const vereditos = [1, 2, 3].map((i) => norm(l[`A${i}_veredito`] ?? ""));
    const comentarios = [1, 2, 3].map((i) => (l[`A${i}_comentario`] ?? "").trim());
    return {
      caso: l.caso, vereditos, comentarios,
      basicoAprovado: [1,2,3].filter(i => norm(l[`B${i}_veredito`] ?? "") === "aprovado").length >= 2,
      basicoCompleto: [1,2,3].every(i => VALIDOS.includes(norm(l[`B${i}_veredito`] ?? ""))),
      completo: vereditos.every((v) => VALIDOS.includes(v)),
      aprovado: vereditos.filter((v) => v === "aprovado").length >= 2,
    };
  });
}
const r1 = await ler(1), r2 = await ler(2);
if (!r1) { console.error("Erro: falta validacao/avaliacao-rodada-1.csv"); Deno.exit(1); }
const pct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const taxa = (r: Caso[]) => { const c = r.filter((x) => x.completo); return c.length ? c.filter((x) => x.aprovado).length / c.length : null; };
const md: string[] = ["# Resultado da validação humana", "", "Regra: caso aprovado quando pelo menos 2 das 3 avaliadoras marcam \"aprovado\". A taxa considera só casos com os 3 vereditos válidos.", ""];
md.push("| Rodada | Casos avaliados | Aprovados | Taxa |", "|---|---|---|---|");
for (const [n, r] of [[1, r1], [2, r2]] as const) {
  if (!r) { md.push(`| ${n} | — | — | não realizada |`); continue; }
  const c = r.filter((x) => x.completo), t = taxa(r);
  md.push(`| ${n} | ${c.length} de ${r.length} | ${c.filter((x) => x.aprovado).length} | ${t === null ? "sem dados" : pct(t)} |`);
}
const t1 = taxa(r1), t2 = r2 ? taxa(r2) : null;
if (t1 !== null && t2 !== null) {
  const d = (t2 - t1) * 100;
  md.push("", `Diferença da rodada 2 para a 1: ${d >= 0 ? "+" : ""}${d.toFixed(1).replace(".", ",")} pontos percentuais.`);
  const piorou = r1.filter((c) => c.completo && c.aprovado && r2!.find((x) => x.caso === c.caso && x.completo && !x.aprovado)).map((c) => c.caso);
  md.push("", `Casos que pioraram (aprovados na 1, não aprovados na 2): ${piorou.length ? piorou.join(", ") : "nenhum"}.`);
}
const incompletos = [...r1, ...(r2 ?? [])].filter((x) => !x.completo).map((x) => x.caso);
if (incompletos.length) md.push("", `Atenção: vereditos faltando ou fora de aprovado/ajustar/reprovado em: ${[...new Set(incompletos)].join(", ")}.`);
for (const [n, r] of [[1, r1], [2, r2]] as const) {
  if (!r) continue;
  md.push("", `## Comentários da rodada ${n} (casos com "ajustar" ou "reprovado")`, "");
  const comparaveis = r.filter(c => c.completo && c.basicoCompleto);
  const ganho = comparaveis.filter(c => c.aprovado && !c.basicoAprovado);
  const regressao = comparaveis.filter(c => !c.aprovado && c.basicoAprovado);
  md.push(`Comparação com plano B: ${comparaveis.length} casos com avaliações completas dos dois métodos. IA aprovada onde a regra não foi: ${ganho.length}. Regra aprovada onde a IA não foi: ${regressao.length}.`);
  if (ganho.length) md.push(`Casos de ganho: ${ganho.map(c=>c.caso).join(", ")}.`);
  const grupos = new Map<string, string[]>();
  for (const c of r) for (const comentario of c.comentarios) if (comentario) grupos.set(comentario, [...(grupos.get(comentario) ?? []), c.caso]);
  md.push("", "Comentários agrupados:");
  for (const [comentario, ids] of grupos) md.push(`- ${comentario}: ${[...new Set(ids)].join(", ")}`);
  const com = r.filter((c) => c.vereditos.some((v) => v === "ajustar" || v === "reprovado"));
  if (!com.length) md.push("Nenhum.");
  for (const c of com) {
    md.push(`**${c.caso}** (${c.aprovado ? "aprovado" : "não aprovado"})`);
    c.vereditos.forEach((v, i) => { if (v !== "aprovado" && (v || c.comentarios[i])) md.push(`- A${i + 1} · ${v || "sem veredito"}: ${c.comentarios[i] || "sem comentário"}`); });
    md.push("");
  }
}
await Deno.writeTextFile(`${pasta}/resultado.md`, md.join("\n") + "\n");
console.log(`Pronto: ${pasta}/resultado.md`);
