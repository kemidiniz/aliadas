-- NÃO EXECUTAR EM PRODUÇÃO SEM AUTORIZAÇÃO EXPRESSA PARA MUDANÇA DE PAPÉIS.
-- UUID confirmado pela titular nesta conversa. Não derivado de e-mail ou metadados.
-- Execute como administrador do banco, após a migration 015 e revisão dos testes.
begin;
select public.mvp_bootstrap_principal('72d9d1ca-3bb6-4056-8973-f25b2be94ca1'::uuid);
commit;
