-- 019 · Feedback novo volta a avisar o Make (um caminho só).
-- A 013 apagou os 3 gatilhos antigos; aqui volta APENAS o de feedback novo.
-- Não voltam: feedback_aprovado_avisa_make (não há mais aprovação de resposta no
-- site; a curadora responde pelo Gmail) nem perfil_novo_avisa_make (o painel
-- da administração mostra os perfis aguardando aprovação).
-- O aviso leva só {tabela, evento, id}; o Make busca a linha com a chave guardada nele.
-- Sem o segredo make_feedback_novo_url no Vault, avisa_make não chama nada.
do $$begin
 if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='avisa_make') then
  raise exception 'função public.avisa_make não encontrada (esperada desde a 007)';
 end if;
end;$$;
drop trigger if exists feedback_novo_avisa_make on public.feedback;
create trigger feedback_novo_avisa_make
  after insert on public.feedback
  for each row execute function public.avisa_make('make_feedback_novo_url');
