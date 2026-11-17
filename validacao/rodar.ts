// Validação humana: roda os casos pelo MESMO prompt, entrada e validação da
// função publicada (supabase/functions/conversa-ia/core.ts).
// Parte manual declarada: roda fora do limite diário do produto.
//
// deno run --allow-read --allow-write=validacao --allow-env \
//   --allow-net=generativelanguage.googleapis.com \
//   validacao/rodar.ts --rodada 1 --versao-prompt v1
import {
  geminiBody,
  geminiUrl,
  PROMPTS,
  providerError,
  readGemini,
} from "../supabase/functions/conversa-ia/core.ts";
import { AREAS_PRO, GOALS_PRO, SITUACAO_PRO } from "../src/lib/professional.ts";
import { args, escreverCsv, lerCsv } from "./csv.ts";

const a = args(Deno.args);
const sair = (msg: string): never => {
  console.error(`Erro: ${msg}`);
  Deno.exit(1);
};
const rodada = a["rodada"];
if (rodada !== "1" && rodada !== "2") sair("use --rodada 1 ou --rodada 2.");
const versao = a["versao-prompt"];
if (!versao || !(versao in PROMPTS))
  sair(`use --versao-prompt ${Object.keys(PROMPTS).join(" ou ")}.`);
const key = Deno.env.get("GEMINI_API_KEY");
const model = Deno.env.get("GEMINI_MODEL");
if (!key) sair("defina GEMINI_API_KEY no ambiente (nunca no código ou no git).");
if (!model) sair("defina GEMINI_MODEL no ambiente, o mesmo da produção (ex.: gemini-2.5-flash-lite).");
if (!/^[a-z0-9.-]{3,80}$/.test(model!)) sair("GEMINI_MODEL inválido.");
const base = Deno.env.get("GEMINI_API_BASE") ?? "https://generativelanguage.googleapis.com"; // só para teste local
const pasta = a["saida"] || "validacao";
const casos = lerCsv(await Deno.readTextFile(a["casos"] || "validacao/casos.csv"));
if (!casos.length) sair("nenhum caso em casos.csv (linhas com # são ignoradas).");

const lista = (s: string) => s.split("|").map((x) => x.trim()).filter(Boolean);
const rot = (m: Record<string, string>, l: string[]) => l.map((k) => m[k] ?? k).join(", ");
// Entrada em português legível para as avaliadoras (rótulos, não chaves)
const um = (m: Record<string, string>, k: string) => m[k] ?? k;
const pessoa = (sit: string, area: string, inter: string, rotulo: string, assuntos: string) =>
  `Você hoje: ${um(SITUACAO_PRO, sit)}. Área: ${um(AREAS_PRO, area)}. Interesses: ${rot(AREAS_PRO, lista(inter)) || "nenhum"}. ${rotulo}: ${rot(GOALS_PRO, lista(assuntos)) || "nenhum"}.`;
const saidas: Record<string, unknown>[] = [];
const avaliacao: Record<string, unknown>[] = [];

for (const [n, c] of casos.entries()) {
  if (n > 0) await new Promise((r) => setTimeout(r, 1000)); // 1 s entre chamadas
  // mesmo formato que o banco entrega à função (mvp_claim_job)
  const job = {
    goal: c.objetivo,
    a: { situacao: c.pede_situacao, area_principal: c.pede_area, interesses: lista(c.pede_interesses), themes: lista(c.pede_quer_conversar) },
    b: { situacao: c.ajuda_situacao, area_principal: c.ajuda_area, interesses: lista(c.ajuda_interesses), themes: lista(c.ajuda_pode_ajudar) },
  };
  const linha: Record<string, unknown> = {
    caso: c.caso, versao_prompt: versao, modelo: model, data_hora: new Date().toISOString(),
    tokens_entrada: 0, tokens_saida: 0, justificativa: "", pergunta_1: "", pergunta_2: "", rascunho: "", erro: "",
  };
  try {
    if (!lista(c.ajuda_pode_ajudar).includes(c.objetivo))
      throw Error("objetivo_fora_do_pode_ajudar");
    const body = JSON.stringify(geminiBody(job, PROMPTS[versao])); // valida categorias antes de chamar
    const resp = await fetch(geminiUrl(model!, base), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key! },
      signal: AbortSignal.timeout(20000),
      body,
    }); // sem retentativa automática
    if (!resp.ok) throw Error(providerError(resp.status));
    const { usage, result } = readGemini(await resp.json());
    Object.assign(linha, {
      tokens_entrada: usage.input, tokens_saida: usage.output, justificativa: result.explanation,
      pergunta_1: result.questions[0], pergunta_2: result.questions[1], rascunho: result.draft,
    });
  } catch (e) {
    const u = (e as { usage?: { input: number; output: number } }).usage;
    if (u) Object.assign(linha, { tokens_entrada: u.input, tokens_saida: u.output });
    linha.erro = e instanceof Error ? e.message : "falha";
  }
  console.log(`${c.caso}: ${linha.erro || "ok"}`);
  saidas.push(linha);
  avaliacao.push({
    caso: c.caso,
    objetivo: GOALS_PRO[c.objetivo as keyof typeof GOALS_PRO] ?? c.objetivo,
    quem_pede: pessoa(c.pede_situacao, c.pede_area, c.pede_interesses, "Quer conversar sobre", c.pede_quer_conversar),
    quem_ajuda: pessoa(c.ajuda_situacao, c.ajuda_area, c.ajuda_interesses, "Pode ajudar com", c.ajuda_pode_ajudar),
    justificativa: linha.justificativa, pergunta_1: linha.pergunta_1, pergunta_2: linha.pergunta_2,
    rascunho: linha.rascunho, erro: linha.erro,
    A1_veredito: "", A1_comentario: "", A2_veredito: "", A2_comentario: "", A3_veredito: "", A3_comentario: "",
  });
}
await Deno.writeTextFile(`${pasta}/saidas-rodada-${rodada}.csv`, escreverCsv(Object.keys(saidas[0]), saidas));
await Deno.writeTextFile(`${pasta}/avaliacao-rodada-${rodada}.csv`, escreverCsv(Object.keys(avaliacao[0]), avaliacao));
console.log(`Pronto: ${pasta}/saidas-rodada-${rodada}.csv e ${pasta}/avaliacao-rodada-${rodada}.csv`);
