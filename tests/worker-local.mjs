// Exercita a Edge Function real com banco HTTP local simulado e rede externa proibida.
// Não é teste de provedor generativo nem evidência de automação real em produção.
import http from "node:http";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const secret = "a".repeat(64);
let claimed = false,
  finished = null;
const paths = [];
const server = http.createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const path = req.url.split("/").at(-1);
  paths.push(path);
  let body;
  if (path === "mvp_worker_secret") body = secret;
  else if (path === "mvp_claim_job") {
    body = claimed
      ? null
      : {
          job_id: "10000000-0000-0000-0000-000000000001",
          goal: "carreira",
          a: { areas: ["saude"], moment: "inicio", themes: ["carreira"] },
          b: { areas: ["saude"], moment: "experiente", themes: ["carreira"] },
        };
    claimed = true;
  } else if (path === "mvp_finish_job") {
    finished = JSON.parse(raw);
    body = null;
  } else {
    res.writeHead(500);
    res.end();
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const backendPort = server.address().port;
const port = 5179;
let output = "";
const child = spawn(
  "npm",
  [
    "exec",
    "--cache",
    "/workspace/.npm",
    "--yes",
    "--package=deno",
    "--",
    "deno",
    "run",
    "--no-lock",
    `--allow-net=127.0.0.1:${backendPort},127.0.0.1:${port},0.0.0.0:${port}`,
    "--allow-env",
    "supabase/functions/conversa-ia/index.ts",
  ],
  {
    env: {
      ...process.env,
      DENO_DIR: "/workspace/.deno-mvp",
      SUPABASE_URL: `http://127.0.0.1:${backendPort}`,
      SUPABASE_SERVICE_ROLE_KEY: "chave-de-teste-local",
      PORT: String(port),
      GEMINI_FREE_TIER_CONFIRMED: "false",
      GEMINI_API_KEY: "",
      GEMINI_MODEL: "",
    },
    detached: true,
  },
);
child.stdout.on("data", (d) => (output += d));
child.stderr.on("data", (d) => (output += d));
try {
  let started = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}`, { method: "POST" });
      if (r.status === 401) {
        started = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  assert(started, "worker não iniciou: " + output.slice(-1000));
  assert.equal(paths.length, 0, "sem cabeçalho não consulta nem o banco");
  const response = await fetch(`http://127.0.0.1:${port}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mvp-secret": secret },
    body: JSON.stringify({
      request_id: "20000000-0000-0000-0000-000000000001",
    }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).code, "ia_nao_configurada");
  assert.equal(finished.error_code, "ia_nao_configurada");
  assert.equal(finished.result, null);
  assert.equal(finished.input_tokens, 0);
  assert.equal(finished.output_tokens, 0);
  const again = await fetch(`http://127.0.0.1:${port}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mvp-secret": secret },
    body: JSON.stringify({
      request_id: "20000000-0000-0000-0000-000000000001",
    }),
  });
  assert.equal((await again.json()).code, "ja_processada_ou_sem_consentimento");
  console.log(
    "PASSOU: autenticação interna, configuração gratuita ausente, zero tokens e replay sem nova geração; rede externa proibida.",
  );
} finally {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
  await new Promise((r) => server.close(r));
}
