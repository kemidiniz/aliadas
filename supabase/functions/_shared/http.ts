// Utilidades HTTP compartilhadas pelas Edge Functions.

// Em produção, defina SITE_URL (ex.: https://aliadas.vercel.app) para
// aceitar chamadas do navegador só do seu site.
const origem = Deno.env.get("SITE_URL") ?? "*";

export const cors = {
  "Access-Control-Allow-Origin": origem,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

export function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// comparação em tempo constante (não vaza o segredo por tempo de resposta)
export function segredoConfere(recebido: string | null, esperado: string | undefined): boolean {
  if (!recebido || !esperado) return false;
  const a = new TextEncoder().encode(recebido);
  const b = new TextEncoder().encode(esperado);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
