import test from 'node:test';
import assert from 'node:assert/strict';
import {assunto,texto,html,codigoErroSMTP} from '../supabase/functions/aviso-convite/core.ts';
test('aviso é fixo, leva ao site e permite desativar sem dados de participante',()=>{
 assert.match(assunto,/convite de aliança/);assert.match(html,/minhas-aliancas/);assert.match(html,/meu-perfil#privacidade/);
 assert.match(texto,/após o aceite mútuo/);assert(!/\{\{|recipient|sender|\$\{(?!link)/.test(html));
 assert(!/gemini|generativelanguage|anthropic/i.test(html+texto));
});
test('falhas de SMTP viram códigos fechados, sem conteúdo de exceção',()=>{
 for(const [code,expected] of [['EAUTH','configuracao_email'],['ETIMEDOUT','tempo_esgotado'],['EENVELOPE','destinataria_indisponivel'],['qualquercoisa','falha_smtp']])assert.equal(codigoErroSMTP({code,message:'destino-privado@example.invalid senha-secreta'}),expected);
 assert.equal(codigoErroSMTP(null),'falha_smtp');
});
