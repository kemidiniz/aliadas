// Sessão, telefone e quatro perguntas obrigatórias. Só API simulada.
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.TEST_BASE_URL||'http://localhost:5173';
const project=new URL(process.env.VITE_SUPABASE_URL||'http://localhost').hostname.split('.')[0];
const uid='71000000-0000-4000-8000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'local@example.invalid',app_metadata:{},user_metadata:{}};
const pasta=`/workspace/aliadas-review/${process.env.REVIEW_STAGE||'sessao-avisos-telefone'}`;mkdirSync(pasta,{recursive:true});
let perfilFalha=false,salvo,avaliacao,renovacoes=0;
let pro={profile_id:uid,situacao:'trabalho',area_principal:'tecnologia',interesses:[],can_help:[],habilidades:[],channels:['whatsapp'],available:false,ai_consent:false,invite_email_notifications:true};
let contato={profile_id:uid,whatsapp:'',email:'',linkedin:'',meet:null};
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const c=await b.newContext({viewport:{width:390,height:1000}});
 await c.addInitScript(({uid,user,project})=>localStorage.setItem(`sb-${project}-auth-token`,JSON.stringify({access_token:'teste-local',refresh_token:'refresh-local',expires_at:Math.floor(Date.now()/1000)+5,user})),{uid,user,project});
 await c.route('**/auth/v1/token?*',r=>{renovacoes++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'token-renovado-local',refresh_token:'refresh-renovado-local',expires_in:3600,token_type:'bearer',user})});});
 await c.route('**/rest/v1/**',async r=>{
  const e=new URL(r.request().url()).pathname.split('/').at(-1);let d=[];
  if(e==='profiles'){
   if(perfilFalha)return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'PGRST000',message:'Serviço temporariamente indisponível'})});
   d=[{id:uid,apelido:'Participante local',status:'aprovado',foto_path:null}];
  }
  if(e==='professional_profiles')d=[pro];
  if(e==='professional_contacts')d=[contato];
  if(e==='mvp_admin_access')d={principal:false,legacy:false};
  if(e==='mvp_save_profile'){salvo=r.request().postDataJSON();pro={...pro,...salvo.p};contato={...contato,...salvo.c};d=null;}
  if(e==='feedback'){avaliacao=r.request().postDataJSON();return r.fulfill({status:201,contentType:'application/json',body:'[]'});}
  await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});
 });
 const p=await c.newPage();p.setDefaultTimeout(10000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/meu-perfil');await p.getByRole('heading',{name:'Meu perfil',exact:true}).waitFor();
 assert(renovacoes>=1,'token perto de expirar é renovado pelo SDK');
 const sessao=await p.evaluate(project=>JSON.parse(localStorage.getItem(`sb-${project}-auth-token`)),project);
 assert(sessao.expires_at*1000-Date.now()>3500_000,'renovação mantém uma hora de validade');
 const pais=p.getByRole('combobox',{name:'País do WhatsApp',exact:true});
 assert.equal(await pais.inputValue(),'BR');
 const telefone=p.getByRole('textbox',{name:'WhatsApp',exact:true});
 await telefone.fill('(11) 99999-9999');
 await p.getByRole('checkbox',{name:'Receber e-mails de novos convites e de convites aceitos.',exact:true}).uncheck();
 await p.getByRole('button',{name:'Salvar',exact:true}).click();await p.getByText('Perfil salvo.',{exact:true}).waitFor();
 assert.equal(salvo.c.whatsapp,'+5511999999999');assert.equal(salvo.p.invite_email_notifications,false);
 await pais.selectOption('PT');await telefone.fill('912 345 678');
 await p.getByRole('button',{name:'Salvar',exact:true}).click();await p.waitForTimeout(100);
 assert.equal(salvo.c.whatsapp,'+351912345678');
 await telefone.fill('+44 7700 900123');assert.equal(await pais.inputValue(),'GB');
 await p.getByRole('button',{name:'Salvar',exact:true}).click();await p.waitForTimeout(100);assert.equal(salvo.c.whatsapp,'+447700900123');
 for(const width of [390,1440]){await p.setViewportSize({width,height:1000});await p.locator('#contatos').scrollIntoViewIfNeeded();await p.screenshot({path:`${pasta}/whatsapp-${width}.png`,fullPage:true});assert.equal(await p.evaluate(()=>document.body.scrollWidth>innerWidth),false);}
 perfilFalha=true;await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForTimeout(300);
 assert.equal(new URL(p.url()).pathname,'/meu-perfil');await p.getByRole('heading',{name:'Meu perfil',exact:true}).waitFor();
 perfilFalha=false;await p.evaluate(()=>window.dispatchEvent(new Event('online')));await p.waitForTimeout(200);
 console.log('PASSOU: renovação por uma hora, perfil preservado em falha temporária, DDI Brasil/Portugal/colagem internacional e preferência de avisos.');
 perfilFalha=true;await p.goto(base+'/minhas-aliancas');await p.getByRole('heading',{name:'Não conseguimos carregar sua conta',exact:true}).waitFor();
 assert.equal(new URL(p.url()).pathname,'/minhas-aliancas');perfilFalha=false;
 await p.getByRole('button',{name:'Tentar novamente',exact:true}).click();await p.getByRole('heading',{name:'Minhas alianças',exact:true}).waitFor();
 await p.goto(base+'/ajuda');await p.getByText('Avaliar o site',{exact:true}).click();
 assert.equal(await p.getByRole('option',{name:'Prefiro não responder',exact:true}).count(),0);
 for(const titulo of ['Ficou claro o próximo passo em cada tela?','As habilidades sugeridas pela IA combinaram com seu objetivo?','Foi fácil encontrar onde acompanhar seus convites?'])assert.equal(await p.getByRole('combobox',{name:titulo}).getAttribute('required')!==null,true);
 await p.getByRole('button',{name:'Enviar',exact:true}).click();
 assert.equal(avaliacao,undefined,'avaliação incompleta não chega ao banco');
 await p.getByText('Escolha uma nota',{exact:true}).waitFor();
 await p.getByText('Escolha uma nota de 1 a 5.',{exact:true}).waitFor();
 await p.locator('label').filter({has:p.getByRole('radio',{name:'4',exact:true})}).click();
 await p.getByRole('combobox',{name:'Ficou claro o próximo passo em cada tela?'}).selectOption('5');
 await p.getByRole('combobox',{name:'As habilidades sugeridas pela IA combinaram com seu objetivo?'}).selectOption('nao_usei');
 await p.getByRole('combobox',{name:'Foi fácil encontrar onde acompanhar seus convites?'}).selectOption('nao_cheguei');
 assert.equal(await p.getByText('Escolha uma nota de 1 a 5.',{exact:true}).count(),0,'aviso de campo corrigido desaparece ao responder');
 assert.equal(await p.getByRole('option',{name:'Escolha (opcional)',exact:true}).count(),0);
 for(const width of [390,1440]){
  await p.setViewportSize({width,height:1000});const copyright=p.getByText('© 2026 Kemily Diniz',{exact:true});
  if(width===390){const x=await copyright.evaluate(n=>{const r=document.createRange();r.selectNodeContents(n);const t=r.getBoundingClientRect(),c=n.parentElement.getBoundingClientRect();return Math.abs(t.left+t.width/2-(c.left+c.width/2));});assert(x<1,'copyright centralizado no celular');}
  await p.screenshot({path:`${pasta}/feedback-${width}.png`,fullPage:true});await p.locator('footer').screenshot({path:`${pasta}/rodape-${width}.png`});
 }
 await p.getByRole('button',{name:'Enviar',exact:true}).click();await p.getByRole('heading',{name:'Recebemos!',exact:true}).waitFor();
 assert.equal(avaliacao.clareza_fluxo,'5');assert.equal(avaliacao.adequacao_ia,'nao_usei');assert.equal(avaliacao.acompanhar_convites,'nao_cheguei');
 assert.equal(avaliacao.encontrou_aliadas,null,'depois das quatro primeiras, responder é opcional');
 assert.deepEqual(errors,[]);
 console.log('PASSOU: falha inicial da conta oferece nova tentativa sem sair; quatro primeiras perguntas exigidas, opções não aplicáveis e demais respostas opcionais; copyright mobile centralizado.');
}finally{await b.close();}
