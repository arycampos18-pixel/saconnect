#!/usr/bin/env bash
# Executado no servidor via deploy-lightsail.ps1 -PullDeploy (stdin).
# Pressupoe /var/www/saconnect ja clonado e .env valido.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/saconnect}"
cd "$APP_DIR"

if [[ ! -d .git ]]; then
  echo "Erro: $APP_DIR nao e um repositorio git. Clone primeiro (deploy completo)."
  exit 1
fi

echo ">>> git pull"
git pull --ff-only

echo ">>> npm ci"
npm ci

echo ">>> npm run build"
npm run build

echo ">>> nginx"
sudo nginx -t
sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx

echo "Deploy rapido concluido. Abra http://<IP_PUBLICO>/"
