// SPDX-License-Identifier: GPL-2.0-or-later
// Catálogo de mapas com revisões (OG-552, RN-MRV-01..03): semente, idempotência e imutabilidade.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateUp } from './db/migrate.js';
import { mapRevisions, maps, panelMaps, panelMapVersions } from './db/schema.js';
import { findMap, nativeMapsDir, playableMaps, seedMaps } from './map-catalog.js';
import { createTestDatabase, pgAdminUrl, type TestDatabase } from './test/db.js';

const PANEL = 'P width 1\nP height 1\nP title Teste\nP author Mod\nS 16 12\nspawn 0 0 0 8 6\nspawn 1 0 0 8 6\n';

describe.skipIf(!pgAdminUrl)('catálogo de mapas (OG-552)', () => {
  let t: TestDatabase;
  const dir = nativeMapsDir()!;

  beforeAll(async () => {
    t = await createTestDatabase();
    await migrateUp(t.sql);
    await t.db.insert(panelMaps).values({ name: 'Iron Man', text: PANEL, title: 'Teste', author: 'Mod', width: 1, height: 1, crc: 1, version: 1 });
    await t.db.insert(panelMapVersions).values({ name: 'Iron Man', version: 1, text: PANEL, crc: 1 });
  });
  afterAll(() => t?.drop());

  it('nativos com a revisão 1 = bytes de _legacy/maps; painel com suas versões', async () => {
    const first = await seedMaps(t.db, dir);
    expect(first.maps).toBe(21);
    const larhi = await findMap(t.db, 'LARHI');
    expect(larhi).toBeUndefined(); // chave não é alias: sem fusão por maiúsculas
    const mooca = (await findMap(t.db, 'mooca'))!;
    const [rev] = await t.db.select().from(mapRevisions).where(eq(mapRevisions.mapId, mooca.id));
    expect(rev!.number).toBe(1);
    expect(rev!.sha256).toBe(createHash('sha256').update(readFileSync(join(dir, 'mooca.txt'))).digest('hex'));
    expect((await playableMaps(t.db)).map((m) => m.name)).toContain('Iron Man');
  });

  it('rodar a semente de novo não cria nada', async () => {
    expect(await seedMaps(t.db, dir)).toEqual({ maps: 0, revisions: 0 });
    expect((await t.db.select().from(maps)).length).toBe(21);
  });

  it('revisão não muda de conteúdo nem se apaga', async () => {
    await expect(t.sql`UPDATE map_revisions SET text = 'x'`).rejects.toThrow(/immutable/);
    await expect(t.sql`DELETE FROM map_revisions`).rejects.toThrow(/never deleted/);
  });
});
