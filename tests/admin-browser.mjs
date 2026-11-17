// UI simulada; as permissões reais são verificadas em admin_test.sql.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
import { existsSync, readFileSync, unlinkSync } from "node:fs";
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
  const TODAS = { ver_visao_geral: true, review_profiles: true, handle_reports: true, ver_feedback: true, ver_ia_automacoes: true };
  const NADA = { ver_visao_geral: false, review_profiles: false, handle_reports: false, ver_feedback: false, ver_ia_automacoes: false };
  const perfis = {
    reviewer: { ...NADA, review_profiles: true },
    reports: { ...NADA, handle_reports: true },
    feedback: { ...NADA, ver_feedback: true },
    principal: TODAS,
  };
  const esperado = {
    reviewer: ["Participantes"],
    reports: ["Denúncias"],
    feedback: ["Avaliações e feedback"],
    principal: ["Visão geral", "Participantes", "Denúncias", "Avaliações e feedback", "IA e automações"],
  };
  for (const kind of Object.keys(perfis)) {
    let access = { principal: kind === "principal", legacy: false, ...perfis[kind] };
    const calls = [];
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(
      ({ uid, project }) =>
        localStorage.setItem(
          `sb-${project}-auth-token`,
          JSON.stringify({
            access_token: "test-local",
            refresh_token: "test-local",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: uid, aud: "authenticated", role: "authenticated", email: "teste@exemplo.invalid", app_metadata: {}, user_metadata: {} },
          }),
        ),
      { uid, project },
    );
    const pessoa = { id: target, name: "Karina Teste", email: "ka***@exemplo.invalid", ...Object.fromEntries(["ver_visao_geral", "avaliar_perfis", "tratar_denuncias", "ver_feedback", "ver_ia_automacoes"].map((k) => [k, false])) };
    await context.route("**/rest/v1/**", async (route) => {
      const req = route.request(),
        endpoint = new URL(req.url()).pathname.split("/").at(-1),
        body = req.postData() ? JSON.parse(req.postData()) : null;
      calls.push({ endpoint, body });
      let data = [];
      if (endpoint === "profiles") data = [{ id: uid, apelido: "Conta de teste", status: "aprovado", areas: [], formas_conexao: [], foto_path: null }];
      if (endpoint === "mvp_admin_access") data = access;
      if (endpoint === "mvp_admin_counts") data = {};
      if (endpoint === "mvp_metrics") data = { active_profiles: 11, available_profiles: 7, pending_invites: 2, conversations_happened: 3, useful_rate: 0.6667, open_reports: 0, feedback_new: 4, unanswered_questions: 1 };
      if (endpoint === "mvp_admin_participants") data = [{ id: target, name: "Karina Teste", status: "pendente", situacao: "trabalho", area_principal: "tecnologia", interesses: ["saude"], can_help: ["carreira"] }];
      if (endpoint === "mvp_feedback_metrics") data = { por_tipo: {avaliacao:4}, nota_media:4, notas:4, conectou: {}, problemas_por_pagina: {}, novos:4, respondidos:0, usabilidade:{clareza_fluxo:{media:5,notas:4,positivas:4},adequacao_ia:{media:4,notas:4,positivas:4,nao_usei:0,sem_sugestoes:0},acompanhar_convites:{media:null,notas:0,positivas:0,nao_cheguei:4}} };
      if (endpoint === "feedback") data=Array.from({length:4},(_,i)=>({id:`feedback-${i}`,created_at:new Date().toISOString(),tipo:"avaliacao",nota_facilidade:4,encontrou_aliadas:"nao",mudaria:"TEXTO_PRIVADO "+"Experiência de teste. ".repeat(30),status:"novo",email:"privado@example.invalid",clareza_fluxo:"5",adequacao_ia:"4",acompanhar_convites:"nao_cheguei"}));
      if (endpoint === "conversation_jobs") data=Array.from({length:4},(_,i)=>({id:`execucao-${i}`,state:"concluida",model:"modelo-local",input_tokens:10,output_tokens:5,objective_attempt:i+1,result_skills:["ux_produto"],created_at:new Date().toISOString()}));
      if (endpoint === "mvp_conversation_metrics") data = { conversations_happened: 3, useful_rate: 0.6667, top_marks: {}, feedback_requests_pending: 1, expired_invites: 0 };
      if (endpoint === "mvp_skill_metrics") data = { first_choice_rate:0.5,ia:2,regra:2,sem_compativel:1,habilidades:[{id:"entrevistas",nome:"Preparação para entrevistas",pedidas:3,oferecidas:1}] };
      if (endpoint === "mvp_ai_metrics") data = { pending_invites:2,pending_by_goal:{entrevista:2}, jobs_month: 0, jobs_failed_month: 0, tokens_month: { input: 0, output: 0 }, requests_without_match: {} };
      if (endpoint === "mvp_admin_ambassadors") data = [{ ...pessoa, id: "10000000-0000-0000-0000-000000000009", name: "Bia Embaixadora", email: "bi***@exemplo.invalid", avaliar_perfis: true, ver_feedback: true }];
      if (endpoint === "mvp_admin_search") data = [pessoa];
      if (endpoint === "mvp_admin_audit") data = Array.from({length:4},(_,i)=>({ id:`auditoria-${i}`, action:"grant", actor_name:"Conta de teste", target_name:"Bia Embaixadora", permissions:{avaliar_perfis:true}, created_at:new Date().toISOString() }));
      if (endpoint === "mvp_salvar_acessos") {Object.assign(pessoa,body);data = null;}
      if (endpoint === "professional_profiles")
        data = [{ profile_id: uid, intentions: ["buscar"], areas: ["saude"], themes: ["carreira"], channels: ["email"], slots: [], ai_consent: false, available: true }];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    });
    const p = await context.newPage();
    p.setDefaultTimeout(8000);
    await p.goto(base + "/painel");
    await p.getByRole("heading", { name: "Painel das embaixadoras", exact: true }).waitFor();
    await p.getByRole("tab").first().waitFor();
    const abas = (await p.getByRole("tab").allInnerTexts()).map((t) => t.replace(/\d+\s*pendentes/, "").trim());
    assert.deepEqual(abas, esperado[kind], `${kind}: abas`);
    assert(await p.getByRole("link", { name: "Painel" }).count() >= 1, "quem tem atribuição vê o Painel");
    if (kind === "reviewer") {
      await p.getByRole("heading",{name:"Participantes",exact:true}).waitFor();
      assert.equal(calls.filter(c=>c.endpoint==="mvp_admin_participants").length,0,"sem listar todas ao abrir");
      await p.getByRole("textbox",{name:"Buscar participante"}).fill("ka");
      await p.getByRole("button",{name:"Buscar",exact:true}).click();
      await p.getByText("O cadastro já libera a busca.",{exact:false}).waitFor();
      assert.equal(await p.getByRole("button",{name:"Aprovar",exact:true}).count(),0);
      const confirmacao = async d => d.accept();
      p.once("dialog",confirmacao);
      await p.getByRole("button",{name:"Pausar conta",exact:true}).click();
      await p.waitForTimeout(200);
      assert(calls.some(c=>c.endpoint==="mvp_admin_set_active" && c.body.active===false));
    }
    if (kind === "principal") {
      assert.equal(await p.getByRole("tab", { name: "Visão geral" }).getAttribute("aria-selected"), "true", "Visão geral é a primeira aba");
      const cards = p.getByRole("list", { name: "Indicadores da comunidade" }).getByRole("listitem");
      assert.equal(await cards.count(), 6, "visão geral tem só 6 cards");
      await p.getByText("66,7%").waitFor();
      const x0 = (await p.getByRole("heading", { level: 1 }).boundingBox()).x;
      await p.getByRole("heading", { name: "Para fazer hoje" }).waitFor();
      assert.equal(await p.getByRole("heading", { name: "Onde falta gente" }).count(),0);
      const { mkdir }=await import("node:fs/promises");
      await mkdir(`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "B4"}`,{recursive:true});
      for(const width of [390,1440]) { await p.setViewportSize({width,height:1000});await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(200);await p.screenshot({path:`/workspace/aliadas-review/${process.env.REVIEW_STAGE || "B4"}/painel-${width}.png`,fullPage:true}); }
      await p.getByRole("button", { name: /Convites esperando resposta/ }).click();
      assert.equal(await p.getByRole("tab", { name: /IA e automações/ }).getAttribute("aria-selected"),"true","convites levam à aba com o detalhamento");
      await p.getByRole("heading", { name: "Convites esperando resposta",exact:true }).waitFor();
      await p.getByRole("tab", { name: "Visão geral" }).click();
      await p.getByRole("button", { name: /Participantes ativas/ }).click();
      assert.equal(await p.getByRole("tab", { name: /Participantes/ }).getAttribute("aria-selected"), "true", "card leva à aba de detalhe");
      await p.getByRole("tab", { name: /Avaliações e feedback/ }).click();
      await p.getByRole("heading", { name: "Feedback do site" }).waitFor();
      await p.getByRole("heading", { name: "Avaliação das conversas" }).waitFor();
      await p.getByRole("heading",{name:"Usabilidade e percepção da IA",exact:true}).waitFor();
      assert.equal(await p.getByText(/^TEXTO_PRIVADO/).count(),3,"só três respostas abertas inicialmente");
      await p.getByRole("button",{name:"Ler resposta completa",exact:true}).first().click();
      assert(await p.getByRole("button",{name:"Recolher resposta",exact:true}).first().isVisible());
      await p.getByRole("button",{name:"+ Ver mais",exact:true}).click();
      assert.equal(await p.getByText(/^TEXTO_PRIVADO/).count(),4);
      await p.getByRole("button",{name:"Mostrar menos",exact:true}).click();
      const download=p.waitForEvent("download");await p.getByRole("button",{name:"Exportar medidas (CSV)",exact:true}).click();
      const csv=await download;const file=await csv.path();const exported=readFileSync(file,"utf8");
      assert(exported.includes("feedback-3"),"exporta os quatro registros mesmo com só três visíveis");
      assert(exported.includes("adequacao_da_IA")&&!exported.includes("TEXTO_PRIVADO")&&!exported.includes("privado@example.invalid"),"medidas sem texto aberto ou contato privado");
      unlinkSync(file);

      await p.getByRole("tab", { name: /IA e automações/ }).click();
      await p.getByRole("heading", { name: "Convites esperando resposta", exact: true }).waitFor();
      await p.getByRole("heading", { name: "Provas para a banca" }).waitFor();
      assert.equal(await p.locator('[aria-labelledby="provas-banca"] button').count(), 3);
      assert.equal(await p.getByRole("heading", { name: "Onde falta gente" }).count(),0);
      await p.getByRole("button", { name: "Exportar execuções (CSV)" }).waitFor();
      assert.equal(await p.getByText(/modelo-local/).count(),3,"três execuções inicialmente");
      await p.getByRole("button",{name:"+ Ver mais",exact:true}).click();
      assert.equal(await p.getByText(/modelo-local/).count(),4);
      await p.getByRole("button",{name:"Mostrar menos",exact:true}).click();

      const x1 = (await p.getByRole("heading", { level: 1 }).boundingBox()).x;
      assert.equal(x0, x1, "a tela não se mexe ao trocar de aba");
      await p.getByRole("tab", { name: "Participantes", exact:true }).click();
      await p.getByRole("heading",{name:"Participantes e acessos",exact:true}).waitFor();
      assert.equal(await p.getByRole("button",{name:"Gerenciar acessos",exact:true}).count(),0,"nenhuma pessoa listada antes da busca");
      assert.equal(calls.filter(c=>c.endpoint==="mvp_admin_ambassadors").length,0,"sem carregar a lista crescente de embaixadoras");
      assert.equal(await p.getByText("Auditoria de concessões e revogações").count(),1);
      const audit=p.locator("details").filter({hasText:"Auditoria de concessões e revogações"});
      await audit.locator("summary").click();assert.equal(await audit.getByRole("listitem").count(),3);
      await audit.getByRole("button",{name:"+ Ver mais",exact:true}).click();assert.equal(await audit.getByRole("listitem").count(),4);
      await audit.getByRole("button",{name:"Mostrar menos",exact:true}).click();await audit.locator("summary").click();

      await p.getByRole("textbox", { name: "Buscar pessoa por nome ou e-mail" }).fill("ka");
      await p.getByRole("button", { name: "Buscar", exact: true }).click();
      await p.getByText("ka***@exemplo.invalid").waitFor();
      assert.equal(calls.filter((c) => c.endpoint === "mvp_admin_search").at(-1).body.q, "ka");
      assert.equal(await p.getByText(target).count(), 0, "ID longo só em Ver ID");
      await p.getByRole("button", { name: "Ver ID" }).click();
      await p.getByText(target).waitFor();
      await p.getByRole("button", { name: "Gerenciar acessos" }).click();
      const regiao = p.getByRole("region", { name: "Acessos de Karina Teste" });
      for (const k of ["Visão geral", "Gerenciar contas", "Tratar denúncias", "Ver feedback", "Ver IA e automações"])
        await regiao.getByRole("checkbox", { name: k }).waitFor();
      await regiao.getByRole("checkbox", { name: "Gerenciar contas" }).check();
      await regiao.getByRole("checkbox", { name: "Ver feedback" }).check();
      await regiao.getByRole("button", { name: "Salvar acessos" }).click();
      await p.getByText("Acessos salvos e registrados na auditoria.").waitFor();
      const salvo = calls.filter((c) => c.endpoint === "mvp_salvar_acessos");
      assert.equal(salvo.length, 1);
      assert.deepEqual(salvo[0].body, { target, ver_visao_geral: false, avaliar_perfis: true, tratar_denuncias: false, ver_feedback: true, ver_ia_automacoes: false });
      await p.getByRole("textbox",{name:"Buscar pessoa por nome ou e-mail"}).fill("ka");
      await p.getByRole("button",{name:"Buscar",exact:true}).click();
      await p.getByRole("button",{name:"Gerenciar acessos",exact:true}).click();
      await p.getByRole("region",{name:"Acessos de Karina Teste"}).getByRole("checkbox",{name:"Ver feedback"}).isChecked().then(v=>assert(v,"reabrir usa permissões salvas"));
      console.log("PASSOU: principal tem 5 abas; Participantes e acessos usa um buscador e mantém cinco permissões, e-mail mascarado e auditoria");
    } else {
      access = { principal: false, legacy: false, ...NADA };
      await p.evaluate(() => window.dispatchEvent(new Event("focus")));
      await p.waitForURL(base + "/");
      assert.equal(await p.locator('a[href="/painel"]').count(), 0);
      console.log(`PASSOU: ${kind} vê só a aba da sua permissão e perde o acesso na atualização após revogação`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
