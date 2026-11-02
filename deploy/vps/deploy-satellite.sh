#!/bin/bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Deploy de um servidor satélite (OG-548): só o game server, noutra máquina (ex.: Madrid), ligado à
# API da VPS principal. Constrói a imagem do game server nesta máquina, envia por SSH, copia as
# variáveis de partida da principal (shared.env), instala e registra o segredo do satélite na API
# principal (INTERNAL_SECRETS) e a origem dele na CSP do site (SATELLITE_ORIGINS).
#   Primeira vez: DOMAIN=mad.outgunweb.com.br REGION=es bash deploy/vps/deploy-satellite.sh root@IP
#   Depois:       bash deploy/vps/deploy-satellite.sh root@IP     (DOMAIN e REGION ficam no .env de lá)
# MAIN (padrão root@137.131.202.138): a VPS principal. SITE (padrão https://outgunweb.com.br): o site.
# O deploy.sh da principal chama este script para cada máquina em SATELLITES (ou
# `git config outgun.satellites`), na mesma versão.
set -euo pipefail
cd "$(dirname "$0")/../.."
command -v docker >/dev/null || export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
host="${1:?uso: deploy-satellite.sh root@IP}"
main="${MAIN:-root@137.131.202.138}"
site="${SITE:-https://outgunweb.com.br}"
tag="$(git rev-parse --short HEAD)$(git diff --quiet HEAD -- apps packages deploy || echo -dirty)"
version="$(node -p "require('./package.json').version")"
opts=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
sat_() { ssh "${opts[@]}" "$host" "$@"; }
main_() { ssh "${opts[@]}" "$main" "$@"; }

case "$(sat_ uname -m)" in
  x86_64) platform=linux/amd64 ;;
  aarch64 | arm64) platform=linux/arm64 ;;
  *) echo "arquitetura do satélite não suportada" >&2; exit 1 ;;
esac

echo "== satélite $host: imagem $tag ($platform)"
docker build -q --platform "$platform" -f deploy/Dockerfile --target game-server -t "outgun-game-server:$tag" . >/dev/null
sat_ "mkdir -p /opt/outgun"
if ! sat_ "docker image inspect outgun-game-server:$tag >/dev/null 2>&1" 2>/dev/null; then
  docker save "outgun-game-server:$tag" | gzip -1 | sat_ "command -v docker >/dev/null || (apt-get update -q && DEBIAN_FRONTEND=noninteractive apt-get install -yq docker.io docker-compose-v2 >/dev/null); gunzip | docker load" | tail -2
fi
scp -q "${opts[@]}" deploy/vps/satellite/compose.yml deploy/vps/satellite/Caddyfile deploy/vps/satellite/install.sh "$host:/opt/outgun/"

# o mesmo jogo da principal: variáveis de partida do .env de lá (as de cada máquina, como
# MAX_ROOMS, ficam no .env do satélite)
shared='^(ROTATION|RANKED_ROTATION|GAMEMOD|PRESET|MAX_PLAYERS|CASUAL_BOTS_FILL|CHAT_FILTER|MAX_SPECTATORS|EMPTY_TIMEOUT_S|IDLE_TIMEOUT_S|REPLAY_RETENTION_DAYS|MAX_CONNECTIONS_PER_IP|SENTRY_DSN|SENTRY_ENVIRONMENT)='
main_ "grep -E '$shared' /opt/outgun/.env || true" | sat_ "umask 077; cat > /opt/outgun/shared.env"

echo "== satélite $host: instalação"
sat_ "TAG=$tag RELEASE=$version ${DOMAIN:+DOMAIN=$DOMAIN} ${REGION:+REGION=$REGION} ${GS_ID:+GS_ID=$GS_ID} API_URL=$site/api SITE_ORIGIN=$site bash /opt/outgun/install.sh"

echo "== principal $main: registro do satélite"
# id, segredo e domínio do satélite vão por stdin (não aparecem na linha de comando de lá)
scp -q "${opts[@]}" deploy/vps/satellite/register.sh "$main:/opt/outgun/register-satellite.sh"
sat_ "grep -E '^(GS_ID|GS_SECRET|DOMAIN)=' /opt/outgun/.env" | main_ "bash /opt/outgun/register-satellite.sh"
