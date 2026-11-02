#!/bin/bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Roda na VPS principal (OG-548), chamado pelo deploy-satellite.sh: registra o segredo do satélite
# na API (INTERNAL_SECRETS, mantendo os dos outros servidores) e a origem dele na CSP do site
# (SATELLITE_ORIGINS). Lê GS_ID=, GS_SECRET= e DOMAIN= do stdin. Só reinicia a API e o site se algo
# mudou.
set -euo pipefail
cd /opt/outgun
while IFS='=' read -r key value; do declare "sat_$key=$value"; done
id="$sat_GS_ID" secret="$sat_GS_SECRET" domain="$sat_DOMAIN"
changed=0
current="$(grep '^INTERNAL_SECRETS=' .env | cut -d= -f2- || true)"
if ! printf '%s\n' "$current" | tr ',' '\n' | grep -qx "$id:$secret"; then
  # troca o segredo antigo deste id (se houver) e mantém os dos outros servidores
  others="$(printf '%s\n' "$current" | tr ',' '\n' | grep -v "^$id:" | grep -v '^$' | paste -sd, - || true)"
  sed -i '/^INTERNAL_SECRETS=/d' .env
  echo "INTERNAL_SECRETS=${others:+$others,}$id:$secret" >> .env
  changed=1
fi
origins="$(grep '^SATELLITE_ORIGINS=' .env | cut -d= -f2- || true)"
for o in "wss://$domain" "https://$domain"; do
  case " $origins " in *" $o "*) ;; *) origins="${origins:+$origins }$o"; changed=1 ;; esac
done
if [ "$changed" = 1 ]; then
  sed -i '/^SATELLITE_ORIGINS=/d' .env
  echo "SATELLITE_ORIGINS=$origins" >> .env
  # a API passa a aceitar o heartbeat do satélite e o site a conectar nele (CSP)
  docker compose up -d --wait api web >/dev/null
  echo "satélite $id registrado na principal"
else
  echo "satélite $id já registrado"
fi
