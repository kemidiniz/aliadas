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
  mode: "basica",
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
    3,
  );
  assert.equal(await g.locator('a[href="/forum"]').count(), 0);
  await g.getByText("© 2026 Kemily Diniz. Todos os direitos reservados.").waitFor();
  await g.getByRole("link", { name: "Quem somos" }).first().click();
  await g.waitForURL(base + "/quem-somos");
  await g.getByRole("heading", { level: 2, name: "Como funciona" }).waitFor();
  assert.equal(await g.title(), "Quem somos · aliadas");
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
        mode: requests[0]?.mode ?? "basica",
        has_candidate: true,
      };
    if (endpoint === "mvp_admin_access")
      data = {
        principal: false,
        legacy: false,
        review_profiles: false,
        handle_reports: false,
      };
    if (endpoint === "mvp_create_request") {
      requests = [request];
      data = request.id;
    }
    if (endpoint === "mvp_invite") {
      invites = [invite];
      data = invite.id;
    }
    if (endpoint === "mvp_save_profile") {
      savedProfile = body;
      data = null;
    }
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
  jobState = "executando";
  await p.goto(base);
  await p.getByRole("heading", { level: 1, name: /Olá/ }).waitFor();
  // "Quero conversar sobre" só pré-seleciona o objetivo
  const objetivo = p.getByRole("combobox", { name: "Qual é o objetivo da sua próxima conversa?" });
  assert.equal(await objetivo.inputValue(), "carreira", "primeiro 'quero conversar sobre' vem pré-selecionado");
  assert.equal(await p.getByRole("textbox", { name: "Qual é o objetivo?" }).count(), 0, "sem campo de contexto fora de 'Outro'");
  await objetivo.selectOption("outro");
  await p.getByRole("textbox", { name: "Qual é o objetivo?" }).waitFor();
  await objetivo.selectOption("carreira");
  await p.getByRole("button", { name: "Encontrar minha aliada", exact: true }).click();
  await p.getByRole("heading", { name: "Sua indicação" }).waitFor();
  assert.equal(await p.getByText("Próximas conversas").count(), 0, "Início sem histórico nem agenda");
  await p.getByText("aliada de teste", { exact: true }).waitFor();
  assert(!calls.some((x) => x.endpoint === "mvp_invite"));
  assert.equal(await p.getByText("Sugerido pela IA", { exact: true }).count(), 0, "modo básico sem selo de IA");
  assert.deepEqual(calls.find((x) => x.endpoint === "mvp_create_request").body, { goal: "carreira", description: "" });
  assert.equal(await p.getByRole("button", { name: /atualizar resultado/i }).count(), 0);
  console.log("PASSOU: objetivo em menu suspenso, texto só para Outro, Início sem histórico e sem convite automático");
  await p.getByRole("textbox", { name: "Sua mensagem" }).fill("minha mensagem revisada de teste");
  await p.getByText("Preparando a conversa com IA", { exact: true }).waitFor();
  requests = [
    {
      ...request,
      mode: "generativa",
      questions: ["Pergunta de teste um?", "Pergunta de teste dois?"],
      draft: "Rascunho gerado apenas no mock local",
    },
  ];
  jobState = "concluida";
  await p.getByText("Pergunta de teste um?", { exact: true }).waitFor({ timeout: 15000 });
  await p.getByText("Sugerido pela IA", { exact: true }).waitFor();
  await p.getByText("Revise antes de enviar. Você decide se manda.").waitFor();
  assert.equal(await p.getByRole("textbox", { name: "Sua mensagem" }).inputValue(), "minha mensagem revisada de teste");
  console.log("PASSOU: resultado assíncrono aparece sozinho e preserva a mensagem editada (API simulada)");
  const antes = calls.filter((x) => x.endpoint === "mvp_create_request").length;
  await p.getByRole("button", { name: "Ver outra sugestão" }).click();
  await p.waitForTimeout(300);
  assert(calls.some((x) => x.endpoint === "mvp_next_suggestion"));
  assert.equal(calls.filter((x) => x.endpoint === "mvp_create_request").length, antes);
  console.log("PASSOU: ver outra sugestão usa a RPC própria e não cria nova busca");
  await p.getByRole("button", { name: "Enviar convite" }).click();
  await p.getByText("Convite enviado. Você acompanha em Conversas.").waitFor();
  assert.equal(calls.find((x) => x.endpoint === "mvp_invite").body.message, "minha mensagem revisada de teste");
  console.log("PASSOU: convite só com a mensagem revisada");

  await p.goto(base + "/minhas-conversas");
  await p.getByRole("tab", { name: /Enviados/, selected: true }).waitFor();
  await p.getByRole("link", { name: "E-mail", exact: true }).waitFor();
  await p.getByText(/Quer conversar sobre:\s*Dicas de carreira/).first().waitFor();
  assert.equal(await p.getByRole("link", { name: "WhatsApp", exact: true }).count(), 0);
  await p.locator('[aria-current="step"]').getByText("Avaliação").waitFor();
  await p.getByText("Combinem a conversa por onde preferirem.").waitFor();
  await p.getByText("Nome completo: Aliada de Teste Completa").waitFor();
  for (const fora of [/Entrar na chamada/, /Adicionar à agenda/, /Baixar \.ics/, /Proponha/, /Horário/])
    assert.equal(await p.getByText(fora).count(), 0, `sem ${fora}`);
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
  invites = [{ ...invite, state: "expirado", horario_confirmado: null }];
  await p.goto(base + "/minhas-conversas");
  await p.getByRole("tab", { name: /Concluídas/ }).click();
  await p.getByText("Expirou sem resposta.").waitFor();
  assert.equal(await p.getByRole("link", { name: "Pedir outra indicação" }).getAttribute("href"), "/");
  console.log("PASSOU: convite expirado aparece em Concluídas com 'Pedir outra indicação'");

  await p.goto(base + "/meu-perfil");
  await p.getByRole("heading", { name: "Meu perfil", exact: true }).waitFor();
  await p.getByText("de 5 seções completas").waitFor();
  assert.equal(await p.getByText("Link da minha sala de chamada (opcional)").count(), 0, "sem sala de chamada");
  assert.equal(await p.getByText("Quando você costuma ter tempo").count(), 0, "sem grade de disponibilidade");
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
  assert(!("meet" in savedProfile.c), "sala não é enviada");
  console.log("PASSOU: perfil com seções abertas, erro ao lado do campo, sem sala nem grade e sem consentimento automático de IA");
  assert.equal(await p.getByRole("checkbox", { name: "Topo ajudar alguém" }).isChecked(), true, "estado inicial vem das listas");
  assert.equal(await p.getByRole("checkbox", { name: "Quero uma conversa" }).isChecked(), true);
  p.once("dialog", (d) => d.dismiss());
  await p.locator("label.chip", { hasText: "Topo ajudar alguém" }).click();
  assert.equal(await p.getByText("Posso ajudar com", { exact: true }).count(), 1, "cancelar mantém a lista");
  p.once("dialog", (d) => d.accept());
  await p.locator("label.chip", { hasText: "Topo ajudar alguém" }).click();
  assert.equal(await p.getByText("Posso ajudar com", { exact: true }).count(), 0, "aceitar esconde e limpa a lista");
  await p.locator("label.chip", { hasText: "Quero uma conversa" }).click();
  await p.getByText("Mantenha pelo menos uma opção marcada.").waitFor();
  await p.getByRole("button", { name: "Salvar", exact: true }).click();
  await p.getByText("Perfil salvo.").last().waitFor();
  const ultimo = calls.filter((x) => x.endpoint === "mvp_save_profile").at(-1).body;
  assert.deepEqual(ultimo.p.can_help, []);
  assert.deepEqual(ultimo.p.want_talk, ["carreira"]);
  console.log("PASSOU: 'Como você quer participar agora?' mostra as listas, confirma antes de limpar e exige uma opção");
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
  await p.getByRole("button", { name: "Entrar na aliadas" }).click();
  await p.getByText("Escolha pelo menos uma forma de participar.").waitFor();
  await p.getByRole("combobox", { name: "Você hoje" }).selectOption("estudo");
  await p.getByRole("combobox", { name: "Sua área de atuação ou estudo" }).selectOption("decidindo");
  await p.locator("label.chip", { hasText: "Quero uma conversa" }).click();
  await p.getByRole("checkbox", { name: /Sou mulher cis/ }).check();
  const antesNovo = calls.filter((x) => x.endpoint === "mvp_save_profile").length;
  await p.getByRole("button", { name: "Entrar na aliadas" }).click();
  await p.waitForURL(base + "/");
  const cad = calls.filter((x) => x.endpoint === "mvp_save_profile").slice(antesNovo)[0].body;
  assert.deepEqual(cad.p.modos, ["conversa"]);
  assert.equal(cad.p.situacao, "estudo");
  assert.equal(cad.p.area_principal, "decidindo");
  assert.deepEqual(cad.p.channels, []);
  hasProfessional = true;
  console.log("PASSOU: primeiro acesso numa tela só, sem assuntos nem contatos");
  // perfil incompleto: buscar leva ao "Falta pouco" e a busca continua depois
  const completo = { ...professional };
  Object.assign(professional, { channels: [], interesses: [] });
  await p.goto(base + "/");
  await p.getByRole("button", { name: "Encontrar minha aliada", exact: true }).click();
  await p.waitForURL(/\/completar-perfil\?buscar=carreira/);
  await p.getByRole("heading", { name: "Falta pouco para sua primeira conversa" }).waitFor();
  await p.locator("label.chip", { hasText: "Saúde" }).click();
  await p.locator("label.chip", { hasText: "E-mail" }).click();
  await p.getByRole("textbox", { name: "E-mail para contato" }).fill("contato@exemplo.invalid");
  Object.assign(professional, completo);
  const antesBusca = calls.filter((x) => x.endpoint === "mvp_create_request").length;
  await p.getByRole("button", { name: "Salvar e continuar" }).click();
  await p.waitForURL(base + "/");
  await p.waitForTimeout(800);
  assert.equal(calls.filter((x) => x.endpoint === "mvp_create_request").length, antesBusca + 1, "a busca continua de onde parou");
  console.log("PASSOU: 'Falta pouco' só quando precisa e a busca continua depois de salvar");
  for (const width of [375, 390, 768, 1440])
    for (const theme of ["light", "dark"]) {
      await p.emulateMedia({ colorScheme: theme });
      await p.setViewportSize({ width, height: 1000 });
      for (const path of ["/", "/minhas-conversas", "/meu-perfil"]) {
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
  await p.getByText("Preparando a conversa com IA", { exact: true }).waitFor();
  for (let n = 0; n < 12; n++) {
    await p.clock.runFor(10000);
    await new Promise((r) => setTimeout(r, 60));
  }
  const count = () =>
    calls.slice(start).filter((c) => c.endpoint === "mvp_job_status").length;
  assert.equal(count(), 8, "polling deve parar após oito consultas");
  await p
    .getByText(
      "A IA está demorando: você pode continuar com compatibilidade básica",
      { exact: true },
    )
    .waitFor();
  await p.clock.runFor(120000);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(count(), 8);
  console.log("PASSOU: polling para após oito consultas, sem laço ilimitado");
  assert.deepEqual(errors, []);
  console.log(
    "PASSOU: telas internas em 375/390/768/1440, claro e escuro, sem overflow nem erros JavaScript",
  );
} finally {
  await browser.close();
}
