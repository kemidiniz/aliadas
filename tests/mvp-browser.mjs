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
const ci = (value) =>
  new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
let jobState = "sem_ia";
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
    .getByRole("heading", {
      name: ci("uma conversa pode abrir novos caminhos."),
    })
    .waitFor();
  assert.equal(
    await g
      .getByRole("navigation", { name: ci("principal") })
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
  await p.getByRole("heading", { name: ci("encontre uma aliada") }).waitFor();
  await p
    .getByRole("button", { name: ci("encontrar uma aliada"), exact: true })
    .click();
  await p.getByText(ci("aliada de teste"), { exact: true }).waitFor();
  await p
    .getByText(ci("compatibilidade básica • sem IA generativa"), {
      exact: true,
    })
    .waitFor();
  assert(!calls.some((x) => x.endpoint === "mvp_invite"));
  console.log(
    "PASSOU: solicitação mostra uma sugestão e não convida automaticamente",
  );
  await p
    .getByRole("textbox", { name: ci("sua mensagem inicial") })
    .fill("minha mensagem revisada de teste");
  jobState = "executando";
  await p.getByRole("button", { name: /atualizar resultado/i }).click();
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
  await p.getByText("Sugestão pronta", { exact: true }).waitFor();
  await p.getByText("Pergunta de teste um?", { exact: true }).waitFor();
  assert.equal(
    await p
      .getByRole("textbox", { name: /sua mensagem inicial/i })
      .inputValue(),
    "minha mensagem revisada de teste",
  );
  console.log(
    "PASSOU: atualização assíncrona mostra resultado e preserva rascunho editado (API simulada)",
  );
  await p.getByRole("button", { name: ci("aprovar e enviar convite") }).click();
  await p
    .getByText(ci("convite enviado. acompanhe o aceite em minhas conversas."))
    .waitFor();
  assert.equal(
    calls.find((x) => x.endpoint === "mvp_invite").body.message,
    "minha mensagem revisada de teste",
  );
  await p.goto(base + "/minhas-conversas");
  await p.getByRole("link", { name: ci("e-mail"), exact: true }).waitFor();
  assert.equal(
    await p.getByRole("link", { name: ci("WhatsApp"), exact: true }).count(),
    0,
  );
  await p.getByText(ci("como foi a conversa?"), { exact: true }).waitFor();
  await p
    .getByText(ci("a conversa aconteceu?"), { exact: false })
    .locator("select")
    .selectOption("sim");
  await p
    .getByText(
      ci("de 1 a 5, quanto contribuiu para o objetivo profissional?"),
      {
        exact: false,
      },
    )
    .locator("select")
    .selectOption("5");
  await p.getByRole("button", { name: ci("salvar minha avaliação") }).click();
  await p.getByText(ci("salvo."), { exact: true }).waitFor();
  assert.equal(feedback.utility, 5);
  console.log("PASSOU: contatos autorizados e feedback independente");
  await p.goto(base + "/meu-perfil");
  await p
    .getByRole("heading", { name: ci("meu perfil"), exact: true })
    .waitFor();
  assert.equal(
    await p.getByRole("textbox", { name: ci("e-mail"), exact: true }).count(),
    0,
  ); // contatos ficam no details fechado
  await p.getByText(ci("Contatos privados"), { exact: true }).click();
  assert.equal(
    await p
      .getByRole("textbox", { name: ci("e-mail"), exact: true })
      .inputValue(),
    "",
  );
  await p
    .getByRole("checkbox", {
      name: ci("sou mulher cis, trans ou pessoa não binária"),
      exact: false,
    })
    .check();
  await p.getByRole("button", { name: ci("salvar meu perfil") }).click();
  await p
    .getByText(
      ci("perfil salvo. novos perfis aguardam aprovação da curadoria."),
    )
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
  for (const width of [375, 390, 768, 1440])
    for (const theme of ["light", "dark"]) {
      await p.emulateMedia({ colorScheme: theme });
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
  jobState = "executando";
  requests = [{ ...request }];
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
