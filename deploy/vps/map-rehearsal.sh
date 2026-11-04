#!/bin/bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Ensaio da migração de mapas (OG-561, RN-MRV-09) no próprio servidor, sem tocar no banco de produção:
#   1. backup novo (backup.sh) e restauração dele num banco `outgun_rehearsal` (restauração testada);
#   2. com a imagem nova da API: migrações + semente + preenchimento, importação `--dry-run` e de verdade;
#   3. contagens de produção × ensaio antes/depois; o banco de ensaio é apagado no fim.
# Os dumps não saem do servidor. Uso: bash deploy/vps/map-rehearsal.sh root@IP
set -euo pipefail
cd "$(dirname "$0")/../.."
command -v docker >/dev/null || export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
host="${1:?uso: map-rehearsal.sh root@IP}"
tag="$(git rev-parse --short HEAD)"
ssh_() { ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "$host" "$@"; }
case "$(ssh_ uname -m)" in
  x86_64) platform=linux/amd64 ;;
  aarch64 | arm64) platform=linux/arm64 ;;
  *) echo "arquitetura do servidor não suportada" >&2; exit 1 ;;
esac

echo "== imagem da API $tag ($platform)"
if ! ssh_ "docker image inspect outgun-api:$tag >/dev/null 2>&1"; then
  docker build -q --platform "$platform" -f deploy/Dockerfile --target api -t "outgun-api:$tag" . >/dev/null
  docker save "outgun-api:$tag" | gzip -1 | ssh_ "gunzip | docker load" | tail -1
fi

ssh_ "TAG=$tag bash -s" <<'REMOTE'
set -euo pipefail
cd /opt/outgun
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
# </dev/null: o exec e o run leriam o resto deste script (que chega pela entrada padrão do ssh)
psql_() { docker compose exec -T postgres psql -U outgun -v ON_ERROR_STOP=1 -Atc "$2" -d "$1" </dev/null; }
COUNTS="select 'partidas', count(*) from matches union all select 'participações', count(*) from match_players
  union all select 'marcos', count(*) from player_milestones union all select 'ratings', count(*) from skill_changes
  union all select 'replays', count(*) from matches where replay_url is not null union all select 'mapas do painel', count(*) from panel_maps
  union all select 'placar total', coalesce(sum(red_score + blue_score), 0) from matches
  union all select 'frags', coalesce(sum(frags), 0) from match_players"

echo "== backup"
dump=$(docker compose exec -T backup sh /usr/local/bin/backup.sh </dev/null | sed -n 's/^backup: \(\S*\).*/\1/p')
echo "arquivo: $dump"

echo "== restauração testada em outgun_rehearsal"
psql_ outgun "DROP DATABASE IF EXISTS outgun_rehearsal" >/dev/null
psql_ outgun "CREATE DATABASE outgun_rehearsal" >/dev/null
docker compose exec -T -e RESTORE_CONFIRM=sim -e DATABASE_URL="postgres://outgun:${POSTGRES_PASSWORD}@postgres:5432/outgun_rehearsal" backup sh /usr/local/bin/restore.sh "$dump" </dev/null
before=$(psql_ outgun "$COUNTS")
restored=$(psql_ outgun_rehearsal "$COUNTS")
echo "$before"
[ "$before" = "$restored" ] && echo "OK: restauração igual à produção" || { echo "ERRO: restauração difere"; echo "$restored"; exit 1; }

net=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$(docker compose ps -q postgres </dev/null)")
run() { docker run --rm --network "$net" -e DATABASE_URL="postgres://outgun:${POSTGRES_PASSWORD}@postgres:5432/outgun_rehearsal" -e MAPS_DIR=/app/maps "outgun-api:$TAG" node dist/cli.js "$@" </dev/null; }

echo "== migrações + semente + preenchimento (ensaio)"
run migrate up
echo "== importação --dry-run (ensaio)"
run map-import map-imports/nosferatu-2026-11 --dry-run | tail -1
echo "== importação de verdade (ensaio)"
run map-import map-imports/nosferatu-2026-11 | tail -1
echo "== segunda importação (não pode criar nada)"
run map-import map-imports/nosferatu-2026-11 | tail -1
after=$(psql_ outgun_rehearsal "$COUNTS")
[ "$before" = "$after" ] && echo "OK: contagens iguais antes e depois" || { echo "ERRO: contagens mudaram"; echo "$after"; exit 1; }
psql_ outgun_rehearsal "select 'mapas', count(*) from maps union all select 'revisões', count(*) from map_revisions union all select 'aliases', count(*) from map_aliases
  union all select 'partidas ligadas', count(*) from matches where map_revision_id is not null union all select 'partidas inferidas', count(*) from matches where map_revision_inferred"
psql_ outgun_rehearsal "select key, active_revision from maps where key in ('larhi', 'mooca', 'gavea', 'attack 2') order by key"
psql_ outgun_rehearsal "select array_length(maps, 1) from map_rotations where key = 'casual'"

psql_ outgun "DROP DATABASE outgun_rehearsal" >/dev/null
echo "== ensaio ok; backup guardado: $dump"
REMOTE
