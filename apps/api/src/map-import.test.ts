// SPDX-License-Identifier: GPL-2.0-or-later
// Importação do pacote de Nosferatu (OG-559) e conciliação da duplicata Mooca (OG-560).
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateUp } from './db/migrate.js';
import { mapAliases, mapRevisions, mapRotations, maps, panelMaps, panelMapVersions, users } from './db/schema.js';
import { findMap, nativeMapsDir, seedMaps } from './map-catalog.js';
import { importMaps } from './map-import.js';
import { createTestDatabase, pgAdminUrl, type TestDatabase } from './test/db.js';

const DIR = fileURLToPath(new URL('../map-imports/nosferatu-2026-11', import.meta.url));
const MOOCA = 'P width 1\nP height 1\nP title Mooca\nP author Nosferatu\nS 16 12\nspawn 0 0 0 8 6\nspawn 1 0 0 8 6\n';

describe.skipIf(!pgAdminUrl)('importação do pacote (OG-559/560)', () => {
  let t: TestDatabase;
  const opts = { publisher: 'Nosf', provenance: 'import:nosferatu-2026-11' };

  beforeAll(async () => {
    t = await createTestDatabase();
    await migrateUp(t.sql);
    const [nosf] = await t.db.insert(users).values({ username: 'Nosf', usernameKey: 'nosf', email: 'nosf@example.com', emailKey: 'nosf@example.com', passwordHash: 'x', isAdmin: true }).returning();
    await t.db.insert(panelMaps).values({ name: 'Mooca', text: MOOCA, title: 'Mooca', author: 'Nosferatu', width: 1, height: 1, crc: 1, version: 2, updatedBy: nosf!.id, deletedAt: new Date() });
    await t.db.insert(panelMapVersions).values([
      { name: 'Mooca', version: 1, text: MOOCA, crc: 1, changedBy: nosf!.id },
      { name: 'Mooca', version: 2, text: MOOCA, crc: 1, deleted: true, changedBy: nosf!.id },
    ]);
    await seedMaps(t.db, nativeMapsDir());
  });
  afterAll(() => t?.drop());

  it('ensaio: 14 vínculos, 9 novos, 6 intocados; nada gravado', async () => {
    const r = await importMaps(t.db, DIR, { ...opts, dryRun: true });
    expect(r.revisions).toHaveLength(14);
    expect(r.created).toHaveLength(9);
    expect(r.untouched).toHaveLength(6);
    expect(r.absorbed.map((a) => `${a.from}>${a.into}`)).toEqual(['Mooca>mooca']);
    expect(await findMap(t.db, 'gavea')).toBeUndefined();
  });

  it('grava: Nosferatu ativa, Mooca vira rev 2 de mooca, 9 novos só no Casual; de novo não cria nada', async () => {
    await importMaps(t.db, DIR, { ...opts, dryRun: false });
    const mooca = (await findMap(t.db, 'mooca'))!;
    const revs = await t.db.select().from(mapRevisions).where(eq(mapRevisions.mapId, mooca.id)).orderBy(mapRevisions.number);
    expect(revs.map((r) => r.provenance)).toEqual(['native-1.0.3', 'panel', 'import:nosferatu-2026-11']);
    expect(mooca.activeRevision).toBe(3);
    expect((await findMap(t.db, 'Mooca'))!.id).toBe(mooca.id); // alias
    expect(await t.db.select().from(mapAliases)).toHaveLength(1);
    const gavea = (await findMap(t.db, 'gavea'))!;
    const [g] = await t.db.select().from(mapRevisions).where(eq(mapRevisions.mapId, gavea.id));
    expect(g!.title).toBe('Gávea');
    const [casual] = await t.db.select().from(mapRotations).where(eq(mapRotations.key, 'casual'));
    expect(casual!.maps).toContain('gavea');
    expect(await t.db.select().from(mapRotations).where(eq(mapRotations.key, 'ranked'))).toHaveLength(0);
    const again = await importMaps(t.db, DIR, { ...opts, dryRun: false });
    expect(again.revisions.every((r) => !r.created) && again.created.every((r) => !r.created)).toBe(true);
    expect(await seedMaps(t.db, nativeMapsDir())).toEqual({ maps: 0, revisions: 0, matches: 0 }); // Mooca não volta
    expect((await t.db.select().from(maps)).length).toBe(29);
  });
});
