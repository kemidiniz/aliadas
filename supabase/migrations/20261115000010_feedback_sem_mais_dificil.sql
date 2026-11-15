-- Remove a obrigatoriedade da pergunta retirada do formulário.
-- Mantém respostas antigas e todas as políticas e permissões existentes.
alter table public.feedback drop constraint feedback_campos_por_tipo;
alter table public.feedback add constraint feedback_campos_por_tipo check (
  (tipo = 'avaliacao' and nota_facilidade is not null and encontrou_aliadas is not null)
  or (tipo = 'indicacao' and indicacao_nome is not null and indicacao_link is not null
      and indicacao_motivo is not null and indicacao_gratuito is not null)
  or (tipo = 'problema' and problema_descricao is not null and problema_pagina is not null)
);
