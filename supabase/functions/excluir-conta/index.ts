// Edge Function "excluir-conta"
// Apaga foto(s) do Storage e depois o usuário do Auth. O banco apaga em
// cascata: perfil, consentimentos, contatos, conexões, recomendações e
// denúncias recebidas; o registro da IA é anonimizado (gatilho no banco).
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { cors, json } from "../_shared/http.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ erro: "não autorizado" }, 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ erro: "não autorizado" }, 401);
  const uid = data.user.id;

  try {
    // 1. fotos (tudo dentro da pasta da usuária)
    const { data: arquivos } = await admin.storage.from("fotos").list(uid, { limit: 100 });
    if (arquivos && arquivos.length > 0) {
      const { error: errFoto } = await admin.storage
        .from("fotos")
        .remove(arquivos.map((a) => `${uid}/${a.name}`));
      if (errFoto) throw errFoto;
    }
    // 2. usuária (o resto sai em cascata)
    const { error: errUser } = await admin.auth.admin.deleteUser(uid);
    if (errUser) throw errUser;
    return json({ ok: true });
  } catch (e) {
    console.error("excluir-conta falhou", e instanceof Error ? e.message : e);
    return json({ erro: "não conseguimos excluir agora. tente de novo em alguns minutos." }, 500);
  }
});
