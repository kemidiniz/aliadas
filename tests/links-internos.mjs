// Confere destinos literais de to=/href= e menus; rotas dinâmicas são cobertas no browser.
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
async function files(dir) {const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+"/"+e.name;if(e.isDirectory())out.push(...await files(p));else if(/\.tsx?$/.test(p))out.push(p);}return out;}
const app=await readFile("src/App.tsx","utf8");
const rotas=new Set([...app.matchAll(/path\s*=\s*["']([^"']+)/g)].map(m=>m[1]));
const textos=await Promise.all((await files("src")).map(async p=>({p,s:await readFile(p,"utf8")})));
const ids=new Set(textos.flatMap(({s})=>[...s.matchAll(/\bid\s*(?:=|:)\s*["']([^"']+)/g)].map(m=>m[1])));
let count=0;
for(const {p,s}of textos) {
 for(const m of s.matchAll(/\b(to|href)\s*(?:=|:)\s*["']((?:\/|#)[^"']*)["']/g)){
  const value=m[2];count++;
  if(value.startsWith("//"))continue;
  const [caminho,hash]=value.split("#");const route=caminho.split("?")[0];
  if(route)assert(rotas.has(route),`${p}: rota inexistente ${value}`);
  if(hash)assert(ids.has(decodeURIComponent(hash)),`${p}: âncora inexistente ${value}`);
  if(p!=="src/App.tsx")assert(!/^\/(quem-somos|privacidade|termo-de-conduta|minhas-conversas)(?:#|$)/.test(value),`${p}: link legado ${value}`);
 }
}
console.log(`PASSOU: ${count} destinos literais to=/href= e menus conferidos contra ${rotas.size} rotas; sem links legados fora dos redirecionamentos.`);
