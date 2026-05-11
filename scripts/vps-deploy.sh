#!/usr/bin/env bash
# Na VPS (Linux), com o repositório clonado na pasta do projecto.
# Pré-requisitos: Node.js 20+, ficheiro .env na raiz com VITE_SUPABASE_* (ver .env.example).
#
# Uso:
#   chmod +x scripts/vps-deploy.sh
#   ./scripts/vps-deploy.sh
# Com cópia automática para a pasta web:
#   WEB_ROOT=/var/www/sa-connect ./scripts/vps-deploy.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Erro: crie .env na raiz (copie de .env.example e preencha VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID)."
  exit 1
fi

command -v npm >/dev/null 2>&1 || { echo "Erro: instale Node.js 20 ou superior."; exit 1; }

echo "A instalar dependencias (npm ci). Avisos 'npm warn deprecated' sao normais — aguarde o fim."
npm ci
npm run build

WEB_ROOT="${WEB_ROOT:-}"
if [[ -n "$WEB_ROOT" ]]; then
  mkdir -p "$WEB_ROOT"
  rsync -a --delete "${ROOT}/dist/" "${WEB_ROOT}/"
  echo "OK: ficheiros em ${WEB_ROOT}"
else
  echo "OK: build em ${ROOT}/dist"
  echo "     Para publicar: WEB_ROOT=/var/www/sa-connect $0"
fi
