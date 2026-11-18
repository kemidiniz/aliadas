-- 045 · Participação voluntária; as quatro primeiras respostas são exigidas ao enviar.
-- Respostas históricas permanecem intactas e podem continuar sendo tratadas no painel.
alter table public.feedback add column avaliacao_versao smallint not null default 1 check(avaliacao_versao in (1,2));
alter table public.feedback alter column avaliacao_versao set default 2;

-- A pergunta sobre ter se conectado passa a ser opcional. Demais caminhos preservados.
alter table public.feedback drop constraint feedback_campos_por_tipo;
alter table public.feedback add constraint feedback_campos_por_tipo check (
 (tipo='avaliacao' and nota_facilidade is not null)
 or (tipo='indicacao' and indicacao_nome is not null and indicacao_link is not null and indicacao_motivo is not null and indicacao_gratuito is not null)
 or (tipo='problema' and problema_descricao is not null and problema_pagina is not null)
 or (tipo='duvida' and mensagem is not null and email is not null)
);
alter table public.feedback add constraint feedback_avaliacao_quatro_perguntas check (
 tipo<>'avaliacao' or avaliacao_versao=1 or
 (nota_facilidade is not null and clareza_fluxo is not null and adequacao_ia is not null and acompanhar_convites is not null)
);
-- O navegador não pode escolher a versão antiga nem alterar/backdatear avaliações.
revoke insert(avaliacao_versao),update(avaliacao_versao) on public.feedback from anon,authenticated;
