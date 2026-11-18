// Textos fixos: o e-mail não inclui nome, contato ou mensagem das participantes.
export type EventoEmail = "convite" | "aceite";
const link = "https://aliadas-indol.vercel.app/minhas-aliancas";
const preferencias = "https://aliadas-indol.vercel.app/meu-perfil#privacidade";
export function mensagemDoEvento(evento: EventoEmail) {
 const aceito = evento === "aceite";
 const subject = aceito ? "Seu convite de aliança foi aceito" : "Você recebeu um novo convite de aliança";
 const abertura = aceito ? "Agora vocês podem combinar a conversa. Entre na aliadas para ver os contatos que cada uma autorizou compartilhar." : "Abra a aliadas para conhecer o convite e decidir se quer aceitar.";
 const botao = aceito ? "Acompanhar aliança" : "Ver convite";
 const privacidade = aceito ? "Os contatos ficam disponíveis no site, conforme as permissões de cada participante." : "Seus contatos só são liberados após o aceite mútuo.";
 const text = `${subject}.\n\n${abertura}\n${link}\n\n${privacidade}\n\nPara desativar estes avisos: Meu perfil › Privacidade.\n${preferencias}\n\nTodas nós temos algo a ensinar e muito a aprender.`;
 const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body style="margin:0;background:#FBF8F3;font-family:Arial,sans-serif;color:#2A1A20"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 20px"><table role="presentation" width="100%" style="max-width:560px"><tr><td><p style="font-size:28px;font-weight:bold;color:#6B1E3A">aliadas</p><h1 style="font-size:26px;line-height:1.3;color:#6B1E3A">${subject}.</h1><p style="line-height:1.7">${abertura}</p><p style="margin:32px 0"><a href="${link}" style="display:inline-block;padding:16px 24px;background:#6B1E3A;color:#FBF8F3;border-radius:12px;text-decoration:none;font-weight:bold">${botao}</a></p><p style="font-size:14px;line-height:1.7">${privacidade}</p><p style="margin-top:32px;font-size:14px;line-height:1.7">Para desativar estes avisos, acesse <a href="${preferencias}" style="color:#6B1E3A">Meu perfil › Privacidade</a>.</p><p style="font-size:14px;line-height:1.7">Todas nós temos algo a ensinar e muito a aprender.</p></td></tr></table></td></tr></table></body></html>`;
 return {subject,text,html};
}
// Compatibilidade com prévias/testes do aviso original.
const novo = mensagemDoEvento("convite");
export const assunto = novo.subject, texto = novo.text, html = novo.html;
export function codigoErroSMTP(erro: unknown): string {
 const code = (erro as {code?:string})?.code;
 return code === "EAUTH" ? "configuracao_email" : code === "ETIMEDOUT" ? "tempo_esgotado" : code === "EENVELOPE" ? "destinataria_indisponivel" : "falha_smtp";
}
