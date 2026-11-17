// Apenas casos efêmeros e Gemini stub local; não gera evidência de IA real.
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { lerCsv, escreverCsv } from "../validacao/csv.ts";
const run=promisify(execFile);
const deno=process.env.DENO || "/workspace/.npm/_npx/05b6ef7b13673c57/node_modules/deno/deno";
const dir=mkdtempSync(join(tmpdir(),"aliadas-validacao-"));
const pedidos=[];
const srv=createServer(async(req,res)=>{
 let raw="";for await(const chunk of req)raw+=chunk;
 pedidos.push(JSON.parse(raw));
 res.setHeader("Content-Type","application/json");
 res.end(JSON.stringify({usageMetadata:{promptTokenCount:15,candidatesTokenCount:10},candidates:[{content:{parts:[{text:JSON.stringify({habilidades_sugeridas:["entrevistas"]})}]}}]}));
});
await new Promise(r=>srv.listen(0,"127.0.0.1",r));
try {
 const port=srv.address().port;
 const pool=join(dir,"pool.csv"),casos=join(dir,"casos.csv");
 writeFileSync(pool,"codigo,situacao,area,habilidades,consentimento\nC1,trabalho,tecnologia,programacao,sim\nC2,trabalho,negocios,entrevistas,sim\n");
 writeFileSync(casos,"caso,objetivo,apoio_texto,pede_situacao,pede_area,pede_interesses,observacao\nCASO01,entrevista,Preparar entrevista,estudo,saude,saude,OBSERVACAO_NAO_ENVIAR\n");
 const opts={env:{...process.env,GEMINI_API_KEY:"stub-sem-valor-real",GEMINI_MODEL:"modelo-local",GEMINI_FREE_TIER_CONFIRMED:"true",GEMINI_API_BASE:`http://127.0.0.1:${port}`},timeout:25000};
 for(const n of [1,2]) {
  await run(deno,["run","--no-lock","--allow-read","--allow-write="+dir,"--allow-env",`--allow-net=127.0.0.1:${port}`,"validacao/rodar.ts","--rodada",String(n),"--pool",pool,"--casos",casos,"--saida",dir,"--geracoes-produto-hoje","0"],opts);
  const path=join(dir,`avaliacao-rodada-${n}.csv`),linhas=lerCsv(readFileSync(path,"utf8"));
  assert.match(linhas[0].objetivo,/entrevista/i);assert.match(linhas[0].indicacoes_IA,/C2.*Preparação para entrevistas/);
  assert.match(linhas[0].indicacoes_plano_B,/C2/);assert.equal(linhas[0].A1_veredito,"");
  for(const i of [1,2,3]) {linhas[0][`A${i}_veredito`]= n===1 && i!==1 ? "ajustar":"aprovado";linhas[0][`A${i}_comentario`]="Revisar ordem";linhas[0][`B${i}_veredito`]="reprovado";}
  writeFileSync(path,escreverCsv(Object.keys(linhas[0]),linhas));
 }
 await run(deno,["run","--allow-read","--allow-write="+dir,"validacao/consolidar.ts","--pasta",dir],opts);
 const result=readFileSync(join(dir,"resultado.md"),"utf8");
 assert.match(result,/\+100,0 pontos percentuais/);assert.match(result,/IA aprovada onde a regra não foi: 1/);assert.match(result,/Comentários agrupados/);
 assert(!JSON.stringify(pedidos).includes("OBSERVACAO_NAO_ENVIAR"));
 assert.equal(pedidos.length,2);assert(!JSON.stringify(pedidos).includes("C1"));assert(!JSON.stringify(pedidos).includes("C2"));assert.equal(pedidos[0].generationConfig.temperature,0.2);
 console.log("PASSOU: pool, casos, mesmo prompt/esquema, plano B, duas rodadas, maioria 2/3, diferença em pontos percentuais e agrupamento; tudo com stub local.");
} finally {await new Promise(r=>srv.close(r));rmSync(dir,{recursive:true,force:true});}
