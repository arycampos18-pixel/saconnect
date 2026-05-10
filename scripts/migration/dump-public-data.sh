#!/usr/bin/env bash
# Exporta dados do schema public da ORIGEM em formato custom (compresso).
set -euo pipefail
: "${SRC_DB:?SRC_DB não definido}"

OUT="${OUT:-/tmp/saconnect-public.dump}"

echo "==> pg_dump public --data-only de ORIGEM → $OUT"
pg_dump "$SRC_DB" \
  --schema=public \
  --data-only \
  --disable-triggers \
  --no-owner --no-privileges \
  --exclude-table-data='public.tse_*'   `# tabelas TSE são reimportáveis; pesadas` \
  -Fc -f "$OUT"

ls -lh "$OUT"
echo "OK. Próximo: bash restore-public-data.sh"