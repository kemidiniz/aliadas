// Reabertura e etapas com Auth/API simulados; nenhum dado ou chamada de IA em produção.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:5173';
const project = new URL(process.env.VITE_SUPABASE_URL || 'http://localhost').hostname.split('.')[0];
const folder = `/workspace/aliadas-review/${process.env.REVIEW_STAGE || 'retomar-buscas'}`;
mkdirSync(folder, { recursive: true });
const uid = '51000000-0000-4000-8000-000000000001';
const outra = '52000000-0000-4000-8000-000000000001';
const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'teste@example.invalid', app_metadata: {}, user_metadata: {} };
const pro = { profile_id: uid, situacao: 'trabalho', area_principal: 'tecnologia', interesses: [], can_help: [], habilidades: ['ux_produto'], channels: ['email'], slots: [], available: true, ai_consent: false };
const objetivos = [0,1,2,8].map((dias,n) => ({
 id: `53000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`, owner_id: uid,
 description: ['Preparar uma entrevista profissional','Melhorar a apresentação do meu projeto','Organizar meu portfólio profissional','Conhecer outras profissionais da minha área'][n],
 suggested_skills: [n === 0 ? 'entrevistas' : n === 1 ? 'apresentacoes' : n === 2 ? 'portfolio' : 'networking'],
 selected_skills: n === 1 ? [] : [n === 0 ? 'entrevistas' : n === 2 ? 'portfolio' : 'networking'],
 state: 'pronta', mode: 'ia', attempts: 1, ai_authorized: true,
 confirmed_at: n === 1 ? null : new Date().toISOString(),
 // Três objetivos nas últimas 24h e um antigo, já fora da antiga janela de sete dias.
 created_at: new Date(Date.now()-(n===3 ? dias*86400_000 : n*3600_000)).toISOString(),
}));
const pedidos = objetivos.filter(o => o.selected_skills.length).map((o,n) => ({ id: `54000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`, owner_id: uid, objective_id: o.id, candidate_id: outra, state: 'pronta', mode: 'regra', goal: 'outro', description: o.description, habilidades_necessarias: o.selected_skills, habilidades_que_ajudam: o.selected_skills, next_count: 0, created_at: o.created_at }));
const writes = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
 const ctx = await browser.newContext({ viewport: {width:390,height:1000} });
 await ctx.addInitScript(({project,user}) => localStorage.setItem(`sb-${project}-auth-token`,JSON.stringify({access_token:'teste-local',refresh_token:'teste-local',expires_at:Math.floor(Date.now()/1000)+3600,user})),{project,user});
 await ctx.route('**/rest/v1/**', async route => {
  const r = route.request(), u = new URL(r.url()), end = u.pathname.split('/').at(-1);
  let data = [];
  if (['POST','PATCH','PUT','DELETE'].includes(r.method()) && !['mvp_cards','mvp_admin_access','mvp_job_status'].includes(end)) writes.push(`${r.method()} ${end}`);
  if(end==='profiles') data=[{id:uid,apelido:'Teste local',status:'aprovado',foto_path:null}];
  if(end==='professional_profiles') data=[pro];
  if(end==='conversation_objectives') data=objetivos.filter(o => !u.searchParams.has('id') || u.searchParams.get('id')===`eq.${o.id}`);
  if(end==='conversation_requests') data=pedidos.filter(p => !u.searchParams.has('objective_id') || u.searchParams.get('objective_id')===`eq.${p.objective_id}`);
  if(end==='conversation_invites') data=[{request_id:pedidos[1].id}];
  if(end==='mvp_cards') data=[{id:outra,name:'Aliada de teste',situacao:'trabalho',area_principal:'tecnologia',areas:[]}];
  if(end==='mvp_admin_access') data={principal:false,review_profiles:false,handle_reports:false};
  if(end==='mvp_job_status') data={state:'sem_ia',mode:'regra',has_candidate:true};
  if(end==='mvp_start_objective') return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'P0001',message:'Limite de três objetivos em 24 horas.'})});
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 const p=await ctx.newPage();p.setDefaultTimeout(9000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.getByRole('heading',{name:'Sua indicação',exact:true}).waitFor();
 await p.getByText(/Você já definiu três objetivos nas últimas 24 horas/).waitFor();
 const historico=p.getByRole('region',{name:'Suas últimas buscas'});
 assert.equal(await historico.getByRole('button',{name:/Reabrir/}).count(),3);
 await p.getByRole('button',{name:'Etapa 1: Objetivo',exact:true}).click();
 const campo=p.getByRole('textbox',{name:'Qual é o objetivo da sua próxima conversa?'});
 await campo.fill('Quero definir um novo objetivo profissional');
 assert(await p.getByRole('button',{name:'Escolher habilidades sem IA',exact:true}).isDisabled());
 // Reabrir e navegar não acionam criação, nova geração, busca nem convite.
 await historico.getByRole('button',{name:/Melhorar a apresentação/}).click();
 await p.getByRole('checkbox',{name:'Apresentações e falar em público',exact:true}).waitFor();
 await p.getByRole('checkbox',{name:'Apresentações e falar em público',exact:true}).uncheck();
 await p.getByRole('button',{name:'Etapa 1: Objetivo',exact:true}).click();
 await p.getByRole('button',{name:'Etapa 2: Habilidades',exact:true}).click();
 assert.equal(await p.getByRole('checkbox',{name:'Apresentações e falar em público',exact:true}).isChecked(),false);
 assert(await p.getByRole('button',{name:'Etapa 3: Aliada',exact:true}).isDisabled(),'etapa futura exige confirmação das habilidades');
 await historico.getByRole('button',{name:/Preparar uma entrevista/}).click();
 const msg=p.getByRole('textbox',{name:'Sua mensagem',exact:true});await msg.fill('Minha mensagem revisada, preservada ao voltar.');
 await p.getByRole('button',{name:'Etapa 2: Habilidades',exact:true}).click();
 await p.getByRole('list',{name:'Habilidades confirmadas'}).waitFor();
 await p.getByRole('button',{name:'Etapa 1: Objetivo',exact:true}).click();
 await p.getByRole('button',{name:'Rever habilidades',exact:true}).click();
 await p.getByRole('button',{name:'Etapa 3: Aliada',exact:true}).click();
 assert.equal(await msg.inputValue(),'Minha mensagem revisada, preservada ao voltar.');
 for(const width of [375,390,768,1440]) {
  await p.setViewportSize({width,height:1000});await p.evaluate(()=>document.fonts.ready);
  const steps=p.getByRole('list',{name:'Etapas da busca'}).getByRole('button');
  const bounds=await steps.evaluateAll(ns=>ns.map(n=>({top:n.getBoundingClientRect().top,height:n.getBoundingClientRect().height,overflow:n.scrollWidth>n.clientWidth})));
  assert(Math.max(...bounds.map(x=>x.top))-Math.min(...bounds.map(x=>x.top))<1);
  assert(bounds.every(x=>x.height>=44&&!x.overflow),`etapas clicáveis sem corte em ${width}: ${JSON.stringify(bounds)}`);
  assert.equal(await p.evaluate(()=>document.body.scrollWidth>innerWidth),false);
  if([390,1440].includes(width)){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`${folder}/busca-limite-${width}.png`,fullPage:true});}
 }
 await historico.getByRole('button',{name:/Organizar meu portfólio/}).click();
 await p.getByText('Você já enviou um convite nesta busca.',{exact:false}).waitFor();
 assert.equal(await p.getByRole('button',{name:'Enviar convite',exact:true}).count(),0);
 await historico.getByRole('button',{name:'+ Ver mais',exact:true}).click();
 await historico.getByRole('button',{name:/Conhecer outras profissionais/}).click();
 await p.getByRole('textbox',{name:'Sua mensagem',exact:true}).waitFor();
 await p.getByText(objetivos[3].description,{exact:true}).first().waitFor();
 assert.deepEqual(writes,[],'consultar o histórico e trocar etapas não cria objetivos, gerações, buscas ou convites');
 assert.deepEqual(errors,[]);
 console.log('PASSOU: cota atingida mantém histórico; reabre busca antiga e convite enviado; etapas clicáveis preservam habilidades e mensagem, sem novas chamadas de IA ou consumo de cota; 375/390/768/1440.');
} finally {await browser.close();}
