-- 021 · Convite que não fica parado: pendentes há mais de 7 dias expiram.
-- Rotina diária com pg_cron (segunda automação por horário do edital).
-- Um convite expirado não bloqueia uma nova indicação entre as duas pessoas
-- (o índice de par ativo e a seleção só consideram pendente e aceita).
create extension if not exists pg_cron;

do $$declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.conversation_invites'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%pendente%aceita%recusada%' loop
  execute format('alter table public.conversation_invites drop constraint %I',c.conname);
 end loop;
end;$$;
alter table public.conversation_invites add constraint conversation_invites_state_check check(state in ('pendente','aceita','recusada','expirado'));
alter table public.conversation_invites add column expirado_em timestamptz;

-- Log de cada execução: só data e quantidade; leitura só para a curadoria.
create table public.conversation_expiry_runs (
 id bigint generated always as identity primary key,
 executado_em timestamptz not null default now(),
 expirados integer not null check(expirados>=0)
);
alter table public.conversation_expiry_runs enable row level security;
revoke all on public.conversation_expiry_runs from anon,authenticated;
grant select on public.conversation_expiry_runs to authenticated;
grant all on public.conversation_expiry_runs to service_role;
create policy "expiração: curadoria lê" on public.conversation_expiry_runs for select to authenticated using(public.is_curadora());

create function public.mvp_expire_invites() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 update public.conversation_invites set state='expirado',expirado_em=now()
 where state='pendente' and created_at<now()-interval '7 days';
 get diagnostics n=row_count;
 insert into public.conversation_expiry_runs(expirados) values(n);
 return n;
end;$$;
revoke all on function public.mvp_expire_invites() from public,anon,authenticated;
grant execute on function public.mvp_expire_invites() to service_role;

-- Todo dia às 03:07 de Brasília (06:07 UTC).
select cron.schedule('aliadas-expirar-convites','7 6 * * *','select public.mvp_expire_invites()');
