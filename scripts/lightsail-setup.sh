#!/usr/bin/env bash
# Uso na VPS (Ubuntu) depois de clonar o repo e criar o .env na raiz do projeto:
#   sudo apt update && sudo apt install -y git nginx curl
#   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
#   sudo apt install -y nodejs
#   sudo mkdir -p /var/www && sudo chown "$USER:$USER" /var/www
#   cd /var/www && git clone https://github.com/arycampos18-pixel/saconnect.git
#   cd saconnect && cp .env.example .env && nano .env
#   bash scripts/lightsail-setup.sh

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Crie o arquivo .env nesta pasta (veja .env.example)."
  exit 1
fi

if [[ ! -f package.json ]]; then
  echo "package.json não encontrado em $APP_DIR"
  exit 1
fi

npm ci
npm run build

sudo tee /etc/nginx/sites-available/sa-connect >/dev/null <<NGX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root ${APP_DIR}/dist;
    index index.html;
    server_name _;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGX

sudo ln -sf /etc/nginx/sites-available/sa-connect /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "Nginx configurado. Pasta estática: ${APP_DIR}/dist"
