// Testa validacao/rodar.ts e consolidar.ts com um Gemini SIMULADO (sem chamada real).
// Casos fictícios ficam numa pasta temporária, fora de validacao/.
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
import assert from "node:assert/strict";
const deno = process.env.DENO || "deno";
try { execFileSync(deno, ["--version"]); } catch { console.log("PULADO: Deno não instalado (defina DENO=caminho)"); process.exit(0); }
const pedidos = [];
let n = 0;
const srv = createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c));
  req.on("end", () => {
    pedidos.push({ url: req.url, key: req.headers["x-goog-api-key"], body: JSON.parse(b) });
    n++;
    res.setHeader("content-type", "application/json");
    if (n === 2) return res.end(JSON.stringify({ usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 10 }, candidates: [{ content: { parts: [{ text: '{"explanation":"x"}' }] } }] }));
    res.end(JSON.stringify({ usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 80 }, candidates: [{ content: { parts: [{ text: JSON.stringify({ explanation: "Justificativa simulada.", questions: ["Pergunta simulada um?", "Pergunta simulada dois?"], draft: "Rascunho simulado." }) }] } }] }));
  });
}).listen(0);
const porta = srv.address().port;
const dir = mkdtempSync(join(tmpdir(), "validacao-"));
writeFileSync(join(dir, "casos.csv"), [
  "caso,objetivo,quem_pede_areas,quem_pede_momento,quem_pede_quer_conversar,quem_ajuda_areas,quem_ajuda_momento,quem_ajuda_pode_ajudar,observacao",
  "# comentário ignorado",
  "T01,entrevista,tecnologia,transicao,entrevista|carreira,tecnologia,experiente,entrevista,NÃO ENVIAR ESTA NOTA",
  "T02,portfolio,artes,inicio,,artes|comunicacao,experiente,portfolio,teste",
].join("\n"));
const env = { ...process.env, GEMINI_API_KEY: "chave-falsa-do-teste", GEMINI_MODEL: "modelo-teste", GEMINI_API_BASE: `http://127.0.0.1:${porta}` };
const rodar = (extra) => run(deno, ["run", "--no-lock", "--allow-read", `--allow-write=${dir}`, "--allow-env", "--allow-net=127.0.0.1", "validacao/rodar.ts", "--casos", join(dir, "casos.csv"), "--saida", dir, ...extra], { env, encoding: "utf8" });
try {
  // falha clara sem chave
  assert.throws(() => execFileSync(deno, ["run", "--no-lock", "--allow-read", "--allow-env", "validacao/rodar.ts", "--rodada", "1", "--versao-prompt", "v1"], { env: { ...process.env, GEMINI_API_KEY: "" }, stdio: "pipe" }), /GEMINI_API_KEY/);
  console.log("PASSOU: falta de chave gera mensagem clara");
  const t0 = Date.now();
  await rodar(["--rodada", "1", "--versao-prompt", "v1"]);
  assert(Date.now() - t0 >= 1000, "pausa de 1 s entre chamadas");
  assert.equal(pedidos.length, 2, "uma chamada por caso, sem retentativa");
  const p = pedidos[0];
  assert.equal(p.url, "/v1beta/models/modelo-teste:generateContent");
  const entrada = JSON.parse(p.body.contents[0].parts[0].text);
  assert.deepEqual(entrada, { objetivo: "entrevista", quemBusca: { areas: ["tecnologia"], momento: "transicao", temas: ["entrevista", "carreira"] }, quemPodeAjudar: { areas: ["tecnologia"], momento: "experiente", temas: ["entrevista"] } });
  assert(!JSON.stringify(p.body).includes("NÃO ENVIAR"), "observação não vai ao Gemini");
  const core = readFileSync("supabase/functions/conversa-ia/core.ts", "utf8");
  assert(p.body.systemInstruction.parts[0].text.length > 100 && core.includes(p.body.systemInstruction.parts[0].text.slice(0, 60)), "mesmo SYSTEM da produção");
  console.log("PASSOU: mesmo prompt e mesma entrada mínima da produção, 1 chamada por caso, pausa de 1 s");
  const saidas = readFileSync(join(dir, "saidas-rodada-1.csv"), "utf8");
  assert.match(saidas, /^﻿caso,versao_prompt,modelo,data_hora,tokens_entrada,tokens_saida,justificativa,pergunta_1,pergunta_2,rascunho,erro/);
  assert.match(saidas, /T01,v1,modelo-teste,[^,]+,120,80,Justificativa simulada\.,Pergunta simulada um\?/);
  assert.match(saidas, /T02,v1,modelo-teste,[^,]+,50,10,,,,,saida_invalida/);
  console.log("PASSOU: saída validada com as regras da função; erro e tokens registrados");
  let av = readFileSync(join(dir, "avaliacao-rodada-1.csv"), "utf8");
  assert.match(av, /A1_veredito,A1_comentario,A2_veredito,A2_comentario,A3_veredito,A3_comentario/);
  assert.match(av, /Preparar uma entrevista/);
  // simula avaliações preenchidas
  const preencher = (txt, v) => txt.split("\n").map((l, i) => (i === 0 || !l ? l : l + v[i - 1])).join("\n");
  writeFileSync(join(dir, "avaliacao-rodada-1.csv"), preencher(av.replace(/,,,,,,\n/g, "\n").replace(/,,,,,,$/g, ""), [",aprovado,,aprovado,,ajustar,tom formal", ",reprovado,sem perguntas,ajustar,,aprovado,"]));
  pedidos.length = 0; n = 0;
  await rodar(["--rodada", "2", "--versao-prompt", "v2"]);
  av = readFileSync(join(dir, "avaliacao-rodada-2.csv"), "utf8");
  writeFileSync(join(dir, "avaliacao-rodada-2.csv"), preencher(av.replace(/,,,,,,\n/g, "\n").replace(/,,,,,,$/g, ""), [",ajustar,curto,reprovado,errado,aprovado,", ",aprovado,,aprovado,,Aprovado,"]));
  execFileSync(deno, ["run", "--no-lock", "--allow-read", `--allow-write=${dir}`, "validacao/consolidar.ts", "--pasta", dir], { stdio: "pipe" });
  const md = readFileSync(join(dir, "resultado.md"), "utf8");
  assert.match(md, /\| 1 \| 2 de 2 \| 1 \| 50,0% \|/);
  assert.match(md, /\| 2 \| 2 de 2 \| 1 \| 50,0% \|/);
  assert.match(md, /\+0,0 pontos percentuais/);
  assert.match(md, /pioraram[^:]*: T01\./);
  assert.match(md, /A2 · ajustar: sem comentário/);
  assert.match(md, /A3 · ajustar: tom formal/);
  console.log("PASSOU: consolidação com regra dos 2 de 3, diferença em p.p., casos que pioraram e comentários");
  assert(!existsSync("validacao/saidas-rodada-1.csv"), "teste não grava em validacao/");
} finally { srv.close(); }
