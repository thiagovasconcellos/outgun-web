#!/bin/bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Roda na VPS principal (OG-548), chamado pelo deploy-satellite.sh: registra o segredo do satélite
# na API (INTERNAL_SECRETS, mantendo os dos outros servidores), a origem dele na CSP do site
# (SATELLITE_ORIGINS) e, com CASUAL_ONLY=1, a marca de só Casual (CASUAL_ONLY_SERVERS, OG-597).
# Só reinicia a API e o site se algo mudou.
#
# Lê GS_ID=, GS_SECRET= e DOMAIN= do stdin. O satélite pode ser máquina de terceiros (D-97): o que vem
# dele é tratado como dado não confiável, validado aqui e nunca avaliado. Servidor novo, troca de
# segredo e marca só valem com pedido de quem faz o deploy (variáveis abaixo); num deploy comum o
# par id:segredo e o domínio já têm de estar registrados, senão bastaria o dono da máquina trocar o
# GS_ID no .env de lá para virar um servidor sem a marca.
#   NEW_SATELLITE=1   primeira instalação (o deploy manda id e domínio, não o satélite)
#   CASUAL_ONLY=1     marca o id como só Casual; sair da lista só à mão, no .env da principal
#   REPLACE_SECRET=1  aceita segredo novo para id já registrado (VM reinstalada)
set -euo pipefail
cd /opt/outgun

id="" secret="" domain=""
while IFS='=' read -r key value; do
  case "$key" in
    GS_ID) id="$value" ;;
    GS_SECRET) secret="$value" ;;
    DOMAIN) domain="$value" ;;
  esac
done
refuse() { echo "registro do satélite recusado: $1" >&2; exit 1; }
[[ "$id" =~ ^[a-z0-9][a-z0-9-]{0,40}$ ]] || refuse "GS_ID inválido"
[[ "$secret" =~ ^[A-Za-z0-9]{16,128}$ ]] || refuse "GS_SECRET inválido"
[[ "$domain" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || refuse "DOMAIN inválido"

new="${NEW_SATELLITE:-}"
changed=0
current="$(grep '^INTERNAL_SECRETS=' .env | cut -d= -f2- || true)"
if ! printf '%s\n' "$current" | tr ',' '\n' | grep -qxF "$id:$secret"; then
  if printf '%s\n' "$current" | tr ',' '\n' | grep -q "^$id:"; then
    [ -n "$new" ] && [ -n "${REPLACE_SECRET:-}" ] || refuse "segredo de $id mudou (VM reinstalada? repita a primeira instalação com REPLACE_SECRET=1)"
  else
    [ -n "$new" ] || refuse "$id não está registrado (servidor novo: defina DOMAIN e REGION no deploy)"
  fi
  # troca o segredo antigo deste id (se houver) e mantém os dos outros servidores
  others="$(printf '%s\n' "$current" | tr ',' '\n' | grep -v "^$id:" | grep -v '^$' | paste -sd, - || true)"
  sed -i '/^INTERNAL_SECRETS=/d' .env
  echo "INTERNAL_SECRETS=${others:+$others,}$id:$secret" >> .env
  changed=1
fi
origins="$(grep '^SATELLITE_ORIGINS=' .env | cut -d= -f2- || true)"
for o in "wss://$domain" "https://$domain"; do
  case " $origins " in
    *" $o "*) ;;
    *)
      [ -n "$new" ] || refuse "$domain não está registrado na CSP"
      origins="${origins:+$origins }$o"
      changed=1
      ;;
  esac
done
sed -i '/^SATELLITE_ORIGINS=/d' .env
echo "SATELLITE_ORIGINS=$origins" >> .env
if [ -n "${CASUAL_ONLY:-}" ]; then
  casual="$(grep '^CASUAL_ONLY_SERVERS=' .env | cut -d= -f2- || true)"
  if ! printf '%s\n' "$casual" | tr ',' '\n' | grep -qxF "$id"; then
    sed -i '/^CASUAL_ONLY_SERVERS=/d' .env
    echo "CASUAL_ONLY_SERVERS=${casual:+$casual,}$id" >> .env
    changed=1
  fi
fi
if [ "$changed" = 1 ]; then
  # a API passa a aceitar o heartbeat do satélite e o site a conectar nele (CSP)
  docker compose up -d --wait api web >/dev/null
  echo "satélite $id registrado na principal"
else
  echo "satélite $id já registrado"
fi
