// Teste local com Auth/API simulados. Não usa usuárias nem banco de produção.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
import { existsSync } from "node:fs";
// usa CHROMIUM_PATH, o Chromium do sistema ou o do Playwright, o que existir
function chromiumPath() {
  for (const p of [process.env.CHROMIUM_PATH, "/usr/bin/chromium", "/opt/pw-browsers/chromium"])
    if (p && existsSync(p)) return p;
  return undefined;
}
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const backend = process.env.VITE_SUPABASE_URL || "http://localhost";
const project = new URL(backend).hostname.split(".")[0];
const uid = "10000000-0000-0000-0000-000000000001",
  other = "10000000-0000-0000-0000-000000000002";
const profile = {
  id: uid,
  apelido: "participante de teste",
  foto_path: null,
  de_onde_vem: "ocupação de teste",
  onde_esta: "estudando",
  areas: ["saude"],
  formas_conexao: ["mensagem"],
  status: "aprovado",
};
const professional = {
  profile_id: uid,
  occupation: "formação em saúde",
  moment: "inicio",
  areas: ["saude"],
  situacao: "transicao",
  area_principal: "saude",
  interesses: ["saude"],
  intentions: ["buscar", "compartilhar"],
  can_help: ["entrevista"],
  habilidades: ["entrevistas"],
  want_talk: ["carreira"],
  channels: ["email"],
  slots: ["1_tarde", "3_noite"],
  ai_consent: false,
  available: true,
};
const card = {
  id: other,
  name: "aliada de teste",
  occupation: "educadora",
  areas: ["saude"],
  moment: "experiente",
};
const request = {
  id: "20000000-0000-0000-0000-000000000001",
  owner_id: uid,
  candidate_id: other,
  state: "pronta",
  mode: "regra",
  habilidades_necessarias: ["planejamento_carreira", "networking"],
  habilidades_que_ajudam: ["networking"],
  next_count: 0,
  explanation: "Ela pode ajudar com o objetivo que você escolheu.",
  questions: [],
  draft: null,
  goal: "carreira",
  description: null,
  created_at: new Date().toISOString(),
};
const invite = {
  id: "30000000-0000-0000-0000-000000000001",
  request_id: request.id,
  sender_id: uid,
  recipient_id: other,
  message: "mensagem de teste autorizada",
  state: "aceita",
  created_at: new Date().toISOString(),
  responded_at: new Date().toISOString(),
  horario_confirmado: null,
  goal: "carreira",
  goal_text: null,
};
let proposals = [];
let pedidos = [];
let hasProfessional = true;
let requests = [],
  invites = [],
  savedProfile = null,
  feedback = null;
const calls = [];
const ci = (value) =>
  new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
let objective = null;
let jobState = "sem_ia";
const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumPath(),
  args: ["--no-sandbox"],
});
try {
  const guest = await browser.newContext();
  const g = await guest.newPage();
  await g.goto(base);
  await g
    .getByRole("heading", {
      name: ci("uma conversa pode abrir novos caminhos."),
    })
    .waitFor();
  assert.equal(
    await g
      .getByRole("navigation", { name: ci("Principal") })
      .first()
      .getByRole("link")
      .count(),
    2,
    "menu de visitantes: Como funciona e Entrar",
  );
  assert.equal(await g.locator('a[href="/#quem-somos"]').count(), 0, "nenhum link para /#quem-somos");
  assert.equal(await g.getByText(/Criada na formação em IA Aplicada/).count(), 0, "frase da reprograma só em Quem somos");
  await g.getByText("© 2026 Kemily Diniz", { exact: true }).waitFor();
  assert.equal(await g.locator('a[href="/forum"]').count(), 0);
  assert.deepEqual(await g.locator("main section[aria-labelledby]").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("aria-labelledby"))),["hero-title","why-title","solution-title","audience-title","faq-title","final-title"]);
  await g.getByText("Escreva seu objetivo, revise as habilidades sugeridas pela IA e encontre quem pode ajudar.",{exact:true}).waitFor();
  await g.getByText("Quem cuida da comunidade?",{exact:false}).click();
  await g.getByText("As embaixadoras: aliadas que acolhem a comunidade e acompanham denúncias. O papel é por convite.",{exact:true}).waitFor();
  const { mkdir: pastaLanding }=await import("node:fs/promises");
  await pastaLanding(`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "B3"}`,{recursive:true});
  for(const width of [390,1440]) { await g.setViewportSize({width,height:1000}); await g.evaluate(()=>scrollTo(0,0)); await g.waitForTimeout(200);await g.screenshot({path:`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "B3"}/landing-${width}.png`,fullPage:true}); }

  await g.getByRole("link", { name: "Sobre nós" }).first().click();
  await g.waitForURL(base + "/sobre");
  await g.getByRole("heading", { name: "Uma conversa pode abrir novos caminhos." }).waitFor();
  assert.equal(await g.title(), "aliadas · Uma conversa pode abrir novos caminhos.");
  await g.goto(base + "/quem-somos");
  await g.waitForURL(base + "/sobre");
  for (const [rota,hash] of [["/privacidade#ia","ia"],["/privacidade","privacidade"],["/termo-de-conduta","termos"]]) {
    await g.goto(base+rota);await g.waitForURL(base+"/termos-e-privacidade#"+hash);
    await g.locator("#"+hash).waitFor();await g.waitForTimeout(200);
    const box=await g.locator("#"+hash).boundingBox();assert(box.y>=0 && box.y<1000,`âncora ${hash} visível`);
  }
  const { mkdir: pastaRodape }=await import("node:fs/promises");
  await pastaRodape(`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "B8"}`,{recursive:true});
  for(const width of [360,390,1440]) {
    await g.setViewportSize({width,height:1000});await g.evaluate(()=>document.fonts.ready);
    const links=g.getByRole("navigation",{name:"Rodapé"}).getByRole("link");assert.equal(await links.count(),3);
    const boxes=await links.evaluateAll(nodes=>nodes.map(n=>({y:n.getBoundingClientRect().y,left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,font:parseFloat(getComputedStyle(n).fontSize)})));
    assert(boxes.every(b=>b.font>=14 && b.left>=0 && b.right<=width),JSON.stringify(boxes));assert(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))<2,"links do rodapé na mesma linha");
    const conteudo=await g.locator("footer > div").evaluate(n=>({left:n.getBoundingClientRect().left+parseFloat(getComputedStyle(n).paddingLeft),right:n.getBoundingClientRect().right-parseFloat(getComputedStyle(n).paddingRight)}));
    const titulo=await g.getByRole("heading",{level:1}).boundingBox();
    const logo=await g.locator('footer a[href="/"]').boundingBox();
    assert(Math.abs(conteudo.left-titulo.x)<1 && Math.abs(logo.x-titulo.x)<1,"rodapé e título usam a mesma margem");
    assert(boxes.every(b=>b.left>=conteudo.left-1 && b.right<=conteudo.right+1),"links respeitam as duas margens do conteúdo");
    if(width<640) assert(Math.abs(boxes[0].left-titulo.x)<1 && Math.abs(boxes.at(-1).right-conteudo.right)<1,"links no celular alinhados ao conteúdo, sem margem negativa");
    await g.locator("footer").screenshot({path:`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "B8"}/rodape-${width}.png`});
  }
  console.log("PASSOU: /sobre público, rotas legais preservam âncoras, rodapé com 3 links de 14px na mesma linha em 360/390/1440");
  await g.goto(base + "/feedback");
  await g.waitForURL(base + "/ajuda");
  await g.getByRole("heading", { level: 1, name: "Ajuda e feedback" }).waitFor();
  await g.getByText("Como excluo minha conta?").click();
  await g.getByText(/seção Conta, toque em Excluir minha conta/).waitFor();
  await g.getByText("Tirar uma dúvida").click();
  await g.getByRole("textbox", { name: "Sua dúvida" }).fill("Como funciona a indicação?");
  await g.getByRole("button", { name: "Enviar", exact: true }).click();
  await g.getByText("Para te responder, informe um e-mail válido").waitFor();
  assert.equal(await g.getByRole("link", { name: "Ajuda e feedback" }).count(), 1, "link no rodapé");
  console.log("PASSOU: /ajuda com perguntas frequentes; dúvida exige e-mail; /feedback redireciona");
  await g.goto(base + "/forum");
  await g.waitForURL(base + "/");
  console.log("PASSOU: início público, três itens e fórum fora da jornada");
  await guest.close();
  const context = await browser.newContext();
  const session = {
    access_token: "test-token-local",
    refresh_token: "test-refresh-local",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id: uid,
      aud: "authenticated",
      role: "authenticated",
      email: "teste@exemplo.invalid",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
  await context.addInitScript(
    ({ project, session }) =>
      localStorage.setItem(`sb-${project}-auth-token`, JSON.stringify(session)),
    { project, session },
  );
  await context.route("**/rest/v1/**", async (route) => {
    const r = route.request(),
      url = new URL(r.url()),
      endpoint = url.pathname.split("/").at(-1);
    const body = r.postData() ? JSON.parse(r.postData()) : null;
    calls.push({ endpoint, body });
    let data = [];
    if (endpoint === "profiles") data = [profile];
    if (endpoint === "roles") data = [];
    if (endpoint === "professional_profiles")
      data = hasProfessional ? [professional] : [];
    if (endpoint === "conversation_time_proposals") data = proposals;
    if (endpoint === "mvp_next_suggestion") data = other;
    if (endpoint === "mvp_propose_times") data = null;
    if (endpoint === "professional_contacts")
      data = [
        {
          profile_id: uid,
          email: null,
          linkedin: null,
          whatsapp: null,
          meet: null,
        },
      ];
    if (endpoint === "conversation_requests") data = requests;
    if (endpoint === "conversation_invites") data = invites;
    if (endpoint === "conversation_feedback") data = [];
    if (endpoint === "mvp_cards") data = [card];
    if (endpoint === "mvp_job_status")
      data = {
        state: jobState,
        mode: requests[0]?.mode ?? "regra",
        has_candidate: true,
      };
    if (endpoint === "mvp_admin_access")
      data = {
        principal: false,
        legacy: false,
        review_profiles: false,
        handle_reports: false,
      };
    if (endpoint === "conversation_objectives") data = objective && !(url.searchParams.get("confirmed_at")==="is.null" && objective.confirmed_at) ? [objective] : [];
    if (endpoint === "mvp_start_objective") {
      objective = { id: "38000000-0000-4000-8000-000000000001", description: body.description, suggested_skills: body.use_ai ? ["networking", "planejamento_carreira"] : [], selected_skills: [], state: "pronta", mode: body.use_ai ? "ia" : "regra", attempts: 1, confirmed_at: null, ai_authorized: body.use_ai };
      data = objective.id;
    }
    if (endpoint === "mvp_retry_objective") { objective = {...objective, attempts: objective.attempts+1, suggested_skills:["transicao_carreira"]}; data = null; }
    if (endpoint === "mvp_manual_objective") { objective = {...objective, mode:"regra", state:"pronta", suggested_skills:[]}; data = null; }
    if (endpoint === "mvp_find_for_objective") {
      objective.selected_skills = body.skills; objective.confirmed_at = new Date().toISOString();
      if (!professional.channels.length) data = {complete_profile:true};
      else { requests = [{...request, objective_id: objective.id, description:objective.description, habilidades_necessarias:body.skills}]; data = {request_id:request.id}; }
    }
    if (endpoint === "mvp_save_photo") { profile.foto_path = body.photo; data = null; }
    if (endpoint === "mvp_create_request") {
      requests = [request];
      data = request.id;
    }
    if (endpoint === "mvp_invite_reviewed") {
      invites = [invite];
      data = invite.id;
    }
    if (endpoint === "mvp_save_profile") {
      savedProfile = body;
      data = null;
    }
    if (endpoint === "mvp_invite_context") data = {description:"Apoio profissional de teste",habilidades:["networking"]};
    if (endpoint === "mvp_respond") {invites=invites.map(i=>i.id===body.invite?{...i,state:body.accept?"aceita":"recusada"}:i);data=null;}
    if (endpoint === "mvp_shared_contacts")
      data = {
        email: "autorizado@exemplo.invalid",
        whatsapp: null,
        linkedin: null,
        meet: null,
        nome_completo: "Aliada de Teste Completa",
        common_slots: ["1_tarde"],
      };
    if (endpoint === "mvp_feedback" || endpoint === "mvp_feedback_v2") {
      feedback = body;
      data = null;
    }
    if (endpoint === "conversation_feedback_requests") data = pedidos;
    if (endpoint === "mvp_feedback_later") {
      pedidos = [];
      data = null;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  const p = await context.newPage();
  p.setDefaultTimeout(9000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  jobState = "sem_ia";
  await p.goto(base+"/sobre");
  await p.getByRole("navigation",{name:"Principal"}).first().getByRole("link",{name:"Alianças",exact:true}).waitFor();
  await p.getByRole("heading",{name:"Uma conversa pode abrir novos caminhos."}).waitFor();
  assert.equal(await p.getByRole("link",{name:"Encontrar minha aliada",exact:true}).first().getAttribute("href"),"/");
  await p.getByRole("link",{name:"Encontrar minha aliada",exact:true}).first().click();
  console.log("PASSOU: /sobre logada mostra landing e CTA leva ao Início");
  await p.goto(base);
  await p.getByRole("heading", { level: 1, name: /Olá/ }).waitFor();
  // Texto livre -> IA sugere habilidades -> revisão humana -> só então busca.
  const objetivo = p.getByRole("textbox", { name: "Qual é o objetivo da sua próxima conversa?" });
  assert.equal(await objetivo.inputValue(), "");
  assert(await p.getByRole("button", { name: "Escolher habilidades sem IA" }).isDisabled());
  await objetivo.fill("Quero ampliar minha rede profissional");
  await p.getByRole("checkbox", { name: /Autorizo a IA a sugerir/ }).check();
  await p.getByRole("button", { name: "Descobrir habilidades com IA" }).click();
  await p.getByText("A IA sugere estas habilidades. Quais fazem sentido para você?", {exact:true}).waitFor();
  for (const width of [390,1440]) {await p.setViewportSize({width,height:1000});await p.screenshot({path:`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "A3"}/objetivo-habilidades-${width}.png`,fullPage:true});}
  assert.equal(calls.filter(c=>c.endpoint==="mvp_find_for_objective").length,0,"IA não busca pessoas antes da confirmação");
  await p.getByRole("checkbox", { name: "Planejamento de carreira", exact:true }).uncheck();
  await p.getByRole("button", { name: "Encontrar minha aliada", exact:true }).click();
  await p.getByRole("heading", { name: "Sua indicação" }).waitFor();
  assert.deepEqual(calls.find(c=>c.endpoint==="mvp_find_for_objective").body.skills,["networking"]);
  assert.equal(calls.filter(c=>c.endpoint==="mvp_create_request").length,0);
  assert.equal(await p.getByText("Recomendada pela IA", { exact: true }).count(), 0,"cruzamento determinístico não se apresenta como IA");
  await p.getByText("aliada de teste", { exact: true }).waitFor();
  assert.equal(await p.getByText("NÃO MOSTRAR PERGUNTA ANTIGA").count(), 0);
  assert.equal(await p.getByText("NÃO MOSTRAR RASCUNHO ANTIGO").count(), 0);
  assert.match(await p.getByRole("textbox", { name: "Sua mensagem" }).inputValue(), /Vi na aliadas.*Networking/);
  await p.getByText("Revise antes de enviar. Contatos só aparecem depois do aceite.").waitFor();
  await p.getByRole("textbox", { name: "Sua mensagem" }).fill("minha mensagem revisada de teste");
  const { mkdir: criarPasta } = await import("node:fs/promises");
  await criarPasta(`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "A3"}`, { recursive: true });
  for (const width of [390, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(250);
    await p.screenshot({ path: `/workspace/aliadas-review/${process.env.REVIEW_STAGE || "A3"}/indicacao-${width}.png`, fullPage: true });
  }
  console.log("PASSOU: objetivo escrito, habilidades por IA, confirmação humana antes da busca, sem falsa IA na escolha da pessoa");
  const antes = calls.filter((x) => x.endpoint === "mvp_create_request").length;
  await p.getByRole("button", { name: "Ver outra indicação" }).click();
  await p.waitForTimeout(300);
  assert(calls.some((x) => x.endpoint === "mvp_next_suggestion"));
  assert.equal(calls.filter((x) => x.endpoint === "mvp_create_request").length, antes);
  console.log("PASSOU: ver outra sugestão usa a RPC própria e não cria nova busca");
  await p.getByRole("button", { name: "Enviar convite" }).click();
  await p.getByText("Convite enviado. Você acompanha em Alianças.").waitFor();
  assert.equal(calls.find((x) => x.endpoint === "mvp_invite_reviewed").body.message, "minha mensagem revisada de teste");
  assert.equal(calls.find(x=>x.endpoint==="mvp_invite_reviewed").body.candidate,other,"convite vincula a pessoa vista");
  console.log("PASSOU: convite só com a mensagem revisada");

  await p.goto(base + "/minhas-conversas");
  await p.waitForURL(base + "/minhas-aliancas");
  await p.getByRole("tab", { name: /Enviados/, selected: true }).waitFor();
  await p.getByRole("link", { name: "E-mail", exact: true }).waitFor();
  await p.getByText(/Quer conversar sobre:\s*Dicas de carreira/).first().waitFor();
  assert.equal(await p.getByRole("link", { name: "WhatsApp", exact: true }).count(), 0);
  await p.locator('[aria-current="step"]').getByText("Avaliação").waitFor();
  await p.getByText("Combinem a conversa por onde preferirem.").waitFor();
  await p.getByText("Nome completo: Aliada de Teste Completa").waitFor();
  for (const fora of [/Entrar na chamada/, /Adicionar à agenda/, /Baixar \.ics/, /Proponha/, /Horário/])
    assert.equal(await p.getByText(fora).count(), 0, `sem ${fora}`);
  await p.getByRole("heading", { name: "Minhas alianças", exact: true }).waitFor();
  await p.goto(base + "/conexoes");
  await p.waitForURL(base + "/minhas-aliancas");
  console.log("PASSOU: rotas legadas redirecionam para Minhas alianças");
  console.log("PASSOU: depois do aceite, 4 passos, contatos e nome completo, sem agenda nem chamada");
  // menu ⋯ pelo teclado
  await p.getByRole("button", { name: "Mais opções" }).focus();
  await p.keyboard.press("Enter");
  await p.getByRole("menuitem", { name: "Bloquear" }).waitFor();
  await p.keyboard.press("ArrowDown");
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), "Denunciar");
  await p.keyboard.press("Escape");
  assert.equal(await p.getByRole("menu").count(), 0);
  console.log("PASSOU: menu de bloqueio e denúncia acessível pelo teclado");
  await p.getByRole("button", { name: /Avaliar a conversa/ }).click();
  await p.getByText("Vocês conversaram?").waitFor();
  await p.locator("label.chip", { hasText: "Sim" }).click();
  await p.getByRole("button", { name: "5", exact: true }).click();
  await p.locator("label.chip", { hasText: "Escuta" }).click();
  await p.locator("label.chip", { hasText: "Dica prática" }).click();
  await p.getByRole("button", { name: "Enviar", exact: true }).click();
  await p.getByText("Obrigada por contar!").waitFor();
  assert.deepEqual(feedback, { invite: invite.id, resposta: "sim", utility: 5, marcas: ["escuta", "dica"] });
  console.log("PASSOU: avaliação com 'Vocês conversaram?', nota e marcas");
  // cartão no Início 5 dias depois do aceite
  pedidos = [{ id: "50000000-0000-0000-0000-000000000001", invite_id: invite.id }];
  await p.goto(base + "/");
  await p.getByRole("heading", { name: "Como foi sua conversa com aliada de teste?" }).waitFor();
  await p.getByRole("button", { name: "Lembrar depois" }).click();
  await p.getByText("Combinado, perguntamos de novo em 3 dias.").waitFor();
  assert.equal(calls.filter((x) => x.endpoint === "mvp_feedback_later").at(-1).body.pedido, pedidos[0]?.id ?? "50000000-0000-0000-0000-000000000001");
  await p.getByRole("heading", { name: /Como foi sua conversa/ }).waitFor({ state: "detached" });
  console.log("PASSOU: cartão 'Como foi sua conversa' no Início e 'Lembrar depois'");
  // Convite recebido: revisão e resposta diretamente no Início, sem contato antecipado.
  invites=[{...invite,sender_id:other,recipient_id:uid,state:"pendente"}];
  await p.goto(base+"/");
  await p.getByRole("button",{name:"Aceitar convite",exact:true}).waitFor();
  const contatosAntes=calls.filter(c=>c.endpoint==="mvp_shared_contacts").length;
  await p.getByText("Ver mensagem",{exact:true}).click();
  await p.getByText("mensagem de teste autorizada",{exact:true}).waitFor();
  await p.getByText("Apoio profissional de teste",{exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.endpoint==="mvp_shared_contacts").length,contatosAntes);
  const { mkdir: pastaConvites }=await import("node:fs/promises");
  await pastaConvites(`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "B5"}`,{recursive:true});
  for(const width of [390,1440]) {await p.setViewportSize({width,height:1000});await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(200);await p.screenshot({path:`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "B5"}/convite-${width}.png`,fullPage:true});}
  await p.getByRole("button",{name:"Aceitar convite",exact:true}).click();
  await p.getByText("Convite aceito. Os contatos já aparecem no cartão.",{exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.endpoint==="mvp_respond").at(-1).body.accept,true);
  invites=[{...invite,sender_id:other,recipient_id:uid,state:"pendente"}];
  await p.goto(base+"/");
  await p.getByRole("button",{name:"Agora não",exact:true}).click();
  await p.getByText("Convite recusado.",{exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.endpoint==="mvp_respond").at(-1).body.accept,false);
  console.log("PASSOU: convite recebido é revisado, aceito ou recusado no Início sem contatos antecipados");
  invites = [{ ...invite, state: "expirado", horario_confirmado: null }];
  await p.goto(base + "/minhas-aliancas");
  await p.getByRole("tab", { name: /Concluídas/ }).click();
  await p.getByText("Expirou sem resposta.").waitFor();
  assert.equal(await p.getByRole("link", { name: "Pedir outra indicação" }).getAttribute("href"), "/");
  console.log("PASSOU: convite expirado aparece em Concluídas com 'Pedir outra indicação'");

  professional.ai_consent=true;professional.ai_consent_version="legado";
  await p.goto(base + "/meu-perfil");
  await p.getByRole("heading", { name: "Meu perfil", exact: true }).waitFor();
  assert(!(await p.getByRole("checkbox",{name:/Autorizo enviar ao Gemini/}).isChecked()),"consentimento legado não marca automaticamente a finalidade nova");
  await p.getByText("de 5 seções completas").waitFor();
  assert.equal(await p.getByText("Minhas buscas").count(), 0, "sem Minhas buscas no perfil");
  assert.deepEqual(
    await p.locator("main section > h2").allInnerTexts(),
    ["Sobre você", "Você hoje", "Como você pode ajudar", "Contatos", "Privacidade", "Conta"],
    "o perfil tem 6 seções",
  );
  assert.equal(await p.getByText("Link da minha sala de chamada (opcional)").count(), 0, "sem sala de chamada");
  assert.equal(await p.getByText("Quando você costuma ter tempo").count(), 0, "sem grade de disponibilidade");
  for (const width of [390,1440]) {await p.setViewportSize({width,height:1000});await p.screenshot({path:`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "A3"}/perfil-menu-fechado-${width}.png`,fullPage:true});}
  await p.locator("summary").filter({hasText:"Escolher habilidades"}).click();
  await p.locator("#contatos").scrollIntoViewIfNeeded();
  await p.evaluate(()=>document.getElementById("contatos").scrollIntoView());
  await p.waitForTimeout(250);
  assert.equal(await p.getByRole("navigation",{name:"Seções do perfil"}).locator('[aria-current="location"]').innerText(),"Contatos","índice acompanha a rolagem");
  const antesFoco = calls.filter(x => x.endpoint === "professional_profiles").length;
  await p.getByRole("checkbox", { name: /^Networking/ }).click();
  await p.evaluate(() => window.dispatchEvent(new Event("focus")));
  await p.waitForTimeout(400);
  assert.equal(calls.filter(x => x.endpoint === "professional_profiles").length, antesFoco, "foco não recarrega formulário");
  assert(await p.getByRole("checkbox", { name: /^Networking/ }).isChecked());
  assert(await p.evaluate(uid => !!sessionStorage.getItem(`aliadas:rascunho-perfil:${uid}`), uid));
  // Navegação interna cancelada e recuperação após recarregar.
  let avisoSaida = false;
  const resolverAviso = async dialog => { avisoSaida = true; if (dialog.type() === "beforeunload") await dialog.accept(); else await dialog.dismiss(); };
  p.on("dialog", resolverAviso);
  await p.getByRole("navigation", { name: "Principal" }).first().getByRole("link", { name: "Início", exact: true }).click();
  await p.waitForTimeout(150);
  assert(avisoSaida, "navegação interna exige confirmação");
  assert(new URL(p.url()).pathname === "/meu-perfil");
  await p.reload();
  await p.getByText("Recuperamos o que você não tinha salvado.").waitFor();
  await p.locator("summary").filter({hasText:"Escolher habilidades"}).click();
  assert(await p.getByRole("checkbox", { name: /^Networking/ }).isChecked());
  await p.getByRole("button", { name: "Descartar", exact: true }).click();
  p.off("dialog", resolverAviso);
  assert(!(await p.getByRole("checkbox", { name: /^Networking/ }).isChecked()));
  const { mkdir } = await import("node:fs/promises");
  await mkdir(`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "A2"}`, { recursive: true });
  for (const width of [390, 1440]) {
    await p.setViewportSize({ width, height: 900 });
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(250);
    await p.screenshot({ path: `/workspace/aliadas-review/${process.env.REVIEW_STAGE || "A2"}/perfil-${width}.png`, fullPage: true });
  }
  console.log("PASSOU: foco preserva marcações, navegação avisa, rascunho restaura e descarta");
  await p.getByRole("button", { name: "Salvar", exact: true }).click();
  await p.getByText("Confira o e-mail.").waitFor();
  assert(!calls.some((x) => x.endpoint === "mvp_save_profile"), "não salva com erro");
  await p.getByRole("textbox", { name: "E-mail para contato" }).fill("contato@exemplo.invalid");
  await p.getByRole("button", { name: "Salvar", exact: true }).click();
  await p.getByText("Perfil salvo.").waitFor();
  assert.equal(savedProfile.p.ai_consent, false);
  assert.equal(savedProfile.c.email, "contato@exemplo.invalid");
  assert.notEqual(savedProfile.c.email, session.user.email);
  assert.deepEqual(savedProfile.p.can_help, ["entrevista"]);
  assert.equal(savedProfile.c.meet,"", "Meet não autorizado é limpo ao salvar");
  console.log("PASSOU: perfil com seções abertas, erro ao lado do campo, sem sala nem grade e sem consentimento automático de IA");
  await p.getByRole("heading", { name: "Como você pode ajudar" }).waitFor();
  for (const fora of ["Quero conversar sobre", "Como você quer participar agora?"])
    assert.equal(await p.getByText(fora, { exact: true }).count(), 0, `sem ${fora}`);
  await p.getByText("Escolha o que você sabe fazer e toparia compartilhar numa conversa.", { exact: true }).waitFor();
  if (!(await p.getByRole("textbox",{name:"Buscar habilidades"}).isVisible())) await p.locator("summary").filter({hasText:"Escolher habilidades"}).click();
  await p.getByRole("checkbox", { name: /^Preparação para entrevistas/ }).click();
  await p.getByRole("checkbox",{name:"Disponível para receber convites",exact:true}).uncheck();
  await p.getByRole("button", { name: "Salvar", exact: true }).click();
  await p.getByText("Perfil salvo.").last().waitFor();
  const ultimo = calls.filter((x) => x.endpoint === "mvp_save_profile").at(-1).body;
  assert.deepEqual(ultimo.p.habilidades, [], "habilidades opcionais: pode só buscar");
  assert.deepEqual(ultimo.p.can_help, ["entrevista"], "preserva temas legados durante a transição");
  assert.equal(await p.getByRole("textbox",{name:"Buscar habilidades"}).count(),0,"sem habilidades exigidas quando indisponível");
  await p.getByRole("checkbox",{name:"Disponível para receber convites",exact:true}).check();
  await p.locator("summary").filter({hasText:"Escolher habilidades"}).click();
  await p.getByRole("textbox", { name: "Buscar habilidades" }).fill("processo seletivo");
  await p.getByRole("checkbox", { name: /^Preparação para entrevistas/ }).waitFor();
  assert.equal(await p.getByRole("checkbox", { name: /^Networking/ }).count(), 0);
  await p.getByRole("checkbox", { name: /^Preparação para entrevistas/ }).check();
  await p.getByRole("textbox", { name: "Buscar habilidades" }).fill("");
  assert(!("want_talk" in ultimo.p) && !("modos" in ultimo.p));
  console.log("PASSOU: 'Como você pode ajudar' só com 'Posso ajudar com', opcional");
  // Foto: arquivo grande (8 MB), PNG com transparência, colar, arrastar e recusa de não imagem
  const { deflateSync } = await import("node:zlib");
  function bmp(w, h) {
    const linha = w * 3, tam = 54 + linha * h, b = Buffer.alloc(tam);
    b.write("BM", 0); b.writeUInt32LE(tam, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14);
    b.writeInt32LE(w, 18); b.writeInt32LE(h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28);
    for (let i = 54; i < tam; i += 3) { b[i] = (i * 7) & 255; b[i + 1] = (i * 13) & 255; b[i + 2] = (i * 31) & 255; }
    return b;
  }
  function png(w, h) {
    const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const bloco = (tipo, dados) => { const t = Buffer.concat([Buffer.from(tipo), dados]); const o = Buffer.alloc(4); o.writeUInt32BE(dados.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(t)); return Buffer.concat([o, t, c]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    const cru = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * (w * 4 + 1) + 1 + x * 4; cru[i] = 200; cru[i + 1] = 60; cru[i + 2] = 90; cru[i + 3] = x < w / 2 ? 0 : 255; }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco("IHDR", ihdr), bloco("IDAT", deflateSync(cru)), bloco("IEND", Buffer.alloc(0))]);
  }
  const uploads = [];
  await context.route("**/storage/v1/object/**", async (route) => {
    const r = route.request();
    if (r.method() === "POST" && !r.url().includes("/object/sign/")) {
      // o supabase-js envia em multipart: o arquivo é a parte que começa em RIFF....WEBP
      const corpo = r.postDataBuffer() ?? Buffer.alloc(0);
      const ini = corpo.indexOf("RIFF"), fim = corpo.lastIndexOf("\r\n--");
      const webp = ini >= 0 && corpo.subarray(ini + 8, ini + 12).toString() === "WEBP";
      uploads.push({ url: r.url(), tipo: webp ? "image/webp" : "outro", tamanho: webp ? fim - ini : 0 });
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "fotos/x", signedURL: "/x" }) });
  });
  await p.goto(base + "/meu-perfil");
  await p.getByText("Do celular ou do computador. Você pode ajustar o enquadramento.").waitFor();
  await p.getByRole("textbox", { name: "E-mail para contato" }).fill("email-invalido");
  assert.equal(await p.getByText(/JPG, PNG ou WebP até 2 MB/).count(), 0, "texto antigo da foto saiu");
  const entrada = p.locator('input[type="file"]');
  assert.equal(await entrada.getAttribute("accept"), "image/*");
  assert.equal(await entrada.getAttribute("capture"), null, "sem capture: o celular oferece câmera, fototeca e arquivos");
  assert.equal(await p.getByRole("button", { name: "Usar a câmera" }).count(), 1, "câmera no computador");
  await entrada.setInputFiles({ name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("não sou imagem") });
  await p.getByText("Não conseguimos abrir essa foto. Tente uma JPG ou PNG.").waitFor();
  await entrada.setInputFiles({ name: "falsa.jpg", mimeType: "image/jpeg", buffer: Buffer.from("isso não é um jpeg") });
  await p.getByText("Não conseguimos abrir essa foto. Tente uma JPG ou PNG.").waitFor();
  const grande = bmp(1800, 1600);
  assert(grande.length > 8 * 1024 * 1024, "arquivo de teste tem mais de 8 MB");
  await entrada.setInputFiles({ name: "grande.bmp", mimeType: "image/bmp", buffer: grande });
  await p.getByRole("dialog", { name: "Ajuste o enquadramento" }).waitFor();
  await p.getByRole("slider", { name: "Zoom" }).fill("1.5");
  await p.getByRole("button", { name: "Usar esta foto" }).click();
  await p.getByRole("img", { name: "Prévia da foto" }).waitFor();
  assert(calls.some(c=>c.endpoint==="mvp_save_photo"),"foto salva mesmo com e-mail incompleto no formulário");
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].tipo, "image/webp");
  assert(uploads[0].tamanho > 0 && uploads[0].tamanho <= 2 * 1024 * 1024, `foto final até 2 MB (${uploads[0].tamanho})`);
  assert.match(calls.filter((x) => x.endpoint === "mvp_save_photo").at(-1).body.photo, new RegExp(`^${uid}/[0-9a-f-]{36}\\.webp$`));
  await p.evaluate(()=>{window.createImageBitmap=async()=>{throw Error("Simula navegador sem ImageBitmap");};});
  // PNG com transparência, por colar (Ctrl/Cmd+V com a área focada)
  const transparente = png(300, 200).toString("base64");
  await p.getByRole("group", { name: "Foto (opcional)" }).focus();
  await p.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "transparente.png", { type: "image/png" }));
    document.activeElement.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
  }, transparente);
  await p.getByRole("dialog", { name: "Ajuste o enquadramento" }).waitFor();
  await p.getByRole("button", { name: "Usar esta foto" }).click();
  await p.getByRole("dialog", { name: "Ajuste o enquadramento" }).waitFor({ state: "detached" });
  // arrastar e soltar
  await p.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "solta.png", { type: "image/png" }));
    const alvo = document.querySelector('[role="group"][tabindex="0"]');
    alvo.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, transparente);
  await p.getByRole("dialog", { name: "Ajuste o enquadramento" }).waitFor();
  await p.getByRole("button", { name: "Usar esta foto" }).click();
  await p.getByRole("dialog",{name:"Ajuste o enquadramento"}).waitFor({state:"detached"});
  await p.getByRole("textbox", { name: "E-mail para contato" }).fill("contato@exemplo.invalid");
  await p.getByRole("button", { name: "Salvar", exact: true }).click();
  await p.getByText("Perfil salvo.").last().waitFor();
  assert.equal(uploads.length, 3);
  assert.equal(uploads[1].tipo, "image/webp");
  assert(uploads[1].tamanho <= 2 * 1024 * 1024);
  console.log("PASSOU: foto de 8 MB reduzida a WebP ≤ 2 MB, PNG transparente por colar e arrastar, não imagem recusada");
  await context.route("**/auth/v1/user", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session.user),
    }),
  );
  await p.evaluate(() => sessionStorage.setItem("aliadas-nova-senha", "1"));
  await p.goto(base + "/entrar");
  await p.waitForURL(base + "/meu-perfil");
  await p
    .getByLabel("Nova senha", { exact: true })
    .fill("senha-apenas-do-teste");
  await p
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("senha-apenas-do-teste");
  await p
    .getByRole("button", { name: ci("salvar senha"), exact: true })
    .click();
  await p.getByText(ci("senha atualizada."), { exact: true }).waitFor();
  assert.equal(
    await p.evaluate(() => sessionStorage.getItem("aliadas-nova-senha")),
    null,
  );
  console.log(
    "PASSOU: recuperação de senha preservada e integrada ao novo perfil",
  );
  assert.equal(await p.getByRole("link", { name: "Painel" }).count(), 0, "usuária comum não vê o Painel");
  await p.goto(base + "/painel");
  await p.waitForURL(base + "/");
  assert.equal(await p.locator('a[href="/painel"], a[href="/curadoria"]').count(), 0);
  await p.goto(base + "/curadoria");
  await p.waitForURL(base + "/");
  console.log(
    "PASSOU: participante comum não vê administração e URL direta bloqueia",
  );
  hasProfessional = false;
  await p.goto(base + "/meu-perfil");
  await p.getByRole("heading", { name: "Boas-vindas à aliadas" }).waitFor();
  assert.equal(await p.getByText("O que você faz ou estuda").count(), 0, "sem texto livre");
  assert.equal(await p.getByText("Posso ajudar com", { exact: true }).count(), 0, "listas ficam para depois");
  assert.equal(await p.getByText("Como você quer participar agora?").count(), 0, "sem os chips de participação");
  await p.getByRole("button", { name: "Entrar na aliadas" }).click();
  await p.getByText("Escolha uma opção.").first().waitFor();
  await p.getByRole("combobox", { name: "Você hoje" }).selectOption("estudo");
  await p.getByRole("combobox", { name: "Sua área de atuação ou estudo" }).selectOption("decidindo");
  await p.getByRole("checkbox", { name: /Sou mulher cis/ }).check();
  const antesNovo = calls.filter((x) => x.endpoint === "mvp_save_profile").length;
  await p.getByRole("button", { name: "Entrar na aliadas" }).click();
  await p.waitForURL(base + "/");
  const cad = calls.filter((x) => x.endpoint === "mvp_save_profile").slice(antesNovo)[0].body;
  assert.equal(cad.p.situacao, "estudo");
  assert.equal(cad.p.area_principal, "decidindo");
  assert.deepEqual(cad.p.channels, []);
  hasProfessional = true;
  console.log("PASSOU: primeiro acesso numa tela só, sem assuntos nem contatos");
  // perfil incompleto: buscar leva ao "Falta pouco" e a busca continua depois
  const completo = { ...professional };
  Object.assign(professional, { channels: [], interesses: [] });
  await p.goto(base + "/");
  await p.getByRole("textbox", { name: "Qual é o objetivo da sua próxima conversa?" }).fill("Quero ampliar minha rede profissional");
  await p.getByRole("checkbox", {name:/Autorizo a IA a sugerir/}).check();
  await p.getByRole("button",{name:"Descobrir habilidades com IA"}).click();
  await p.getByRole("button", { name: "Encontrar minha aliada", exact: true }).click();
  await p.waitForURL(/\/completar-perfil\?objetivo=/);
  await p.getByRole("heading", { name: "Falta pouco para sua primeira conversa" }).waitFor();
  await p.locator("label.chip", { hasText: "E-mail" }).click();
  await p.getByRole("textbox", { name: "E-mail para contato" }).fill("contato@exemplo.invalid");
  Object.assign(professional, completo);
  const antesBusca = calls.filter((x) => x.endpoint === "mvp_find_for_objective").length;
  await p.getByRole("button", { name: "Salvar e continuar" }).click();
  await p.waitForURL(base + "/");
  await p.waitForTimeout(800);
  assert.equal(calls.filter((x) => x.endpoint === "mvp_find_for_objective").length, antesBusca + 1, "a busca continua de onde parou");
  console.log("PASSOU: 'Falta pouco' só quando precisa e a busca continua depois de salvar");
  for (const width of [375, 390, 768, 1440])
    for (const theme of ["light", "dark"]) {
      await p.emulateMedia({ colorScheme: theme });
      await p.setViewportSize({ width, height: 1000 });
      for (const path of ["/", "/minhas-aliancas", "/meu-perfil"]) {
        await p.goto(base + path);
        await p.getByRole("heading", { level: 1 }).waitFor();
        assert.equal(
          await p.getByRole("navigation", { name: "Navegação" }).isVisible(),
          width < 640,
          `${path}: navegação inferior em ${width}`,
        );
        await p.waitForTimeout(350);
        assert.equal(
          await p.evaluate(() => document.body.scrollWidth > innerWidth),
          false,
          `${path}: overflow em ${width}`,
        );
      }
    }
  jobState = "executando";
  requests = [{ ...request }];
  invites = [];
  await p.clock.install();
  const start = calls.length;
  await p.goto(base);
  await p.getByText("A IA está procurando quem pode ajudar…", { exact: true }).waitFor();
  for (let n = 0; n < 12; n++) {
    await p.clock.runFor(10000);
    await new Promise((r) => setTimeout(r, 60));
  }
  const count = () =>
    calls.slice(start).filter((c) => c.endpoint === "mvp_job_status").length;
  assert.equal(count(), 5, "polling deve parar após cinco consultas");
  await p
    .getByText(
      "A IA está demorando. Mostramos uma indicação pelas habilidades.",
      { exact: true },
    )
    .waitFor();
  await p.clock.runFor(120000);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(count(), 5);
  console.log("PASSOU: polling para após cinco consultas, sem laço ilimitado");
  assert.deepEqual(errors, []);
  console.log(
    "PASSOU: telas internas em 375/390/768/1440, claro e escuro, sem overflow nem erros JavaScript",
  );
} finally {
  await browser.close();
}
