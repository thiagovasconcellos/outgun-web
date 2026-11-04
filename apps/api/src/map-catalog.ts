// SPDX-License-Identifier: GPL-2.0-or-later
// Catálogo de mapas com revisões (OG-552, D-91): cada mapa (nativo, da moderação ou importado) tem uma
// identidade estável (`maps.key`, o nome das rotações e partidas) e revisões imutáveis com os bytes
// exatos do arquivo (Latin-1: um caractere = um byte). A semente traz os 20 nativos (revisão 1 =
// `_legacy/maps/`, comprovada pelo SHA-256) e os mapas antigos do painel (`panel_maps`), sem duplicar
// nada se rodar de novo.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import type { Db } from './db/client.js';
import { mapAliases, mapRevisions, maps, panelMaps, panelMapVersions } from './db/schema.js';
import { checkMapText } from './panel-maps.js';

export type MapOrigin = 'native' | 'panel' | 'import';
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Conn = Db | Tx;

/** SHA-256 (hex) dos bytes do arquivo (o texto é Latin-1, um caractere por byte). */
export function mapSha256(text: string): string {
  return createHash('sha256').update(Buffer.from(text, 'latin1')).digest('hex');
}

/** Bytes de um arquivo como texto Latin-1 (um caractere por byte). */
export function latin1(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('latin1');
}

/** Mapa jogável com a revisão ativa: o que o heartbeat entrega aos game servers (OG-553). */
export interface CatalogMap {
  name: string;
  crc: number;
  rev: number;
  sha256: string;
  origin: MapOrigin;
}

/** Mapas jogáveis em novas partidas, com a revisão ativa (chave, número, CRC, SHA-256). */
export async function playableMaps(db: Conn): Promise<CatalogMap[]> {
  const rows = await db
    .select({ name: maps.key, origin: maps.origin, rev: mapRevisions.number, crc: mapRevisions.crc, sha256: mapRevisions.sha256 })
    .from(maps)
    .innerJoin(mapRevisions, and(eq(mapRevisions.mapId, maps.id), eq(mapRevisions.number, maps.activeRevision)))
    .where(and(eq(maps.playable, true), isNotNull(maps.activeRevision)))
    .orderBy(asc(maps.key));
  return rows;
}

/** Mapa pela chave ou por um nome antigo (alias, sem maiúsculas; RN-MRV-03). */
export async function findMap(db: Conn, name: string): Promise<typeof maps.$inferSelect | undefined> {
  const [byKey] = await db.select().from(maps).where(eq(maps.key, name));
  if (byKey) return byKey;
  const [alias] = await db
    .select({ m: maps })
    .from(mapAliases)
    .innerJoin(maps, eq(maps.id, mapAliases.mapId))
    .where(sql`lower(${mapAliases.alias}) = lower(${name})`)
    .limit(1);
  return alias?.m;
}

/** Uma revisão de um mapa (número), ou a ativa se `number` faltar. */
export async function findRevision(db: Conn, mapId: number, number: number): Promise<typeof mapRevisions.$inferSelect | undefined> {
  const [r] = await db.select().from(mapRevisions).where(and(eq(mapRevisions.mapId, mapId), eq(mapRevisions.number, number)));
  return r;
}

/** A revisão mais recente de um mapa com aquele CRC (o CRC do jogo tem 16 bits: pode repetir). */
export async function findRevisionByCrc(db: Conn, mapId: number, crc: number): Promise<typeof mapRevisions.$inferSelect | undefined> {
  const [r] = await db
    .select()
    .from(mapRevisions)
    .where(and(eq(mapRevisions.mapId, mapId), eq(mapRevisions.crc, crc)))
    .orderBy(desc(mapRevisions.number))
    .limit(1);
  return r;
}

export interface NewRevision {
  text: string;
  provenance: string;
  publishedBy?: string | null;
  publishedAt?: Date;
  note?: string | null;
  baseRevision?: number | null;
}

/**
 * Grava uma revisão nova (número seguinte) de um mapa. Mesmos bytes de uma revisão existente = nada a
 * fazer (devolve a existente, `created: false`). Não muda a revisão ativa: quem chama decide.
 */
export async function addRevision(tx: Conn, mapId: number, rev: NewRevision): Promise<{ revision: typeof mapRevisions.$inferSelect; created: boolean }> {
  const checked = checkMapText(rev.text);
  if (!checked.ok) throw new Error(`mapa inválido: ${checked.errors.join('; ')}`);
  const sha256 = mapSha256(rev.text);
  const [same] = await tx.select().from(mapRevisions).where(and(eq(mapRevisions.mapId, mapId), eq(mapRevisions.sha256, sha256)));
  if (same) return { revision: same, created: false };
  const [last] = await tx
    .select({ n: sql<number>`coalesce(max(${mapRevisions.number}), 0)::int` })
    .from(mapRevisions)
    .where(eq(mapRevisions.mapId, mapId));
  const { map } = checked;
  const [revision] = await tx
    .insert(mapRevisions)
    .values({
      mapId,
      number: (last?.n ?? 0) + 1,
      text: rev.text,
      sha256,
      crc: map.crc,
      title: map.title,
      author: map.author,
      width: map.width,
      height: map.height,
      publishedBy: rev.publishedBy ?? null,
      ...(rev.publishedAt ? { publishedAt: rev.publishedAt } : {}),
      provenance: rev.provenance,
      note: rev.note ?? null,
      baseRevision: rev.baseRevision ?? null,
    })
    .returning();
  return { revision: revision!, created: true };
}

/** Cria o mapa (chave nova) ou devolve o existente com a mesma chave. */
export async function ensureMap(tx: Conn, key: string, origin: MapOrigin, createdBy: string | null = null): Promise<{ map: typeof maps.$inferSelect; created: boolean }> {
  const [inserted] = await tx.insert(maps).values({ key, origin, createdBy }).onConflictDoNothing({ target: maps.key }).returning();
  if (inserted) return { map: inserted, created: true };
  const [existing] = await tx.select().from(maps).where(eq(maps.key, key));
  return { map: existing!, created: false };
}

/** Nativos da pasta do jogo: nome do arquivo (sem `.txt`) → texto Latin-1. */
export function nativeMaps(dir: string): { key: string; text: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .map((f) => ({ key: f.slice(0, -4), text: latin1(readFileSync(join(dir, f))) }));
}

/** Pasta dos nativos: `MAPS_DIR` (imagem da API) ou `_legacy/maps` do repositório; undefined se não houver. */
export function nativeMapsDir(): string | undefined {
  const dir = process.env.MAPS_DIR ?? fileURLToPath(new URL('../../../_legacy/maps', import.meta.url));
  return existsSync(dir) ? dir : undefined;
}

export interface SeedReport {
  maps: number;
  revisions: number;
}

/**
 * Semente idempotente (OG-552): cada nativo vira mapa com a revisão 1 (`native-1.0.3`) e cada mapa
 * do painel antigo vira mapa com as suas versões publicadas (procedência `panel`, mesmo publicador e
 * data). Rodar de novo não cria nada. Sem `nativeDir`, só os do painel.
 */
export async function seedMaps(db: Db, nativeDir?: string): Promise<SeedReport> {
  const report: SeedReport = { maps: 0, revisions: 0 };
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(80081)`);
    for (const native of nativeDir ? nativeMaps(nativeDir) : []) {
      const { map, created } = await ensureMap(tx, native.key, 'native');
      if (created) report.maps++;
      // nativo já semeado: a revisão 1 está lá (os bytes da pasta nunca mudaram)
      if (map.activeRevision !== null) continue;
      const r = await addRevision(tx, map.id, { text: native.text, provenance: 'native-1.0.3', publishedAt: new Date('2011-03-12T00:00:00Z') });
      if (r.created) report.revisions++;
      await tx.update(maps).set({ activeRevision: r.revision.number }).where(eq(maps.id, map.id));
    }
    for (const panel of await tx.select().from(panelMaps).orderBy(asc(panelMaps.name))) {
      const { map, created } = await ensureMap(tx, panel.name, 'panel', panel.updatedBy);
      if (created) report.maps++;
      else if (map.origin !== 'panel' || map.activeRevision !== null) continue; // já semeado (ou é outro mapa)
      const versions = await tx.select().from(panelMapVersions).where(eq(panelMapVersions.name, panel.name)).orderBy(asc(panelMapVersions.version));
      let active: number | null = null;
      for (const v of versions) {
        if (v.deleted) continue;
        const r = await addRevision(tx, map.id, { text: v.text, provenance: 'panel', publishedBy: v.changedBy, publishedAt: v.changedAt, note: `panel v${v.version}` });
        if (r.created) report.revisions++;
        active = r.revision.number;
      }
      // versões antigas sem histórico (antes do OG-366 gravar todas): fica o texto atual
      if (active === null) {
        const r = await addRevision(tx, map.id, { text: panel.text, provenance: 'panel', publishedBy: panel.updatedBy, publishedAt: panel.updatedAt });
        if (r.created) report.revisions++;
        active = r.revision.number;
      }
      await tx.update(maps).set({ activeRevision: active, playable: panel.deletedAt === null }).where(eq(maps.id, map.id));
    }
  });
  return report;
}
