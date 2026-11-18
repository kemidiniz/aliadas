import test from 'node:test';
import assert from 'node:assert/strict';
import {assunto,texto,html,codigoErroSMTP,mensagemDoEvento} from '../supabase/functions/aviso-convite/core.ts';
test('aviso é fixo, leva ao site e permite desativar sem dados de participante',()=>{
 assert.match(assunto,/convite de aliança/);assert.match(html,/minhas-aliancas/);assert.match(html,/meu-perfil#privacidade/);
 assert.match(texto,/após o aceite mútuo/);assert(!/\{\{|recipient|sender|\$\{(?!link)/.test(html));
 assert(!/gemini|generativelanguage|anthropic/i.test(html+texto));
});
test('aceite tem mensagem própria, sem dados pessoais, com acesso aos canais só no site',()=>{
 const m=mensagemDoEvento('aceite');
 assert.equal(m.subject,'Seu convite de aliança foi aceito');assert.match(m.text,/cada uma autorizou compartilhar/);
 assert.match(m.html,/Acompanhar aliança/);assert.match(m.html,/minhas-aliancas/);assert.match(m.html,/meu-perfil#privacidade/);
 assert(!/mailto:|wa.me|linkedin.com|\{\{|recipient|sender/.test(m.html+m.text));
 assert.notEqual(m.text,mensagemDoEvento('convite').text);
});
test('falhas de SMTP viram códigos fechados, sem conteúdo de exceção',()=>{
 for(const [code,expected] of [['EAUTH','configuracao_email'],['ETIMEDOUT','tempo_esgotado'],['EENVELOPE','destinataria_indisponivel'],['qualquercoisa','falha_smtp']])assert.equal(codigoErroSMTP({code,message:'destino-privado@example.invalid senha-secreta'}),expected);
 assert.equal(codigoErroSMTP(null),'falha_smtp');
});
