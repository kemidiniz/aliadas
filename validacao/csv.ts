// CSV simples (RFC 4180): vírgula, aspas duplas, linhas com # ignoradas.
export function lerCsv(texto: string): Record<string, string>[] {
  const linhas = parse(texto.replace(/^﻿/, ""));
  const cab = linhas.shift()?.map((c) => c.trim()) ?? [];
  return linhas
    .filter((l) => l.some((c) => c.trim()) && !l[0]?.trim().startsWith("#"))
    .map((l) => Object.fromEntries(cab.map((c, i) => [c, (l[i] ?? "").trim()])));
}
function parse(t: string): string[][] {
  const out: string[][] = [];
  let linha: string[] = [], campo = "", aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === ",") { linha.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); out.push(linha); linha = []; campo = "";
    } else campo += ch;
  }
  if (campo || linha.length) { linha.push(campo); out.push(linha); }
  return out;
}
const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// BOM para Excel e Planilhas Google abrirem os acentos corretamente
export const escreverCsv = (cab: string[], linhas: Record<string, unknown>[]) =>
  "﻿" + [cab.join(","), ...linhas.map((l) => cab.map((c) => esc(l[c])).join(","))].join("\n") + "\n";
export function args(argv: string[]) {
  const a: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++)
    if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[i + 1] ?? "";
  return a;
}
