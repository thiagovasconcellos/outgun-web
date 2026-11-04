// SPDX-License-Identifier: GPL-2.0-or-later
// Importação em lote de mapas (OG-559, RN-MRV-09) e conciliação de duplicatas (OG-560): lê o CSV do
// pacote (`inventario_mapas.csv`, separado por `;`), liga cada revisão ao mapa pela chave explícita
// da coluna `identificador_nativo` (nunca pelo título, RN-MRV-03) e cria os mapas novos. Tudo numa
// transação, idempotente (SHA-256 já existente = nada a fazer). `dryRun` faz o mesmo e desfaz no fim,
// devolvendo o relatório.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { desc, eq, sql } from 'drizzle-orm';
import type { Db } from './db/client.js';
import { gameServers, mapAliases, mapRevisions, mapRotations, maps, matches, users } from './db/schema.js';
import { usernameKey } from './db/keys.js';
import { addRevision, ensureMap, latin1, titleKey } from './map-catalog.js';
import { checkMapText } from './panel-maps.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface ImportRow {
  file: string;
  title: string;
  author: string;
  /** Chave do mapa existente (revisão) ou vazio (mapa novo). */
  target: string;
}

export interface ImportReport {
  dryRun: boolean;
  publisher: string;
  revisions: { key: string; file: string; revision: number | null; created: boolean; titleChange: string | null; authorChange: string | null; summary: string }[];
  created: { key: string; file: string; title: string; revision: number | null; created: boolean }[];
  untouched: string[];
  /** Duplicatas absorvidas pela família (OG-560): nome antigo → chave, revisões movidas. */
  absorbed: { from: string; into: string; revisions: number[]; matches: number }[];
  /** Duplicatas fora do pacote: só relatório (o PO decide). */
  otherDuplicates: { a: string; b: string }[];
  problems: string[];
  casualAdded: string[];
}

/** Lê o CSV do pacote (BOM, `;`, aspas). Só as linhas do zip (as do "[nativo Web V2]" ficam intocadas). */
export function readInventory(csv: string): { rows: ImportRow[]; untouched: string[] } {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const split = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (const c of line) {
      if (c === '"') quoted = !quoted;
      else if (c === ';' && !quoted) {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };
  const rows: ImportRow[] = [];
  const untouched: string[] = [];
  for (const line of lines.slice(1)) {
    const [pkg, file, title, author, , target] = split(line);
    if (!file) continue;
    if (pkg?.startsWith('[')) untouched.push(target || file.replace(/\.txt$/, ''));
    else rows.push({ file, title: title ?? '', author: author ?? '', target: target ?? '' });
  }
  return { rows, untouched };
}

/** Texto Latin-1 de um arquivo do pacote: UTF-8 válido com acentos vira Latin-1 (`gavea.txt`). */
export function packageText(bytes: Buffer): { text: string; utf8: boolean } {
  const raw = latin1(bytes);
  if (!bytes.some((b) => b >= 0x80)) return { text: raw, utf8: false };
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (/[Ā-￿]/.test(decoded)) return { text: raw, utf8: false };
    return { text: decoded, utf8: true };
  } catch {
    return { text: raw, utf8: false };
  }
}

/** Chave de um mapa novo do pacote: o nome do arquivo, como os nativos (`the_small_ud.txt` → `the small ud`). */
const fileKey = (file: string) => file.replace(/\.txt$/i, '').replace(/_/g, ' ').toLowerCase();

class Rollback extends Error {}

function summary(a: string, b: string): string {
  const pa = checkMapText(a);
  const pb = checkMapText(b);
  if (!pa.ok || !pb.ok) return '';
  const size = pa.map.width !== pb.map.width || pa.map.height !== pb.map.height ? `${pa.map.width}x${pa.map.height} -> ${pb.map.width}x${pb.map.height}` : `${pb.map.width}x${pb.map.height}`;
  return `${size}, CRC ${pa.map.crc} -> ${pb.map.crc}`;
}

/**
 * Duplicatas do painel (origem `panel`) de um mapa do pacote (OG-560, regra do PO de 2026-11-02): a
 * chave sem caixa ou o título igual ao de um mapa do pacote, num mapa que não é o alvo. Movem as
 * revisões para a família (com data e publicador originais), viram alias, as partidas passam a
 * apontar para a família e as rotações trocam o nome. A identidade vazia sai (nada de revisão se apaga).
 */
async function absorbDuplicates(tx: Tx, targets: { key: string; title: string }[], report: ImportReport): Promise<void> {
  const all = await tx.select().from(maps);
  // comparação estrita (sem o corte do sufixo numérico do aviso do painel: "Pari 2" não é "Pari")
  const strict = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const target of targets) {
    const family = all.find((m) => m.key === target.key);
    if (!family) continue;
    const dups = all.filter((m) => m.id !== family.id && m.origin === 'panel' && (m.key.toLowerCase() === target.key.toLowerCase() || strict(m.key) === strict(target.title)));
    for (const dup of dups) {
      const revs = await tx.select().from(mapRevisions).where(eq(mapRevisions.mapId, dup.id)).orderBy(mapRevisions.number);
      const [last] = await tx.select({ n: mapRevisions.number }).from(mapRevisions).where(eq(mapRevisions.mapId, family.id)).orderBy(desc(mapRevisions.number)).limit(1);
      let next = last?.n ?? 0;
      const moved: number[] = [];
      for (const r of revs) {
        // mesmos bytes que uma revisão da família: fica só a da família (a duplicata não traz nada novo)
        const [same] = await tx.select({ id: mapRevisions.id }).from(mapRevisions).where(sql`${mapRevisions.mapId} = ${family.id} AND ${mapRevisions.sha256} = ${r.sha256}`);
        if (same) continue;
        next++;
        await tx.update(mapRevisions).set({ mapId: family.id, number: next }).where(eq(mapRevisions.id, r.id));
        moved.push(next);
      }
      const leftover = await tx.select({ id: mapRevisions.id }).from(mapRevisions).where(eq(mapRevisions.mapId, dup.id));
      const n = await tx.update(matches).set({ mapId: family.id }).where(eq(matches.mapId, dup.id)).returning({ id: matches.id });
      await tx.insert(mapAliases).values({ alias: dup.key, mapId: family.id }).onConflictDoNothing();
      for (const rot of await tx.select().from(mapRotations)) {
        if (!rot.maps.includes(dup.key)) continue;
        const replaced = [...new Set(rot.maps.map((k) => (k === dup.key ? family.key : k)))];
        await tx.update(mapRotations).set({ maps: replaced, version: rot.version + 1, updatedAt: new Date() }).where(eq(mapRotations.key, rot.key));
      }
      if (leftover.length === 0) await tx.delete(maps).where(eq(maps.id, dup.id));
      else report.problems.push(`${dup.key}: revisões iguais às da família ficaram na identidade antiga`);
      report.absorbed.push({ from: dup.key, into: family.key, revisions: moved, matches: n.length });
    }
  }
}

/** Outras duplicatas (só relatório): mapas com o mesmo título normalizado, fora do pacote. */
async function otherDuplicates(tx: Tx, packageKeys: Set<string>): Promise<{ a: string; b: string }[]> {
  const rows = await tx.execute<{ key: string; title: string }>(sql`SELECT mp.key, coalesce(r.title, mp.key) AS title FROM maps mp LEFT JOIN map_revisions r ON r.map_id = mp.id AND r.number = mp.active_revision`);
  const seen = new Map<string, string>();
  const out: { a: string; b: string }[] = [];
  for (const r of rows) {
    const k = titleKey(r.title);
    const other = seen.get(k);
    if (other && !packageKeys.has(other) && !packageKeys.has(r.key)) out.push({ a: other, b: r.key });
    else seen.set(k, r.key);
  }
  return out;
}

export async function importMaps(db: Db, dir: string, opts: { publisher: string; provenance: string; dryRun: boolean; csv?: string }): Promise<ImportReport> {
  const { rows, untouched } = readInventory(readFileSync(join(dir, opts.csv ?? 'inventario_mapas.csv'), 'utf8'));
  const report: ImportReport = { dryRun: opts.dryRun, publisher: opts.publisher, revisions: [], created: [], untouched, absorbed: [], otherDuplicates: [], problems: [], casualAdded: [] };
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(80081)`);
      const [publisher] = await tx.select().from(users).where(eq(users.usernameKey, usernameKey(opts.publisher)));
      if (!publisher || publisher.username !== opts.publisher) throw new Error(`conta ${opts.publisher} não encontrada (o nome tem de ser exato)`);
      if (!publisher.isAdmin && !publisher.isModerator) throw new Error(`conta ${opts.publisher} não é admin nem moderadora`);
      const files = rows.map((r) => {
        const t = packageText(readFileSync(join(dir, r.file)));
        const checked = checkMapText(t.text);
        if (!checked.ok) throw new Error(`${r.file}: ${checked.errors.join('; ')}`);
        if (t.utf8) report.problems.push(`${r.file}: convertido de UTF-8 para Latin-1 (título "${checked.map.title}")`);
        return { ...r, text: t.text, map: checked.map };
      });
      // OG-560 antes: as versões duplicadas entram como históricas e a de Nosferatu fica por último (ativa)
      await absorbDuplicates(tx, files.filter((f) => f.target).map((f) => ({ key: f.target, title: f.map.title })), report);
      for (const f of files.filter((x) => x.target)) {
        const [map] = await tx.select().from(maps).where(eq(maps.key, f.target));
        if (!map) {
          report.problems.push(`${f.file}: mapa ${f.target} não existe no catálogo (semente?)`);
          continue;
        }
        const [active] = map.activeRevision ? await tx.select().from(mapRevisions).where(sql`${mapRevisions.mapId} = ${map.id} AND ${mapRevisions.number} = ${map.activeRevision}`) : [];
        const r = await addRevision(tx, map.id, { text: f.text, provenance: opts.provenance, publishedBy: publisher.id, baseRevision: map.activeRevision });
        if (r.created || map.activeRevision !== r.revision.number) await tx.update(maps).set({ activeRevision: r.revision.number }).where(eq(maps.id, map.id));
        report.revisions.push({
          key: map.key,
          file: f.file,
          revision: r.revision.number,
          created: r.created,
          titleChange: active && active.title !== f.map.title ? `${active.title} -> ${f.map.title}` : null,
          authorChange: active && active.author !== f.map.author ? `${active.author} -> ${f.map.author}` : null,
          summary: active ? summary(active.text, f.text) : '',
        });
      }
      for (const f of files.filter((x) => !x.target)) {
        const key = fileKey(f.file);
        const { map, created } = await ensureMap(tx, key, 'import', publisher.id);
        if (!created && map.origin !== 'import') {
          report.problems.push(`${f.file}: a chave ${key} já é de outro mapa (${map.origin}); nada feito`);
          continue;
        }
        const r = await addRevision(tx, map.id, { text: f.text, provenance: opts.provenance, publishedBy: publisher.id });
        if (map.activeRevision === null) await tx.update(maps).set({ activeRevision: r.revision.number }).where(eq(maps.id, map.id));
        report.created.push({ key, file: f.file, title: f.map.title, revision: r.revision.number, created: r.created });
      }
      // P3: os novos entram na rotação Casual (Ranked não); sem linha no painel, parte da do servidor
      const fresh = report.created.map((c) => c.key);
      const [casual] = await tx.select().from(mapRotations).where(eq(mapRotations.key, 'casual'));
      const [server] = await tx.select({ rotations: gameServers.rotations }).from(gameServers).orderBy(desc(gameServers.lastHeartbeatAt)).limit(1);
      const current = casual?.maps ?? server?.rotations.casual ?? [];
      const add = fresh.filter((k) => !current.includes(k));
      if (add.length > 0) {
        const next = [...current, ...add];
        if (casual) await tx.update(mapRotations).set({ maps: next, version: casual.version + 1, updatedBy: publisher.id, updatedAt: new Date() }).where(eq(mapRotations.key, 'casual'));
        else await tx.insert(mapRotations).values({ key: 'casual', maps: next, updatedBy: publisher.id });
        report.casualAdded = add;
      }
      report.otherDuplicates = await otherDuplicates(tx, new Set([...files.map((f) => f.target).filter(Boolean), ...fresh]));
      if (opts.dryRun) throw new Rollback();
    });
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
  return report;
}

/** Nome do painel antigo que virou alias (OG-560): a semente não o recria como mapa. */
export async function isAlias(db: Db | Tx, name: string): Promise<boolean> {
  const [a] = await db.select({ alias: mapAliases.alias }).from(mapAliases).where(eq(mapAliases.alias, name));
  return !!a;
}

