#!/bin/bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Instala ou atualiza um servidor satélite (OG-548) numa VPS Ubuntu/Debian. Roda no servidor, como
# root, em /opt/outgun, depois que deploy-satellite.sh copiou os arquivos e carregou a imagem.
# Idempotente:
#   TAG=<versão> DOMAIN=mad.exemplo.com REGION=es API_URL=https://exemplo.com/api \
#     SITE_ORIGIN=https://exemplo.com bash /opt/outgun/install.sh
# Na primeira vez instala Docker, firewall (22/80/443), swap e gera /opt/outgun/.env com o segredo do
# game server (GS_SECRET), que o deploy-satellite.sh registra na API principal. Depois, DOMAIN,
# REGION e o resto vêm do .env (as variáveis só valem na primeira instalação).
set -euo pipefail
cd /opt/outgun
: "${TAG:?defina TAG}"

# --- máquina: igual ao install.sh da principal (Docker, ufw, atualizações automáticas, swap) ---
pkgs=""
command -v docker >/dev/null && docker compose version >/dev/null 2>&1 || pkgs="docker.io docker-compose-v2"
command -v ufw >/dev/null || pkgs="$pkgs ufw"
dpkg -s unattended-upgrades >/dev/null 2>&1 || pkgs="$pkgs unattended-upgrades"
if [ -n "$pkgs" ]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -q
  # shellcheck disable=SC2086
  apt-get install -yq $pkgs
fi
systemctl enable --now docker
# imagens Ubuntu da Oracle Cloud: regras de iptables que rejeitam tudo menos o SSH; quem cuida é o ufw
if dpkg -s netfilter-persistent >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get purge -yq iptables-persistent netfilter-persistent
  while iptables -D INPUT -j REJECT --reject-with icmp-host-prohibited 2>/dev/null; do :; done
  while iptables -D FORWARD -j REJECT --reject-with icmp-host-prohibited 2>/dev/null; do :; done
fi
if ! ufw status | grep -q "Status: active"; then
  ufw default deny incoming && ufw default allow outgoing
  ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
  ufw --force enable
fi
if ! swapon --show | grep -q /swapfile && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- configuração do satélite ---
secret() { head -c 24 /dev/urandom | base64 | tr -d '/+=' ; }
if [ ! -f .env ]; then
  : "${DOMAIN:?primeira instalação: defina DOMAIN}" "${REGION:?primeira instalação: defina REGION}"
  : "${API_URL:?primeira instalação: defina API_URL}" "${SITE_ORIGIN:?primeira instalação: defina SITE_ORIGIN}"
  {
    echo "DOMAIN=$DOMAIN"
    echo "REGION=$REGION"
    echo "GS_ID=${GS_ID:-gs-$REGION}"
    echo "GS_SECRET=$(secret)"
    # id da sala fixa: único entre os servidores (OG-546)
    echo "MAIN_ROOM=main-$REGION"
    echo "API_URL=$API_URL"
    echo "SITE_ORIGIN=$SITE_ORIGIN"
    echo "METRICS_TOKEN=$(secret)"
    # salas por máquina: pouco numa E2.1.Micro (1 GB); suba numa A1
    echo "MAX_ROOMS=${MAX_ROOMS:-6}"
  } > .env
  chmod 600 .env
  echo "configuração gerada em /opt/outgun/.env"
fi
[ -f shared.env ] || : > shared.env
chmod 600 shared.env
if grep -q '^TAG=' .env; then sed -i "s/^TAG=.*/TAG=$TAG/" .env; else echo "TAG=$TAG" >> .env; fi
if [ -n "${RELEASE:-}" ]; then
  if grep -q '^RELEASE=' .env; then sed -i "s/^RELEASE=.*/RELEASE=$RELEASE/" .env; else echo "RELEASE=$RELEASE" >> .env; fi
fi

# atualização: o game server recebe SIGTERM e drena (as partidas terminam) antes de trocar
docker compose up -d --remove-orphans --wait edge game-server
docker compose exec -T edge caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || echo "aviso: não recarreguei o Caddyfile da borda"
docker image prune -f >/dev/null
docker compose ps --format '{{.Service}}: {{.Status}}'
# (de propósito diferente do "no ar:" da principal, que o hook do changelog procura)
echo "satélite pronto: https://$(grep '^DOMAIN=' .env | cut -d= -f2)/gs/health"
