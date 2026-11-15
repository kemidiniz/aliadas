// Endpoint legado aposentado no MVP. Mantido para que clientes antigos
// não acionem a API paga nem transmitam trajetórias em texto livre.
// O novo fluxo usa conversation_requests e a função conversa-ia.
import { json } from "../_shared/http.ts";
Deno.serve((req) =>
  req.method === "OPTIONS"
    ? new Response("ok")
    : json(
        {
          mensagem:
            "esta versão foi substituída. atualize a página e crie uma solicitação de conversa.",
        },
        410,
      ),
);
