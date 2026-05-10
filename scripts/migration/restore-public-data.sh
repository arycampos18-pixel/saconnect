#!/usr/bin/env bash
set -euo pipefail
: "${DST_DB:?DST_DB não definido}"
IN="${IN:-/tmp/saconnect-public.dump}"

echo "==> pg_restore para DESTINO de $IN"
pg_restore -d "$DST_DB" \
  --data-only \
  --disable-triggers \
  --no-owner --no-privileges \
  --single-transaction \
  "$IN"

echo "OK. Próximo: bash reset-sequences.sh"