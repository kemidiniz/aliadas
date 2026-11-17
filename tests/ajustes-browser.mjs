// Usabilidade, largura e foto com API local simulada; nenhuma usuária de produção.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.TEST_BASE_URL||'http://localhost:5173';
const project=new URL(process.env.VITE_SUPABASE_URL||'http://localhost').hostname.split('.')[0];
const pasta=`/workspace/aliadas-review/${process.env.REVIEW_STAGE||'largura-feedback'}`;mkdirSync(pasta,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const guest=await browser.newContext();const g=await guest.newPage();let avaliacao;
 await guest.route('**/rest/v1/feedback',async route=>{avaliacao=route.request().postDataJSON();await route.fulfill({status:201,contentType:'application/json',body:'[]'});});
 for(const width of [390,1440]) {
  await g.setViewportSize({width,height:1000});
  for(const path of ['/termos-e-privacidade','/ajuda','/entrar']) {
   await g.goto(base+path);await g.getByRole('heading',{level:1}).waitFor();
   const medidas=await g.locator('main > div').evaluate(n=>({container:n.getBoundingClientRect().right-parseFloat(getComputedStyle(n).paddingRight),conteudo:n.firstElementChild.getBoundingClientRect().right}));
   assert(Math.abs(medidas.container-medidas.conteudo)<2,`${path} ocupa a largura em ${width}: ${JSON.stringify(medidas)}`);
   assert.equal(await g.evaluate(()=>document.body.scrollWidth>innerWidth),false);
   if(path!=='/entrar'){await g.evaluate(()=>scrollTo(0,0));await g.screenshot({path:`${pasta}/${path.slice(1)}-${width}.png`,fullPage:true});}
  }
 }
 await g.goto(base+'/ajuda');await g.getByText('Avaliar o site',{exact:true}).click();
 await g.getByRole('combobox',{name:'Ficou claro o próximo passo em cada tela?'}).selectOption('5');
 await g.getByRole('combobox',{name:'As habilidades sugeridas pela IA combinaram com seu objetivo?'}).selectOption('nao_usei');
 await g.getByRole('combobox',{name:'Foi fácil encontrar onde acompanhar seus convites?'}).selectOption('nao_cheguei');
 await g.locator('label').filter({has:g.getByRole('radio',{name:'4',exact:true})}).click();
 await g.locator('label').filter({has:g.getByRole('radio',{name:'Em parte',exact:true})}).click();
 for(const width of [390,1440]) {await g.setViewportSize({width,height:1000});await g.evaluate(()=>scrollTo(0,0));await g.screenshot({path:`${pasta}/feedback-${width}.png`,fullPage:true});}
 await g.getByRole('button',{name:'Enviar',exact:true}).click();await g.getByRole('heading',{name:'Recebemos!'}).waitFor();
 assert.equal(avaliacao.clareza_fluxo,'5');assert.equal(avaliacao.adequacao_ia,'nao_usei');assert.equal(avaliacao.acompanhar_convites,'nao_cheguei');
 console.log('PASSOU: páginas de texto/formulários usam a largura do container; três medidas de usabilidade enviadas com opções não aplicáveis.');
 const uid='41000000-0000-4000-8000-000000000001';
 const user={id:uid,aud:'authenticated',role:'authenticated',email:'local@example.invalid',app_metadata:{},user_metadata:{}};
 const session={access_token:'teste-local',refresh_token:'teste-local',expires_at:Math.floor(Date.now()/1000)+3600,user};
 let aliancas=[];
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 await ctx.addInitScript(({project,session})=>localStorage.setItem(`sb-${project}-auth-token`,JSON.stringify(session)),{project,session});
 const pro={profile_id:uid,situacao:'trabalho',area_principal:'tecnologia',interesses:[],can_help:[],habilidades:['ux_produto'],channels:['email','meet'],slots:[],ai_consent:false,ai_consent_version:'revogado',available:true};
 await ctx.route('**/rest/v1/**',async route=>{
  const end=new URL(route.request().url()).pathname.split('/').at(-1);let data=[];
  if(end==='profiles')data=[{id:uid,apelido:'Pessoa de teste',status:'aprovado',foto_path:`${uid}/foto.webp`}];
  if(end==='professional_profiles')data=[pro];
  if(end==='professional_contacts')data=[{profile_id:uid,email:'contato@example.invalid',meet:'https://meet.google.com/abc-defg-hij'}];
  if(end==='conversation_invites')data=aliancas;
  if(end==='mvp_cards')data=aliancas.map((i,n)=>({id:i.recipient_id,name:`Aliada por período ${n+1}`,areas:['tecnologia'],situacao:'trabalho',area_principal:'tecnologia'}));
  if(end==='mvp_admin_access')data={principal:false,legacy:false,review_profiles:false,handle_reports:false};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 let assinaturas=0,liberar;
 const imagemPronta=new Promise(resolve=>{liberar=resolve;});
 await ctx.route('**/storage/v1/object/sign/**',async route=>{assinaturas++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({signedURL:'/object/fotos/imagem-teste.png?token=local'})});});
 await ctx.route('**/storage/v1/object/fotos/imagem-teste.png?*',async route=>{await imagemPronta;await route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});});
 const p=await ctx.newPage();await p.goto(base+'/meu-perfil');await p.getByRole('heading',{name:'Meu perfil',exact:true}).waitFor();
 const foto=p.locator('img[alt="Foto de perfil"]');await foto.waitFor();
 assert.equal(await foto.evaluate(n=>getComputedStyle(n).opacity),'0','imagem em carregamento não pinta o texto alternativo');
 assert.equal(await p.getByText('Prévia da foto',{exact:true}).count(),0);
 assert.equal(await p.getByRole('textbox',{name:'Google Meet (opcional)',exact:true}).count(),0);
 assert.equal(await p.locator('label.chip').filter({hasText:'Google Meet'}).count(),0);
 liberar();await p.waitForFunction(()=>{const n=document.querySelector('img[alt="Foto de perfil"]');return n&&getComputedStyle(n).opacity==='1';});
 const antes=assinaturas;
 await p.getByRole('navigation',{name:'Principal'}).first().getByRole('link',{name:'Encontrar',exact:true}).click();
 await p.getByRole('heading',{name:'Encontre sua aliada',exact:true}).waitFor();
 assert.equal(await p.getByText('Convites esperando sua resposta',{exact:true}).count(),0);
 const bounds=await p.getByRole('region',{name:'Encontre sua aliada',exact:true}).boundingBox();
 const titulo=await p.getByRole('heading',{level:1}).boundingBox();assert(Math.abs(bounds.x-titulo.x)<2&&Math.abs(bounds.width-titulo.width)<2,'busca ocupa largura do título');
 for(const width of [375,390,768,1440]) {
  await p.setViewportSize({width,height:1000});await p.evaluate(()=>scrollTo(0,0));
  const ys=await p.getByRole('list',{name:'Etapas da busca'}).getByRole('listitem').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));
  assert(Math.max(...ys)-Math.min(...ys)<1,`três etapas da busca alinhadas em ${width}`);
  if([390,1440].includes(width))await p.screenshot({path:`${pasta}/encontrar-${width}.png`,fullPage:true});
 }
 await p.setViewportSize({width:1440,height:1000});await p.getByRole('navigation',{name:'Principal'}).first().getByRole('link',{name:'Perfil',exact:true}).click();
 await p.getByRole('heading',{name:'Meu perfil',exact:true}).waitFor();await p.waitForTimeout(200);
 assert.equal(assinaturas,antes,'retornar ao perfil reutiliza assinatura em memória, sem nova requisição');
 aliancas=[0,2,10,15].map((dias,n)=>({id:`42000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`,request_id:`43000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`,sender_id:uid,recipient_id:`44000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`,state:'aceita',goal:'projeto',message:'Mensagem profissional de teste',created_at:new Date(Date.now()-dias*86400_000).toISOString()}));
 await p.getByRole('navigation',{name:'Principal'}).first().getByRole('link',{name:'Alianças',exact:true}).click();
 await p.getByRole('heading',{name:'Minhas alianças',exact:true}).waitFor();
 await p.getByRole('heading',{name:'Hoje',exact:true}).waitFor();
 await p.getByRole('heading',{name:'Últimos 7 dias',exact:true}).waitFor();
 await p.getByRole('heading',{name:'Anteriores',exact:true}).waitFor();
 assert.equal(await p.getByRole('heading',{name:/Aliada por período/}).count(),3);
 await p.getByRole('button',{name:'+ Ver mais',exact:true}).click();
 assert.equal(await p.getByRole('heading',{name:/Aliada por período/}).count(),4);
 await p.getByRole('button',{name:'Mostrar menos',exact:true}).click();
 for(const width of [375,390,768,1440]) {
  await p.setViewportSize({width,height:1000});await p.evaluate(()=>scrollTo(0,0));
  for(const linha of await p.getByRole('list',{name:'Etapas da conversa'}).all()) {
    const ys=await linha.locator('li > span:nth-child(2)').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));
    assert(Math.max(...ys)-Math.min(...ys)<1,`rótulos de Convite/Aceite/Contatos/Avaliação alinhados em ${width}`);
  }
  if([390,1440].includes(width))await p.screenshot({path:`${pasta}/aliancas-periodos-${width}.png`,fullPage:true});
 }
 console.log('PASSOU: alianças agrupadas por períodos, três iniciais e ver mais sem perder histórico.');
 console.log('PASSOU: Encontrar sem caixa de convites e com largura completa; Meet removido; foto sem flash do alt e assinatura reaproveitada.');
}finally{await browser.close();}
