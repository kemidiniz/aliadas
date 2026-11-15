-- Simula o mínimo do Supabase num Postgres comum, só para TESTAR o RLS localmente.
-- Não vai para o projeto real.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz, confirmation_token text, recovery_token text,
  email_change_token_new text, email_change text
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create function storage.extension(name text) returns text language sql immutable as $$
  select reverse(split_part(reverse(name), '.', 1)) $$;
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

create schema vault;
create table vault.decrypted_secrets (name text, decrypted_secret text);
create schema net;
create table net.chamadas (url text, body jsonb);
create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int)
returns bigint language sql as $$ insert into net.chamadas values (url, body) returning 1::bigint $$;
create schema extensions;
create extension pgcrypto schema extensions;
create table vault.secrets (name text, secret text);
create function vault.create_secret(valor text, nome text) returns uuid language sql as $$
  insert into vault.secrets values (nome, valor);
  insert into vault.decrypted_secrets values (nome, valor);
  select gen_random_uuid() $$;
