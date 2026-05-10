#!/usr/bin/env bash
# Migra auth.users / identities / mfa. Senhas (bcrypt) preservadas.
# Sessões/refresh tokens NÃO migram — utilizadores fazem login de novo.
set -euo pipefail
: "${SRC_DB:?SRC_DB nao definido}"
: "${DST_DB:?DST_DB nao definido}"

OUT="/tmp/saconnect-auth.dump"

echo "==> Dump auth.* da ORIGEM"
pg_dump "$SRC_DB" \
  --data-only \
  --table=auth.users \
  --table=auth.identities \
  --table=auth.mfa_factors \
  --table=auth.mfa_challenges \
  --no-owner --no-privileges \
  -Fc -f "$OUT"

echo "==> Restore auth.* no DESTINO"
pg_restore -d "$DST_DB" \
  --data-only --disable-triggers --no-owner --no-privileges \
  --single-transaction "$OUT"

echo "==> Backfill profiles/user_roles"
psql "$DST_DB" -v ON_ERROR_STOP=1 <<'SQL'
insert into public.profiles (user_id, nome, email, telefone, cargo)
  select u.id,
         coalesce(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)),
         u.email,
         u.raw_user_meta_data->>'telefone',
         u.raw_user_meta_data->>'cargo'
  from auth.users u
  where not exists (select 1 from public.profiles p where p.user_id = u.id);

insert into public.user_roles (user_id, role)
  select u.id, 'operador'::app_role
  from auth.users u
  where not exists (select 1 from public.user_roles r where r.user_id = u.id);
SQL
echo "OK."
