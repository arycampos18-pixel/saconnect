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

# Extrai o ref do projeto Supabase a partir de VITE_SUPABASE_URL no .env
# Ex.: https://nbgxxdsvoyfxdjvzynit.supabase.co  →  nbgxxdsvoyfxdjvzynit
SUPABASE_REF="$(grep -E '^VITE_SUPABASE_URL=' .env | sed 's|.*https://||;s|\.supabase\.co.*||')"

if [[ -z "$SUPABASE_REF" ]]; then
  echo "AVISO: VITE_SUPABASE_URL não encontrada no .env — bloco proxy do OTP não será gerado."
  OTP_PROXY_BLOCK=""
else
  OTP_PROXY_BLOCK="
    # Proxy OTP — evita bloqueio do browser a *.supabase.co (mixed content / CORS).
    # Certifique-se que VITE_PUBLIC_OTP_SEND_URL=/api/public-enviar-otp está no .env antes do build.
    location = /api/public-enviar-otp {
        proxy_pass https://${SUPABASE_REF}.supabase.co/functions/v1/public-enviar-otp;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_set_header Host ${SUPABASE_REF}.supabase.co;
        proxy_set_header Authorization \$http_authorization;
        proxy_set_header apikey \$http_apikey;
        proxy_set_header Content-Type application/json;
    }"
fi

sudo tee /etc/nginx/sites-available/sa-connect >/dev/null <<NGX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root ${APP_DIR}/dist;
    index index.html;
    server_name _;

    # index.html: nunca em cache — o browser sempre busca a versão mais recente.
    # Isso garante que após um novo deploy o buildGuard detecte a mudança de epoch.
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header Pragma "no-cache" always;
        try_files \$uri =404;
    }

    # Assets com hash no nome (JS/CSS gerado pelo Vite): cache longo no browser.
    # O Vite muda o hash quando o conteúdo muda, então não há stale content.
    location ~* /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        access_log off;
    }

    # version.json (se existir): sem cache, para checagem de versão opcional.
    location = /version.json {
        add_header Cache-Control "no-store" always;
    }

    # SPA fallback: todas as rotas retornam index.html.
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }

${OTP_PROXY_BLOCK}
}
NGX

sudo ln -sf /etc/nginx/sites-available/sa-connect /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "Nginx configurado. Pasta estática: ${APP_DIR}/dist"
