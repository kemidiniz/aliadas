-- =====================================================================
-- aliadas · 007 · avisos para a automação externa (Make)
--
-- Privacidade: o banco envia SÓ {tabela, evento, id}. O Make busca a
-- linha de novo com a service role antes de agir. Assim, nenhum dado
-- pessoal vai no aviso, e uma chamada forjada para a URL não consegue
-- mandar e-mail com conteúdo inventado.
--
-- As URLs dos webhooks ficam no Vault (fora do git). Para configurar:
--   select vault.create_secret('<url do webhook>', 'make_feedback_novo_url');
--   select vault.create_secret('<url do webhook>', 'make_feedback_atualizado_url');
--   select vault.create_secret('<url do webhook>', 'make_perfil_novo_url');
-- =====================================================================

create or replace function public.avisa_make()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  url text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = tg_argv[0];
  if url is null then
    return new; -- automação ainda não configurada: o site segue funcionando
  end if;
  perform net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('tabela', tg_table_name, 'evento', lower(tg_op), 'id', new.id),
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;
revoke execute on function public.avisa_make() from public, anon, authenticated;

create trigger feedback_novo_avisa_make
  after insert on public.feedback
  for each row execute function public.avisa_make('make_feedback_novo_url');

-- só quando a curadora aprova uma resposta
create trigger feedback_aprovado_avisa_make
  after update of status on public.feedback
  for each row when (new.status = 'aprovado' and old.status is distinct from 'aprovado')
  execute function public.avisa_make('make_feedback_atualizado_url');

create trigger perfil_novo_avisa_make
  after insert on public.profiles
  for each row execute function public.avisa_make('make_perfil_novo_url');
