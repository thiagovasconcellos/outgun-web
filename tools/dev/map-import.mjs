#!/usr/bin/env node
// SPDX-License-Identifier: GPL-2.0-or-later
// Importação em lote de mapas (OG-559/560, RN-MRV-09): atalho para o comando da API, que tem o
// catálogo e o banco. Local: `node tools/dev/map-import.mjs --dry-run` (precisa do build da API e do
// DATABASE_URL). Produção (no servidor, depois do backup do OG-561):
//   docker compose run --rm migrate node dist/cli.js map-import map-imports/nosferatu-2026-11 --dry-run
//   docker compose run --rm migrate node dist/cli.js map-import map-imports/nosferatu-2026-11
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const api = fileURLToPath(new URL('../../apps/api/', import.meta.url));
const args = process.argv.slice(2);
const dir = args[0] && !args[0].startsWith('--') ? args.shift() : 'map-imports/nosferatu-2026-11';
const r = spawnSync(process.execPath, ['dist/cli.js', 'map-import', dir, ...args], { cwd: api, stdio: 'inherit' });
process.exit(r.status ?? 1);
