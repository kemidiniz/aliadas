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
};
let proposals = [];
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
        meet: invites[0]?.horario_confirmado ? "https://meet.jit.si/sala-teste" : null,
        common_slots: ["1_tarde"],
      };
    if (endpoint === "mvp_feedback") {
      feedback = body;
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
  assert(await p.getByRole("radio", { name: "Dicas de carreira" }).isChecked());
  await p.getByRole("button", { name: "Encontrar minha aliada", exact: true }).click();
  await p.getByRole("heading", { name: "Suas buscas" }).waitFor();
  await p.getByText("aliada de teste", { exact: true }).waitFor();
  assert(!calls.some((x) => x.endpoint === "mvp_invite"));
  assert.deepEqual(calls.find((x) => x.endpoint === "mvp_create_request").body, { goal: "carreira", description: "" });
  assert.equal(await p.getByRole("button", { name: /atualizar resultado/i }).count(), 0);
  console.log("PASSOU: objetivo da conversa em chips, busca em cartão e sem convite automático");
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
  assert.equal(await p.getByRole("link", { name: "WhatsApp", exact: true }).count(), 0);
  await p.locator('[aria-current="step"]').getByText("Horário").waitFor();
  await p.getByText("Proponha até 3 horários (Brasília)").waitFor();
  await p.getByRole("button", { name: "Enviar horários" }).click();
  await p.getByText("Horários enviados.").waitFor();
  const prop = calls.find((x) => x.endpoint === "mvp_propose_times").body;
  assert(prop.horarios.length >= 1 && prop.horarios.length <= 3);
  for (const h of prop.horarios) {
    const t = new Date(h).getTime();
    assert(t > Date.now() && t < Date.now() + 14 * 86400000, "horário nos próximos 14 dias");
  }
  console.log("PASSOU: horários sugeridos dos períodos em comum, até 3 e nos próximos 14 dias");
  // menu ⋯ pelo teclado
  await p.getByRole("button", { name: "Mais opções" }).focus();
  await p.keyboard.press("Enter");
  await p.getByRole("menuitem", { name: "Bloquear" }).waitFor();
  await p.keyboard.press("ArrowDown");
  assert.equal(await p.evaluate(() => document.activeElement?.textContent), "Denunciar");
  await p.keyboard.press("Escape");
  assert.equal(await p.getByRole("menu").count(), 0);
  console.log("PASSOU: menu de bloqueio e denúncia acessível pelo teclado");
  invites = [{ ...invite, horario_confirmado: new Date(Date.now() + 2 * 86400000).toISOString() }];
  await p.goto(base + "/minhas-conversas");
  await p.getByText("Horário confirmado", { exact: true }).waitFor();
  assert.equal(await p.getByRole("link", { name: /Entrar na chamada/ }).getAttribute("href"), "https://meet.jit.si/sala-teste");
  assert.match(await p.getByRole("link", { name: /Adicionar à agenda/ }).getAttribute("href"), /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  console.log("PASSOU: horário confirmado mostra sala e link de agenda");
  await p.getByRole("button", { name: /Avaliar a conversa/ }).click();
  await p.getByText("Sim", { exact: true }).click();
  await p.getByRole("button", { name: "5", exact: true }).click();
  await p.getByText("Mais clareza", { exact: true }).click();
  await p.getByRole("button", { name: "Salvar avaliação" }).click();
  await p.getByText("Avaliação salva. Obrigada!").waitFor();
  assert.equal(feedback.utility, 5);
  assert.equal(feedback.outcome, "clareza");
  console.log("PASSOU: contatos autorizados e avaliação em botões");

  await p.goto(base + "/meu-perfil");
  await p.getByRole("heading", { name: "Meu perfil", exact: true }).waitFor();
  await p.getByText("de 5 seções completas").waitFor();
  const celula = p.getByRole("button", { name: "segunda, manhã" });
  assert.equal(await celula.getAttribute("aria-pressed"), "false");
  await celula.click();
  assert.equal(await celula.getAttribute("aria-pressed"), "true");
  await celula.focus();
  await p.keyboard.press("ArrowRight");
  assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label")), "terça, manhã");
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
  assert(savedProfile.p.slots.includes("1_manha"));
  console.log("PASSOU: perfil com seções abertas, erro ao lado do campo, grade pelo teclado e sem consentimento automático de IA");
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
  await p.goto(base + "/curadoria");
  await p.waitForURL(base + "/");
  assert.equal(await p.locator('a[href="/curadoria"]').count(), 0);
  console.log(
    "PASSOU: participante comum não vê administração e URL direta bloqueia",
  );
  hasProfessional = false;
  await p.goto(base + "/meu-perfil");
  await p.getByText("Passo 1 de 3").waitFor();
  await p.getByRole("button", { name: "Continuar" }).click();
  await p.getByText("Conte o que você faz ou estuda.").waitFor();
  await p.getByRole("textbox", { name: "O que você faz ou estuda" }).fill("analista de teste");
  await p.locator("label.chip", { hasText: "Saúde" }).click();
  await p.getByRole("button", { name: "Continuar" }).click();
  await p.getByText("Passo 2 de 3").waitFor();
  hasProfessional = true;
  console.log("PASSOU: primeiro acesso em 3 passos com barra de progresso");
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
