#!/usr/bin/env bash
set -euo pipefail
: "${DST_DB:?DST_DB não definido}"

psql "$DST_DB" -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare r record;
begin
  for r in
    select s.relname as seq, t.relname as tbl, a.attname as col
    from pg_class s
    join pg_depend d on d.objid = s.oid and d.deptype = 'a'
    join pg_class t on t.oid = d.refobjid
    join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
    join pg_namespace n on n.oid = t.relnamespace
    where s.relkind = 'S' and n.nspname = 'public'
  loop
    execute format(
      'select setval(%L, coalesce((select max(%I) from public.%I), 1), (select max(%I) is not null from public.%I))',
      'public.'||r.seq, r.col, r.tbl, r.col, r.tbl
    );
    raise notice 'reset %', r.seq;
  end loop;
end$$;
SQL
echo "OK."