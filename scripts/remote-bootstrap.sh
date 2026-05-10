#!/usr/bin/env bash
# Executado no servidor (via stdin: Get-Content ... | ssh ... bash -s)
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/arycampos18-pixel/saconnect.git}"
APP_DIR="${APP_DIR:-/var/www/saconnect}"

export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y git nginx curl ca-certificates gnupg

sudo mkdir -p /var/www
sudo chown "$(id -un):$(id -gn)" /var/www 2>/dev/null || sudo chown "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" /var/www

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
git pull --ff-only

install_node=false
if ! command -v node &>/dev/null; then
  install_node=true
else
  major=$(node -p "parseInt(process.versions.node.split('.')[0],10)")
  if (( major < 22 )); then install_node=true; fi
fi
if [[ "$install_node" == true ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

if grep -qE 'VITE_SUPABASE_URL=https://xxxx\.|VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave' .env 2>/dev/null; then
  echo ""
  echo "=========================================="
  echo "Configure $APP_DIR/.env com as chaves reais do Supabase (painel > API)."
  echo "No Windows: .\scripts\deploy-lightsail.ps1 -UploadEnv (envia o .env local)"
  echo "Depois rode este script de novo."
  echo "=========================================="
  echo ""
  exit 2
fi

chmod +x scripts/lightsail-setup.sh
bash scripts/lightsail-setup.sh
echo "Deploy concluído. Teste no navegador (HTTP porta 80)."
