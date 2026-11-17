// Parte manual da validação, não comprova o gatilho automático em produção.
// Usa exatamente o prompt, esquema, minimização e validação da Edge Function.
import { geminiBody, geminiUrl, PROMPTS, providerError, readGemini, fallback } from "../supabase/functions/conversa-ia/core.ts";
import { nomeHabilidade, IDS_HABILIDADES } from "../supabase/functions/_shared/habilidades.ts";
import { AREAS_PRO, GOALS_PRO, SITUACAO_PRO } from "../src/lib/professional.ts";
import { args, escreverCsv, lerCsv } from "./csv.ts";
const a = args(Deno.args);
const fail = (msg: string): never => { console.error(`Erro: ${msg}`); Deno.exit(1); };
const rodada = a.rodada;
if (!["1", "2"].includes(rodada)) fail("use --rodada 1 ou 2.");
const versao = a["versao-prompt"] || (rodada === "1" ? "v1" : "v2");
if (!(versao in PROMPTS)) fail("versão de prompt inválida.");
const key = Deno.env.get("GEMINI_API_KEY") || "", model = Deno.env.get("GEMINI_MODEL") || "";
if (!key || !model || !/^[a-z0-9.-]{3,80}$/.test(model)) fail("configure GEMINI_API_KEY e GEMINI_MODEL em segredo no ambiente.");
if (Deno.env.get("GEMINI_FREE_TIER_CONFIRMED") !== "true") fail("confirme o projeto sem faturamento com GEMINI_FREE_TIER_CONFIRMED=true.");
const base = Deno.env.get("GEMINI_API_BASE") || "https://generativelanguage.googleapis.com";
if (base !== "https://generativelanguage.googleapis.com" && !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) fail("endpoint de teste deve ser local.");
const pasta = a.saida || "validacao";
const pool = lerCsv(await Deno.readTextFile(a.pool || "validacao/pool.csv"));
const casos = lerCsv(await Deno.readTextFile(a.casos || "validacao/casos.csv"));
if (!pool.length || pool.length > 15 || !casos.length || casos.length > 20) fail("preencha 1 a 15 perfis consentidos no pool e 1 a 20 casos; linhas-modelo são ignoradas.");
const split = (s: string) => s.split("|").map(x => x.trim()).filter(Boolean);
const codes = new Set<string>();
const candidates = pool.map(p => {
 if (!/^C([1-9]|1[0-5])$/.test(p.codigo) || codes.has(p.codigo) || p.consentimento !== "sim") fail("pool exige códigos C1…C15 únicos e consentimento sim.");
 codes.add(p.codigo);
 const habilidades = split(p.habilidades);
 if (!habilidades.length || habilidades.length>8 || habilidades.some(h=>!IDS_HABILIDADES.includes(h)) || new Set(habilidades).size!==habilidades.length) fail("habilidades do pool devem ser ids válidos e únicos, até oito.");
 return { codigo:p.codigo,situacao:p.situacao,area_principal:p.area,habilidades,ai_consent:true };
});
const caseCodes = new Set<string>();
for (const c of casos) {
 if (!/^[A-Z0-9_-]{1,30}$/.test(c.caso) || caseCodes.has(c.caso) || c.apoio_texto.length>300) fail("use códigos anônimos únicos (ex.: CASO01) e textos de até 300 caracteres.");
 caseCodes.add(c.caso);
 geminiBody({goal:c.objetivo,description:c.apoio_texto,a:{situacao:c.pede_situacao,area_principal:c.pede_area,interesses:split(c.pede_interesses),ai_consent:true},candidates},PROMPTS[versao]);
}
await Deno.mkdir(pasta, { recursive: true });
const destino = `${pasta}/avaliacao-rodada-${rodada}.csv`;
try { await Deno.stat(destino); fail("a rodada já existe. Use outra pasta para preservar as avaliações."); } catch(e) { if (!(e instanceof Deno.errors.NotFound)) throw e; }
// Limite local adicional; a titular confere uso do produto antes da rodada real.
const ledgerPath = `${pasta}/consumo-validacao.json`;
const hoje = new Date().toISOString().slice(0,10);
let ledger: Record<string, number> = {};
try { ledger = JSON.parse(await Deno.readTextFile(ledgerPath)); } catch(e) { if (!(e instanceof Deno.errors.NotFound)) throw e; }
const usoProduto = Number(a["geracoes-produto-hoje"]);
if (!Number.isSafeInteger(usoProduto) || usoProduto < 0) fail("informe --geracoes-produto-hoje N, conferido no Painel; conte também outras rodadas/pastas.");
if ((ledger[hoje] || 0)+usoProduto+casos.length>30) fail("a rodada excederia 30 gerações no dia; distribua em dias diferentes.");
const rot = (m: Record<string,string>, k: string) => m[k] ?? k;
const nomeSkills = (s: string[]) => s.map(nomeHabilidade).join(" · ");
const descrever = (rs: {codigo:string;habilidades_que_ajudam:string[]}[]) => rs.map((r,i)=>`${i+1}. ${r.codigo} — ${nomeSkills(r.habilidades_que_ajudam)}`).join(" | ") || "Ninguém compatível";
const linhas: Record<string,unknown>[] = [], logs: Record<string,unknown>[] = [];
for (const c of casos) {
 if (c.apoio_texto.length>300) fail(`caso ${c.caso}: limite de 300 caracteres.`);
 const job = {goal:c.objetivo,description:c.apoio_texto,a:{situacao:c.pede_situacao,area_principal:c.pede_area,interesses:split(c.pede_interesses),ai_consent:true},candidates};
 const body = geminiBody(job,PROMPTS[versao]); // valida tudo antes da chamada
 const linha: Record<string,unknown> = {caso:c.caso,objetivo:rot(GOALS_PRO,c.objetivo),apoio_texto:c.apoio_texto,situacao:rot(SITUACAO_PRO,c.pede_situacao),area:rot(AREAS_PRO,c.pede_area),interesses:split(c.pede_interesses).map(x=>rot(AREAS_PRO,x)).join(" · "),pool:candidates.map(p=>`${p.codigo}: ${rot(SITUACAO_PRO,p.situacao)} / ${rot(AREAS_PRO,p.area_principal)} / ${nomeSkills(p.habilidades)}`).join(" | "),habilidades_necessarias:"",indicacoes_IA:"",indicacoes_plano_B:descrever(fallback(job).recomendadas),observacao:c.observacao,erro:"",versao_prompt:versao};
 const log: Record<string,unknown> = {caso:c.caso,modelo:model,versao_prompt:versao,data_hora:new Date().toISOString(),tokens_enviados:0,tokens_recebidos:0,erro:""};
 try {
  ledger[hoje]=(ledger[hoje]||0)+1;
  await Deno.writeTextFile(ledgerPath,JSON.stringify(ledger));
  const res=await fetch(geminiUrl(model,base),{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify(body),signal:AbortSignal.timeout(14000)});
  if(!res.ok) throw Error(providerError(res.status));
  const parsed=readGemini(await res.json(),job);
  log.tokens_enviados=parsed.usage.input;log.tokens_recebidos=parsed.usage.output;
  linha.habilidades_necessarias=nomeSkills(parsed.result.habilidades_necessarias);
  linha.indicacoes_IA=descrever(parsed.result.recomendadas);
 } catch(e) {
  const permitidos=["limite_provedor","acesso_provedor","modelo_indisponivel","configuracao_provedor","falha_provedor","saida_invalida","saida_truncada","bloqueado_provedor"];
  const code=e instanceof Error && permitidos.includes(e.message)?e.message:"falha_ia";
  const usage=(e as {usage?:{input:number;output:number}}).usage;
  if(usage){log.tokens_enviados=usage.input;log.tokens_recebidos=usage.output;}
  linha.erro=code;log.erro=code;
 }
 for(const i of [1,2,3]) {linha[`A${i}_veredito`]="";linha[`A${i}_comentario`]="";linha[`B${i}_veredito`]="";linha[`B${i}_comentario`]="";}
 linhas.push(linha);logs.push(log);
 // Salva incrementalmente para não perder gerações se o script for interrompido.
 await Deno.writeTextFile(destino,escreverCsv(Object.keys(linhas[0]),linhas));
 await Deno.writeTextFile(`${pasta}/saidas-rodada-${rodada}.csv`,escreverCsv(Object.keys(logs[0]),logs));
 if(c!==casos.at(-1)) await new Promise(r=>setTimeout(r,2100));
}
console.log(`Pronto: ${destino}. Resultados aguardam três avaliadoras; não são aprovação humana.`);
