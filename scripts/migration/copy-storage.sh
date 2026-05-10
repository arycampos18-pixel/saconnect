#!/usr/bin/env bash
# Uso: bash copy-storage.sh <bucket-name>
set -euo pipefail
: "${SRC_REF:?}"; : "${DST_REF:?}"
: "${SRC_SERVICE_KEY:?service_role da origem}"
: "${DST_SERVICE_KEY:?service_role do destino}"

BUCKET="${1:?Uso: copy-storage.sh <bucket>}"
TMP="/tmp/storage-${BUCKET}"
mkdir -p "$TMP"
SRC_URL="https://${SRC_REF}.supabase.co"
DST_URL="https://${DST_REF}.supabase.co"

curl -s -X POST "${SRC_URL}/storage/v1/object/list/${BUCKET}" \
  -H "Authorization: Bearer ${SRC_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"limit":10000,"offset":0,"sortBy":{"column":"name","order":"asc"}}' \
  > "$TMP/list.json"

echo "$(jq 'length' $TMP/list.json) objectos em ${BUCKET}"

jq -r '.[].name' "$TMP/list.json" | while IFS= read -r name; do
  echo "  $name"
  curl -sf "${SRC_URL}/storage/v1/object/${BUCKET}/${name}" \
    -H "Authorization: Bearer ${SRC_SERVICE_KEY}" -o "$TMP/file.bin"
  curl -sf -X POST "${DST_URL}/storage/v1/object/${BUCKET}/${name}" \
    -H "Authorization: Bearer ${DST_SERVICE_KEY}" \
    -H "x-upsert: true" --data-binary "@$TMP/file.bin" > /dev/null
done

rm -rf "$TMP"
echo "OK."
