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

# EC2 t3.micro / Lightsail 512MB-1GB: Vite esgota a RAM sem swap.
_ensure_swap_for_build() {
  local mem_kb swap_kb swapf=/swap-sa-connect-build
  mem_kb=$(awk '/MemTotal:/{print $2}' /proc/meminfo)
  swap_kb=$(awk '/SwapTotal:/{print $2}' /proc/meminfo)
  if (( mem_kb >= 2560000 && swap_kb >= 1048576 )); then
    return 0
  fi
  if (( swap_kb >= 1536000 )); then
    return 0
  fi
  echo "Memoria baixa (RAM ${mem_kb} kB, swap ${swap_kb} kB). A criar 2 GiB de swap em ${swapf}..."
  if [[ ! -f "$swapf" ]]; then
    sudo fallocate -l 2G "$swapf" 2>/dev/null || sudo dd if=/dev/zero of="$swapf" bs=1M count=2048 status=progress
    sudo chmod 600 "$swapf"
    sudo mkswap "$swapf"
  fi
  if ! swapon --show 2>/dev/null | grep -qF "$swapf"; then
    sudo swapon "$swapf"
  fi
  if ! grep -qF "$swapf" /etc/fstab 2>/dev/null; then
    echo "$swapf none swap sw 0 0" | sudo tee -a /etc/fstab >/dev/null
  fi
  echo "Swap activo:" && swapon --show || true
}

_ensure_swap_for_build

# Mais heap virtual; com swap o kernel consegue satisfazer (build fica mais lento).
export NODE_OPTIONS="--max-old-space-size=3072"

npm ci
npm run build

# Lightsail blueprint Node.js (ou demo) pode ja estar a escutar na 80; Nginx precisa da 80.
if sudo ss -tln 2>/dev/null | grep -qE ':80\s'; then
  echo "Porta 80 ocupada; a libertar para o Nginx (SA Connect em /dist)..."
  sudo apt-get install -y lsof >/dev/null 2>&1 || true
  mapfile -t _p80 < <(sudo lsof -t -iTCP:80 -sTCP:LISTEN 2>/dev/null || true)
  if ((${#_p80[@]})); then
    echo "  Encerrando processo(s) na 80: ${_p80[*]}"
    sudo kill "${_p80[@]}" 2>/dev/null || true
    sleep 2
  fi
fi

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
# restart: primeira vez o Nginx pode nao ter subido (80 ocupada); reload nao inicia o servico
sudo systemctl enable nginx 2>/dev/null || true
sudo systemctl restart nginx
echo "Nginx configurado. Pasta estática: ${APP_DIR}/dist"
