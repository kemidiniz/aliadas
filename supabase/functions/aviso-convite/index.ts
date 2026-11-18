import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import nodemailer from "npm:nodemailer@10.6.0";
import { segredoConfere } from "../_shared/http.ts";
import { assunto, texto, html, codigoErroSMTP } from "./core.ts";
const db = createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const resposta = (code: string, status = 200) => Response.json({code},{status});
Deno.serve(async req => {
 if (req.method !== "POST") return resposta("metodo",405);
 const supplied = req.headers.get("x-mvp-secret");
 if (!supplied || !/^[a-f0-9]{64}$/i.test(supplied)) return resposta("nao_autorizado",401);
 const {data:secret,error:secretError} = await db.rpc("mvp_worker_secret");
 if (secretError || !segredoConfere(supplied,secret)) return resposta("nao_autorizado",401);
 let invite: string;
 try { const b = await req.json();invite = b.invite_id;if(typeof invite !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invite))throw Error(); }
 catch {return resposta("pedido_invalido",400);}
 const {data:job,error} = await db.rpc("mvp_claim_invite_email",{invite});
 if(error)return resposta("banco_indisponivel",503);
 if(!job)return resposta("ja_processado_ou_indisponivel");
 let code: string | null = null;
 try {
  const host = Deno.env.get("ALIADAS_SMTP_HOST"), user = Deno.env.get("ALIADAS_SMTP_USER"), pass = Deno.env.get("ALIADAS_SMTP_PASSWORD"), from = Deno.env.get("ALIADAS_SMTP_FROM");
  if(!host || !user || !pass || !from || Deno.env.get("ALIADAS_SMTP_PORT") !== "465")throw Object.assign(Error(),{code:"EAUTH"});
  const smtp = nodemailer.createTransport({host,port:465,secure:true,auth:{user,pass:host === "smtp.gmail.com" ? pass.replace(/\s/g,"") : pass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000,tls:{minVersion:"TLSv1.2"},logger:false,debug:false});
  const info = await smtp.sendMail({from:{name:"Aliadas",address:from},to:job.email,subject:assunto,text:texto,html,messageId:`<aliadas-convite-${invite}@${from.split("@").at(-1)}>`,disableFileAccess:true,disableUrlAccess:true});
  if(info.accepted.length !== 1)throw Object.assign(Error(),{code:"EENVELOPE"});
 } catch(erro) {code = codigoErroSMTP(erro);}
 const {error:saveError} = await db.rpc("mvp_finish_invite_email",{invite,ok:!code,error_code:code});
 // Não escreve destinatária, credenciais nem resposta bruta de SMTP nos logs.
 return resposta(saveError ? "registro_indisponivel" : code || "enviado",saveError ? 503 : 200);
});
