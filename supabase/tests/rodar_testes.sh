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
apply_migration() {
  sed -e '/create extension if not exists pg_net/d' -e '/extension if exists pg_net/d' -e '/create extension pg_net/d' -e '/create extension if not exists pg_cron/d' "$1" | run
}
# A suíte histórica valida o contrato que existia até 036. Depois as migrations
# novas são aplicadas e a suíte atual valida a jornada e a segurança vigentes.
for f in migrations/*.sql; do
  if [[ "$(basename "$f")" < "20261117000037" ]]; then apply_migration "$f"; fi
done
run -f tests/rls_test.sql 2>&1 | grep -E "ok:|FALHOU|ERRO|ERROR|---|PASSARAM" | sed "s/^psql:[^ ]* NOTICE:  /  /"
for f in migrations/*.sql; do
  if [[ "$(basename "$f")" > "20261117000036z" && "$(basename "$f")" < "20261118000044" ]]; then apply_migration "$f"; fi
done
run -f tests/objetivo_atual_test.sql 2>&1 | grep -E "ok:|FALHOU|ERRO|ERROR|---|PASSARAM" | sed "s/^psql:[^ ]* NOTICE:  /  /"
run -f tests/usabilidade_e_canais_test.sql 2>&1 | grep -E "ok:|FALHOU|ERRO|ERROR|---|PASSARAM" | sed "s/^psql:[^ ]* NOTICE:  /  /"
run -f tests/avisos_email_test.sql 2>&1 | grep -E "ok:|FALHOU|ERRO|ERROR|---|PASSARAM" | sed "s/^psql:[^ ]* NOTICE:  /  /"

# 044 amplia a fila; mantém antes os testes do contrato de 043.
for f in migrations/*.sql; do
  if [[ "$(basename "$f")" > "20261118000043z" && "$(basename "$f")" < "20261118000045" ]]; then apply_migration "$f"; fi
done
run -f tests/avisos_aceite_test.sql 2>&1 | grep -E "ok:|FALHOU|ERRO|ERROR|---|PASSARAM" | sed "s/^psql:[^ ]* NOTICE:  /  /"

# Um registro legado apenas no banco local permite testar a preservação do histórico.
run -c "insert into public.feedback(tipo,nota_facilidade,encontrou_aliadas,email) values('avaliacao',4,'nao','historico45@example.invalid');"
for f in migrations/*.sql; do
  if [[ "$(basename "$f")" > "20261118000044z" ]]; then apply_migration "$f"; fi
done
run -f tests/feedback_obrigatorio_test.sql 2>&1 | grep -E "ok:|FALHOU|ERRO|ERROR|---|PASSARAM" | sed "s/^psql:[^ ]* NOTICE:  /  /"
