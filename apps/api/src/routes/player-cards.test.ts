// SPDX-License-Identifier: GPL-2.0-or-later
// Coleção e página da carta (OG-578/579, RN-CRT-07): só aparece o que a pessoa tem.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type App } from '../app.js';
import { loadConfig } from '../config.js';
import { migrateUp } from '../db/migrate.js';
import { legendCards, userCards, users } from '../db/schema.js';
import { seed } from '../db/seed.js';
import { MemoryMailer } from '../mail/mailer.js';
import { createTestDatabase, pgAdminUrl, type TestDatabase } from '../test/db.js';

const ORIGIN = 'http://localhost:5173';

describe.skipIf(!pgAdminUrl)('coleção e página da carta (OG-578/579)', () => {
  let t: TestDatabase;
  let app: App;
  let cookie = '';
  let me = '';
  beforeAll(async () => {
    t = await createTestDatabase();
    await migrateUp(t.sql);
    await seed(t.db);
    app = await buildApp({ config: { ...loadConfig({}), databaseUrl: t.url }, database: t, mailer: new MemoryMailer(), logger: false });
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { username: 'Jogador1', password: 'outgun-dev' }, headers: { origin: ORIGIN } });
    cookie = `og_session=${res.cookies.find((c) => c.name === 'og_session')!.value}`;
    me = (await t.db.select().from(users).where(eq(users.username, 'Jogador1')))[0]!.id;
    const card = (nick: string, cls: string, linked: string | null = null) =>
      t.db.insert(legendCards).values({ slug: nick.toLowerCase(), nick, nickKey: nick, bio: 'Bio de ' + nick, class: cls, quote: 'q', ringColor: '#E02828', centerColor: '#00FF00', linkedUserId: linked, links: [{ nick: 'NIX' }, { nick: 'SPINAL' }] }).returning();
    const [slan] = await card('SLAN', 'especial', me);
    const [nix] = await card('NIX', 'lendario');
    await card('SPINAL', 'mitica');
    await t.db.insert(userCards).values([{ userId: me, cardId: slan!.id, serial: 0 }, { userId: me, cardId: nix!.id, serial: 7 }]);
  });
  afterAll(async () => {
    await app?.close();
    await t?.drop();
  });
  const get = (url: string, auth = true) => app.inject({ method: 'GET', url, headers: { origin: ORIGIN, ...(auth ? { cookie } : {}) } });

  it('perfil mostra só as cartas que a pessoa tem, a contagem e a carta da lenda', async () => {
    const r = (await get('/players/jogador1/cards', false)).json();
    expect(r.owned).toBe(2);
    expect(r.total).toBe(3);
    expect(r.cards.map((c: { nick: string }) => c.nick)).toEqual(['SLAN', 'NIX']);
    expect(JSON.stringify(r)).not.toContain('SPINAL');
    expect(r.legend.nick).toBe('SLAN');
    expect(r.classes.find((c: { class: string }) => c.class === 'mitica')).toEqual({ class: 'mitica', owned: 0, total: 1 });
    expect((await get('/cards/legends', false)).json().legends).toEqual([{ username: 'Jogador1', nick: 'SLAN', class: 'especial' }]);
  });

  it('imagem PNG pública da carta, sem ficha', async () => {
    const r = await get('/cards/spinal.png', false);
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toBe('image/png');
    expect(r.rawPayload.subarray(1, 4).toString()).toBe('PNG');
    expect((await get('/cards/nada.png', false)).statusCode).toBe(404);
  });

  it('página: quem tem lê tudo; quem não tem recebe 403 sem a ficha', async () => {
    const ok = (await get('/cards/slan')).json();
    expect(ok.card.bio).toBe('Bio de SLAN');
    expect(ok.mine.serial).toBe(0);
    expect(ok.links).toEqual([{ nick: 'NIX', slug: 'nix' }, { nick: 'SPINAL', slug: null }]);
    const no = await get('/cards/spinal');
    expect(no.statusCode).toBe(403);
    expect(no.body).not.toContain('Bio de SPINAL');
    expect((await get('/cards/slan', false)).statusCode).toBe(401);
  });
});
