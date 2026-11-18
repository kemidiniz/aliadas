import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackAvaliacao,feedbackDuvida,feedbackProblema} from '../src/lib/esquemas.ts';
const completa={tipo:'avaliacao',nota_facilidade:4,clareza_fluxo:'5',adequacao_ia:'nao_usei',acompanhar_convites:'nao_cheguei',encontrou_aliadas:'',mudaria:'',email:''};
test('não envia avaliação sem qualquer uma das quatro primeiras respostas',()=>{
 for(const campo of ['nota_facilidade','clareza_fluxo','adequacao_ia','acompanhar_convites']){
  const dados={...completa};delete dados[campo];const r=feedbackAvaliacao.safeParse(dados);
  assert(!r.success,campo);assert(r.error.issues.some(e=>e.path[0]===campo),campo);
 }
 for(const campo of ['clareza_fluxo','adequacao_ia','acompanhar_convites'])assert(!feedbackAvaliacao.safeParse({...completa,[campo]:''}).success,campo);
});
test('aceita não uso da IA e dos convites, sem obrigar respostas posteriores',()=>{
 assert(feedbackAvaliacao.safeParse(completa).success);
 assert(feedbackAvaliacao.safeParse({...completa,adequacao_ia:'sem_sugestoes',encontrou_aliadas:undefined}).success);
 assert(!feedbackAvaliacao.safeParse({...completa,clareza_fluxo:'0'}).success);
 assert(!feedbackAvaliacao.safeParse({...completa,adequacao_ia:'inventada'}).success);
});
test('dúvida e relato de problema continuam independentes da avaliação',()=>{
 assert(feedbackDuvida.safeParse({tipo:'duvida',mensagem:'Como funciona?',email:'teste@example.invalid'}).success);
 assert(feedbackProblema.safeParse({tipo:'problema',problema_descricao:'Algo não abriu',problema_pagina:'Alianças',email:''}).success);
});
