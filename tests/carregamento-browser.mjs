// Testa o build real: arquivos indisponíveis após uma publicação e falhas persistentes.
// Auth/API simulados; não envia formulários nem usa dados de produção.
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.TEST_BUILD_URL || 'http://localhost:4173';
const project=new URL(process.env.VITE_SUPABASE_URL || 'http://localhost').hostname.split('.')[0];
const pasta=`/workspace/aliadas-review/${process.env.REVIEW_STAGE || 'erros-abertura'}`;
mkdirSync(pasta,{recursive:true});
const uid='62000000-0000-4000-8000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'local@example.invalid',app_metadata:{},user_metadata:{}};
const authKey=`sb-${project}-auth-token`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
async function contexto({bloquearStorage=false}={}) {
 const c=await browser.newContext({viewport:{width:390,height:1000},ignoreHTTPSErrors:true});
 await c.addInitScript(({authKey,user,bloquearStorage})=>{
  localStorage.setItem(authKey,JSON.stringify({access_token:'teste-local',refresh_token:'teste-local',expires_at:Math.floor(Date.now()/1000)+3600,user}));
  sessionStorage.setItem('aliadas:teste-contexto','preservado');
  if(bloquearStorage){const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='aliadas:recuperacao-de-pagina')throw new DOMException('Blocked','SecurityError');return original.call(this,k,v);};}
 },{authKey,user,bloquearStorage});
 await c.route('**/rest/v1/**',async r=>{
  const e=new URL(r.request().url()).pathname.split('/').at(-1);let d=[];
  if(e==='profiles')d=[{id:uid,apelido:'Teste local',status:'aprovado',foto_path:null}];
  if(e==='professional_profiles')d=[{profile_id:uid,situacao:'trabalho',area_principal:'tecnologia',interesses:[],habilidades:[],can_help:[],channels:['email'],slots:[],available:false,ai_consent:false}];
  if(e==='mvp_admin_access')d={principal:true,legacy:false,review_profiles:true,handle_reports:true,ver_visao_geral:true,ver_feedback:true,ver_ia_automacoes:true};
  if(['mvp_metrics','mvp_admin_counts','mvp_ai_metrics','mvp_feedback_metrics','mvp_skill_metrics'].includes(e))d={};
  await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});
 });
 const p=await c.newPage();p.setDefaultTimeout(10000);
 let documentos=0;p.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===p.mainFrame())documentos++;});
 return {c,p,documentos:()=>documentos};
}
const alvos=[
 {arquivo:'Feedback',link:'Ajuda e feedback',titulo:'Ajuda e feedback',rota:'/ajuda'},
 {arquivo:'ConversasProfissionais',link:'Alianças',titulo:'Minhas alianças',rota:'/minhas-aliancas'},
 {arquivo:'PerfilProfissional',link:'Perfil',titulo:'Meu perfil',rota:'/meu-perfil'},
 {arquivo:'Curadoria',link:'Painel',titulo:'Painel das embaixadoras',rota:'/painel'},
 {arquivo:'Textos',link:'Termos e privacidade',titulo:'Termos e privacidade',rota:'/termos-e-privacidade'},
];
try {
 for(const alvo of alvos){
  const {c,p,documentos}=await contexto();let tentativas=0;
  await c.route(`**/assets/${alvo.arquivo}-*.js`,async r=>{tentativas++;if(tentativas===1)await r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Arquivo da versão anterior indisponível</title>'});else await r.continue();});
  await p.goto(base+'/sobre');await p.getByRole('heading',{level:1}).waitFor();
  await p.getByRole('link',{name:alvo.link,exact:true}).first().click();
  await p.getByRole('heading',{level:1,name:alvo.titulo,exact:true}).waitFor();
  assert.equal(new URL(p.url()).pathname,alvo.rota);
  assert.equal(documentos(),2,`${alvo.link}: uma única recarga automática`);
  assert.equal(tentativas,2,`${alvo.link}: arquivo obtido após atualizar`);
  assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).user.id,authKey),uid,'sessão preservada');
  assert.equal(await p.evaluate(()=>sessionStorage.getItem('aliadas:teste-contexto')),'preservado');
  for(const width of [390,1440]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.body.scrollWidth>innerWidth),false);await p.screenshot({path:`${pasta}/recuperada-${alvo.arquivo}-${width}.png`,fullPage:true});}
  console.log(`PASSOU: ${alvo.link} recupera arquivo antigo com uma recarga, preservando URL e sessão.`);
  await c.close();
 }
 for(const modo of ['persistente','storage-bloqueado','execucao','offline']){
  const {c,p,documentos}=await contexto({bloquearStorage:modo==='storage-bloqueado'});
  const padrao='**/assets/Feedback-*.js';
  await c.route(padrao,r=>modo==='execucao'?r.fulfill({status:200,contentType:'application/javascript',body:'throw new Error("DETALHE_TECNICO_QUE_NAO_DEVE_APARECER");'}):r.abort('failed'));
  await p.goto(base+'/sobre');
  if(modo==='offline') await c.setOffline(true);
  await p.getByRole('link',{name:'Ajuda e feedback',exact:true}).click();
  await p.getByRole('heading',{name:'Não conseguimos abrir esta página',exact:true}).waitFor();
  const antes=documentos();await p.waitForTimeout(700);assert.equal(documentos(),antes,'falha persistente não entra em ciclo');
  assert.equal(antes,modo==='persistente'?2:1);
  assert.equal(await p.getByText('Unexpected Application Error!',{exact:true}).count(),0);
  assert.equal(await p.getByText('DETALHE_TECNICO_QUE_NAO_DEVE_APARECER',{exact:false}).count(),0);
  await p.getByRole('navigation',{name:'Rodapé'}).waitFor();
  if(modo==='persistente')for(const width of [390,1440]){await p.setViewportSize({width,height:1000});await p.screenshot({path:`${pasta}/recuperacao-manual-${width}.png`,fullPage:true});}
  if(modo==='execucao'){
   await p.getByRole('link',{name:'Sobre nós',exact:true}).click();await p.getByRole('heading',{name:'Uma conversa pode abrir novos caminhos.',exact:true}).waitFor();
  }else{
   await c.setOffline(false);await c.unroute(padrao);await p.getByRole('button',{name:'Atualizar página',exact:true}).click();await p.getByRole('heading',{name:'Ajuda e feedback',exact:true}).waitFor();
  }
  console.log(`PASSOU: falha ${modo} tem recuperação em português, sem ciclo nem detalhes técnicos; navegação/atualização funciona.`);
  await c.close();
 }
}finally{await browser.close();}
