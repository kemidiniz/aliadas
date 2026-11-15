import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { segredoConfere } from "../_shared/http.ts";
import {
  minimized,
  SYSTEM,
  RESPONSE_SCHEMA,
  validateOutput,
  usageCounts,
  providerError,
} from "./core.ts";
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const response = (status: number, code: string) =>
  Response.json({ code }, { status });
Deno.serve({ port: Number(Deno.env.get("PORT") || 8000) }, async (req) => {
  if (req.method !== "POST") return response(405, "metodo");
  const supplied = req.headers.get("x-mvp-secret");
  if (!supplied || !/^[a-f0-9]{64}$/i.test(supplied))
    return response(401, "nao_autorizado");
  const { data: secret, error: secretError } =
    await db.rpc("mvp_worker_secret");
  if (secretError || !secret || !segredoConfere(supplied, secret))
    return response(401, "nao_autorizado");
  let id: string;
  try {
    const body = await req.json();
    id = body.request_id;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw Error();
  } catch {
    return response(400, "pedido_invalido");
  }
  const { data: job, error } = await db.rpc("mvp_claim_job", { request: id });
  if (error) return response(503, "banco_indisponivel");
  if (!job) return response(200, "ja_processada_ou_sem_consentimento");
  let result = null,
    code: string | null = null,
    input = 0,
    output = 0;
  const model = Deno.env.get("GEMINI_MODEL") || "";
  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    // Sem confirmação explícita, ZERO requisições externas. Nunca ativa faturamento.
    if (Deno.env.get("GEMINI_FREE_TIER_CONFIRMED") !== "true" || !key || !model)
      throw Error("ia_nao_configurada");
    if (!/^[a-z0-9.-]{3,80}$/.test(model)) throw Error("modelo_invalido");
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [
            { role: "user", parts: [{ text: JSON.stringify(minimized(job)) }] },
          ],
          generationConfig: {
            maxOutputTokens: 700,
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );
    if (!resp.ok) throw Error(providerError(resp.status));
    const body = await resp.json();
    const usage = usageCounts(body.usageMetadata);
    input = usage.input;
    output = usage.output;
    if (body.candidates?.[0]?.finishReason === "MAX_TOKENS")
      throw Error("saida_truncada");
    if (
      body.promptFeedback?.blockReason ||
      body.candidates?.[0]?.finishReason === "SAFETY"
    )
      throw Error("bloqueado_provedor");
    const raw = body.candidates?.[0]?.content?.parts
      ?.filter((p: { thought?: boolean }) => !p.thought)
      .map((p: { text?: string }) => p.text || "")
      .join("");
    if (!raw || raw.length > 4000) throw Error("saida_invalida");
    result = validateOutput(JSON.parse(raw));
  } catch (e) {
    const allowed = [
      "ia_nao_configurada",
      "modelo_invalido",
      "limite_provedor",
      "acesso_provedor",
      "falha_provedor",
      "modelo_indisponivel",
      "configuracao_provedor",
      "saida_truncada",
      "bloqueado_provedor",
      "saida_invalida",
      "categorias_invalidas",
    ];
    code =
      e instanceof SyntaxError
        ? "saida_invalida"
        : e instanceof Error && allowed.includes(e.message)
          ? e.message
          : "falha_ia";
  }
  const { error: saveError } = await db.rpc("mvp_finish_job", {
    job: job.job_id,
    result,
    model: model || "nao_configurado",
    input_tokens: input,
    output_tokens: output,
    error_code: code,
  });
  // Não registra corpo bruto de exceções/respostas, nomes ou textos profissionais.
  return response(
    saveError ? 503 : 200,
    saveError ? "registro_indisponivel" : code || "concluida",
  );
});
