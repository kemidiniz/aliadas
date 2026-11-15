-- A pergunta foi retirada do formulário. Remove também as respostas antigas.
-- A migration 010 já retirou esta coluna da validação por tipo.
-- Sem CASCADE: dependências inesperadas devem impedir a remoção.
alter table public.feedback drop column if exists mais_dificil;
