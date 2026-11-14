#!/usr/bin/env bash
# Roda os testes de RLS num Postgres local descartável (não toca no Supabase real).
# Uso: PGHOST=... PGPORT=... PGUSER=postgres supabase/tests/rodar_testes.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=aliadas_teste
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
psql -q -d postgres -c "drop role if exists anon; drop role if exists authenticated; drop role if exists service_role;" >/dev/null 2>&1 || true
run() { psql -q -t -A -v ON_ERROR_STOP=1 -d $DB "$@"; }
run -f tests/stubs_supabase.sql
for f in migrations/*.sql; do
  # pg_net só existe no Supabase; o stub de teste o substitui
  sed '/create extension if not exists pg_net/d' "$f" | run
done
run -f tests/rls_test.sql 2>&1 | grep -E "ok:|FALHOU|ERRO|ERROR|---|PASSARAM" | sed "s/^psql:[^ ]* NOTICE:  /  /"
