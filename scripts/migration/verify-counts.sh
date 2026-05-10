#!/usr/bin/env bash
set -euo pipefail
: "${SRC_DB:?}"; : "${DST_DB:?}"

TABLES=$(psql "$DST_DB" -At -c \
  "select tablename from pg_tables where schemaname='public' order by tablename")

printf "%-50s %12s %12s %8s\n" "table" "src" "dst" "diff"
EXIT=0
for t in $TABLES; do
  S=$(psql "$SRC_DB" -At -c "select count(*) from public.\"$t\"" 2>/dev/null || echo ERR)
  D=$(psql "$DST_DB" -At -c "select count(*) from public.\"$t\"" 2>/dev/null || echo ERR)
  if [[ "$S" == ERR || "$D" == ERR ]]; then
    printf "%-50s %12s %12s %8s\n" "$t" "$S" "$D" "?"
    continue
  fi
  DIFF=$((S - D))
  printf "%-50s %12s %12s %8s\n" "$t" "$S" "$D" "$DIFF"
  [[ "$DIFF" -ne 0 ]] && EXIT=1
done
exit $EXIT
