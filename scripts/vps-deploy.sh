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

# Mesma logica que lightsail-setup.sh: VPS pequena (ex. t3.micro) precisa de swap para vite build.
if [[ -r /proc/meminfo ]]; then
  _mem=$(awk '/MemTotal:/{print $2}' /proc/meminfo)
  _swp=$(awk '/SwapTotal:/{print $2}' /proc/meminfo)
  if ((_mem < 2560000 && _swp < 1536000)); then
    _sf=/swap-sa-connect-build
    if [[ ! -f "$_sf" ]]; then
      echo "A criar swap 2G em $_sf (sudo) para o build nao falhar por RAM..."
      sudo fallocate -l 2G "$_sf" 2>/dev/null || sudo dd if=/dev/zero of="$_sf" bs=1M count=2048 status=progress
      sudo chmod 600 "$_sf" && sudo mkswap "$_sf"
    fi
    swapon --show 2>/dev/null | grep -qF "$_sf" || sudo swapon "$_sf"
    grep -qF "$_sf" /etc/fstab 2>/dev/null || echo "$_sf none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
  fi
fi
export NODE_OPTIONS="--max-old-space-size=3072"

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
