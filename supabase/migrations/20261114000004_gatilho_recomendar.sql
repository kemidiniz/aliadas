-- =====================================================================
-- aliadas · 004 · aprovação dispara a Edge Function "recomendar"
--
-- Quando a curadora muda um perfil de pendente/reprovado para aprovado,
-- o banco chama a função de forma assíncrona (pg_net), sem travar a tela.
-- A URL e o segredo ficam no Vault do Supabase, nunca no código.
-- Configure (uma vez, no SQL Editor) — veja docs/SUPABASE.md:
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/recomendar', 'recomendar_url');
--   select vault.create_secret('<mesmo valor de RECOMENDAR_WEBHOOK_SECRET>', 'recomendar_webhook_secret');
-- =====================================================================

create extension if not exists pg_net;

create or replace function public.dispara_recomendar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  url text;
  segredo text;
begin
  select decrypted_secret into url     from vault.decrypted_secrets where name = 'recomendar_url';
  select decrypted_secret into segredo from vault.decrypted_secrets where name = 'recomendar_webhook_secret';

  if url is null or segredo is null then
    raise warning 'aliadas: segredos do Vault não configurados; recomendação não disparada';
    return new;
  end if;

  perform net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aliadas-secret', segredo),
    body := jsonb_build_object('profile_id', new.id, 'origem', 'aprovacao'),
    timeout_milliseconds := 60000
  );
  return new;
end;
$$;

revoke execute on function public.dispara_recomendar() from public, anon, authenticated;

create trigger profiles_aprovado_recomendar
  after update of status on public.profiles
  for each row
  when (new.status = 'aprovado' and old.status in ('pendente', 'reprovado'))
  execute function public.dispara_recomendar();
