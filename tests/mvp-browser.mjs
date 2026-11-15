// Teste local com Auth/API simulados. Não usa usuárias nem banco de produção.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
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
  themes: ["carreira"],
  intentions: ["buscar", "compartilhar"],
  channels: ["email"],
  slots: ["1_tarde"],
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
  explanation: "compatibilidade básica por objetivo e áreas.",
  questions: [],
  draft: null,
  goal: "carreira",
  intention: "buscar",
};
const invite = {
  id: "30000000-0000-0000-0000-000000000001",
  request_id: request.id,
  sender_id: uid,
  recipient_id: other,
  message: "mensagem de teste autorizada",
  state: "aceita",
  sender_time: null,
  recipient_time: null,
};
let requests = [],
  invites = [],
  savedProfile = null,
  feedback = null;
const calls = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const guest = await browser.newContext();
  const g = await guest.newPage();
  await g.goto(base);
  await g
    .getByRole("heading", { name: "uma conversa pode abrir novos caminhos." })
    .waitFor();
  assert.equal(
    await g
      .getByRole("navigation", { name: "principal" })
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
    if (endpoint === "professional_profiles") data = [professional];
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
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await p.getByRole("heading", { name: "encontre uma aliada" }).waitFor();
  await p
    .getByRole("button", { name: "encontrar uma aliada", exact: true })
    .click();
  await p.getByText("aliada de teste", { exact: true }).waitFor();
  await p
    .getByText("compatibilidade básica • sem IA generativa", { exact: true })
    .waitFor();
  assert(!calls.some((x) => x.endpoint === "mvp_invite"));
  console.log(
    "PASSOU: solicitação mostra uma sugestão e não convida automaticamente",
  );
  await p
    .getByRole("textbox", { name: "sua mensagem inicial" })
    .fill("minha mensagem revisada de teste");
  await p.getByRole("button", { name: "aprovar e enviar convite" }).click();
  await p
    .getByText("convite enviado. acompanhe o aceite em minhas conversas.")
    .waitFor();
  assert.equal(
    calls.find((x) => x.endpoint === "mvp_invite").body.message,
    "minha mensagem revisada de teste",
  );
  await p.goto(base + "/minhas-conversas");
  await p.getByRole("link", { name: "e-mail", exact: true }).waitFor();
  assert.equal(
    await p.getByRole("link", { name: "WhatsApp", exact: true }).count(),
    0,
  );
  await p.getByText("como foi a conversa?", { exact: true }).waitFor();
  await p
    .getByText("a conversa aconteceu?", { exact: false })
    .locator("select")
    .selectOption("sim");
  await p
    .getByText("de 1 a 5, quanto contribuiu para o objetivo profissional?", {
      exact: false,
    })
    .locator("select")
    .selectOption("5");
  await p.getByRole("button", { name: "salvar minha avaliação" }).click();
  await p.getByText("salvo.", { exact: true }).waitFor();
  assert.equal(feedback.utility, 5);
  console.log("PASSOU: contatos autorizados e feedback independente");
  await p.goto(base + "/meu-perfil");
  await p.getByRole("heading", { name: "meu perfil", exact: true }).waitFor();
  assert.equal(
    await p.getByRole("textbox", { name: "e-mail", exact: true }).count(),
    0,
  ); // contatos ficam no details fechado
  await p
    .getByText("contatos privados e disponibilidade", { exact: true })
    .click();
  assert.equal(
    await p.getByRole("textbox", { name: "e-mail", exact: true }).inputValue(),
    "",
  );
  await p
    .getByRole("checkbox", {
      name: "sou mulher cis, trans ou pessoa não binária",
      exact: false,
    })
    .check();
  await p.getByRole("button", { name: "salvar meu perfil" }).click();
  await p
    .getByText("perfil salvo. novos perfis aguardam aprovação da curadoria.")
    .waitFor();
  assert.equal(savedProfile.p.ai_consent, false);
  assert(!savedProfile.c.email);
  console.log(
    "PASSOU: cadastro em página única, sem copiar autenticação e sem consentimento automático de IA",
  );
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
    .getByLabel("nova senha", { exact: true })
    .fill("senha-apenas-do-teste");
  await p
    .getByLabel("confirmar nova senha", { exact: true })
    .fill("senha-apenas-do-teste");
  await p.getByRole("button", { name: "salvar senha", exact: true }).click();
  await p.getByText("senha atualizada.", { exact: true }).waitFor();
  assert.equal(
    await p.evaluate(() => sessionStorage.getItem("aliadas-nova-senha")),
    null,
  );
  console.log(
    "PASSOU: recuperação de senha preservada e integrada ao novo perfil",
  );
  for (const width of [390, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/minhas-conversas", "/meu-perfil"]) {
      await p.goto(base + path);
      await p.getByRole("heading", { level: 1 }).waitFor();
      await p.waitForTimeout(350);
      assert.equal(
        await p.evaluate(() => document.body.scrollWidth > innerWidth),
        false,
        `${path}: overflow em ${width}`,
      );
    }
  }
  assert.deepEqual(errors, []);
  console.log("PASSOU: mobile/desktop sem overflow nem erros JavaScript");
} finally {
  await browser.close();
}
