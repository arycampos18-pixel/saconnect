#!/usr/bin/env bash
# Aplica todos os arquivos .sql em supabase/migrations/ em ordem.
# Útil quando você já tem um PostgreSQL rodando (ex.: container do stack Supabase self-hosted)
# e precisa criar/atualizar o schema.
#
# Uso:
#   export DATABASE_URL="postgresql://postgres:SUA_SENHA@127.0.0.1:5432/postgres"
#   bash scripts/apply-supabase-migrations.sh
#
# Requer: cliente psql (sudo apt install -y postgresql-client)

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Defina DATABASE_URL, ex.: postgresql://user:pass@host:5432/dbname"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"

if [[ ! -d "$MIGRATIONS" ]]; then
  echo "Pasta não encontrada: $MIGRATIONS"
  exit 1
fi

mapfile -t files < <(find "$MIGRATIONS" -maxdepth 1 -name '*.sql' -print | sort)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "Nenhuma migração .sql em $MIGRATIONS"
  exit 1
fi

for f in "${files[@]}"; do
  echo ">>> $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Migrações aplicadas."
