-- =====================================================================
-- aliadas · 005 · segredo do gatilho gerado DENTRO do banco
-- O valor nunca aparece em código, chat ou log. A Edge Function
-- "recomendar" lê o segredo por uma função que só a service role executa.
-- =====================================================================
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'recomendar_webhook_secret')
where not exists (select 1 from vault.secrets where name = 'recomendar_webhook_secret');

-- troque <ref> pelo id do seu projeto se for recriar em outro lugar
select vault.create_secret('https://mbiutzyteuvcoahhizmg.supabase.co/functions/v1/recomendar', 'recomendar_url')
where not exists (select 1 from vault.secrets where name = 'recomendar_url');

create or replace function public.segredo_webhook_recomendar()
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'recomendar_webhook_secret';
$$;
revoke execute on function public.segredo_webhook_recomendar() from public, anon, authenticated;
grant execute on function public.segredo_webhook_recomendar() to service_role;
