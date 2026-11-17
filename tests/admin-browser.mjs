// UI simulada; as permissões reais são verificadas em admin_test.sql.
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
const project = new URL(
  process.env.VITE_SUPABASE_URL || "http://localhost",
).hostname.split(".")[0];
const uid = "10000000-0000-0000-0000-000000000001",
  target = "10000000-0000-0000-0000-000000000002";
const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumPath(),
  args: ["--no-sandbox"],
});
try {
  for (const kind of ["reviewer", "reports", "principal"]) {
    let access = {
      principal: kind === "principal",
      legacy: false,
      review_profiles: kind !== "reports",
      handle_reports: kind !== "reviewer",
    };
    let ambassador = false;
    const calls = [];
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(
      ({ uid, project }) =>
        localStorage.setItem(
          `sb-${project}-auth-token`,
          JSON.stringify({
            access_token: "test-local",
            refresh_token: "test-local",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: {
              id: uid,
              aud: "authenticated",
              role: "authenticated",
              email: "teste@exemplo.invalid",
              app_metadata: {},
              user_metadata: {},
            },
          }),
        ),
      { uid, project },
    );
    await context.route("**/rest/v1/**", async (route) => {
      const req = route.request(),
        endpoint = new URL(req.url()).pathname.split("/").at(-1),
        body = req.postData() ? JSON.parse(req.postData()) : null;
      calls.push({ endpoint, body });
      let data = [];
      if (endpoint === "profiles")
        data = [
          {
            id: uid,
            apelido: "Conta de teste",
            status: "aprovado",
            areas: [],
            formas_conexao: [],
            foto_path: null,
          },
        ];
      if (endpoint === "mvp_admin_access") data = access;
      if (endpoint === "mvp_admin_members")
        data = [
          {
            id: target,
            name: "Participante de teste",
            ambassador,
            review_profiles: true,
            handle_reports: false,
          },
        ];
      if (endpoint === "mvp_manage_ambassador") {
        ambassador = body.enabled;
        data = null;
      }
      if (endpoint === "professional_profiles")
        data = [
          {
            profile_id: uid,
            intentions: ["buscar"],
            areas: ["saude"],
            themes: ["carreira"],
            channels: ["email"],
            slots: [],
            ai_consent: false,
            available: true,
          },
        ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    const p = await context.newPage();
    p.setDefaultTimeout(8000);
    await p.goto(base + "/curadoria");
    await p
      .getByRole("heading", { name: "Administração", exact: true })
      .waitFor();
    assert.equal(
      await p.getByRole("tab", { name: "Embaixadoras", exact: true }).count(),
      kind === "principal" ? 1 : 0,
    );
    assert.equal(
      await p.getByRole("tab", { name: "Perfis", exact: true }).count(),
      kind === "reports" ? 0 : 1,
    );
    assert.equal(
      await p.getByRole("tab", { name: "Denúncias", exact: true }).count(),
      kind === "reviewer" ? 0 : 1,
    );
    assert.equal(
      await p.getByRole("tab", { name: "Painel", exact: true }).count(),
      kind === "principal" ? 1 : 0,
    );
    if (kind === "principal")
      assert.equal(
        await p.getByRole("tab", { name: "Painel", exact: true }).getAttribute("aria-selected"),
        "true",
        "Painel é a primeira aba",
      );
    if (kind === "principal") {
      await p.getByRole("tab", { name: "Embaixadoras", exact: true }).click();
      await p.getByText("Participante de teste", { exact: true }).waitFor();
      await p.getByText("Revisar autorização", { exact: true }).click();
      assert(!calls.some((x) => x.endpoint === "mvp_manage_ambassador"));
      await p
        .getByRole("button", { name: "Conceder papel de embaixadora" })
        .click();
      await p
        .getByRole("button", { name: "Revogar acesso de embaixadora" })
        .waitFor();
      await p
        .getByRole("button", { name: "Revogar acesso de embaixadora" })
        .click();
      await p
        .getByRole("button", { name: "Conceder papel de embaixadora" })
        .waitFor();
      const managed = calls.filter(
        (x) => x.endpoint === "mvp_manage_ambassador",
      );
      assert.equal(managed.length, 2);
      assert.equal(managed[0].body.target, target);
      assert.equal(managed[0].body.enabled, true);
      assert.equal(managed[1].body.enabled, false);
      console.log(
        "PASSOU: administradora concede e revoga por ID após confirmação explícita da ação",
      );
    } else {
      access = {
        principal: false,
        legacy: false,
        review_profiles: false,
        handle_reports: false,
      };
      await p.evaluate(() => window.dispatchEvent(new Event("focus")));
      await p.waitForURL(base + "/");
      assert.equal(await p.locator('a[href="/curadoria"]').count(), 0);
      console.log(
        `PASSOU: ${kind} vê só sua atribuição e perde acesso na atualização após revogação`,
      );
    }
    await context.close();
  }
} finally {
  await browser.close();
}
