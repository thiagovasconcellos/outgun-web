// SPDX-License-Identifier: GPL-2.0-or-later
// Conta Steam e cartas no inventário Steam (OG-584/586, D-95), com a Steam falsa.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type App } from '../app.js';
import { loadConfig } from '../config.js';
import { migrateUp } from '../db/migrate.js';
import { cardSteamGrants, legendCards, userCards, users } from '../db/schema.js';
import { seed } from '../db/seed.js';
import { MemoryMailer } from '../mail/mailer.js';
import type { SteamApi } from '../steam-web-api.js';
import { createTestDatabase, pgAdminUrl, type TestDatabase } from '../test/db.js';

const ORIGIN = 'http://localhost:5173';
const STEAM_ID = '76561198000000001';

describe.skipIf(!pgAdminUrl)('conta Steam e inventário (OG-584/586)', () => {
  let t: TestDatabase;
  let app: App;
  let cookie = '';
  let me = '';
  const given: [string, number][] = [];
  let failNext = false;
  const steam: SteamApi = {
    authenticateTicket: async (hex) => (hex === 'aabbccddeeff0011' ? STEAM_ID : null),
    addItem: async (id, def) => {
      if (failNext) {
        failNext = false;
        throw new Error('steam fora');
      }
      given.push([id, def]);
      return `item-${def}`;
    },
  };
  beforeAll(async () => {
    t = await createTestDatabase();
    await migrateUp(t.sql);
    await seed(t.db);
    app = await buildApp({ config: { ...loadConfig({}), databaseUrl: t.url }, database: t, mailer: new MemoryMailer(), logger: false, steam });
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { username: 'Jogador1', password: 'outgun-dev' }, headers: { origin: ORIGIN } });
    cookie = `og_session=${res.cookies.find((c) => c.name === 'og_session')!.value}`;
    me = (await t.db.select().from(users).where(eq(users.username, 'Jogador1')))[0]!.id;
    const card = (nick: string, steamOn = true) => t.db.insert(legendCards).values({ slug: nick.toLowerCase(), nick, nickKey: nick, bio: 'x', class: 'classico', quote: 'q', ringColor: '#E02828', centerColor: '#00FF00', steam: steamOn }).returning();
    const [a] = await card('UM');
    const [b] = await card('DOIS', false);
    await t.db.insert(userCards).values([{ userId: me, cardId: a!.id, serial: 1 }, { userId: me, cardId: b!.id, serial: 1 }]);
  });
  afterAll(async () => {
    await app?.close();
    await t?.drop();
  });
  const call = (method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) => app.inject({ method, url, ...(payload ? { payload } : {}), headers: { origin: ORIGIN, cookie } });

  it('ticket inválido é recusado; válido liga e põe na fila só as cartas que vão para a Steam', async () => {
    expect((await call('POST', '/account/steam', { ticket: '0000000000000000' })).statusCode).toBe(403);
    const r = await call('POST', '/account/steam', { ticket: 'aabbccddeeff0011' });
    expect(r.json()).toMatchObject({ linked: true, steamId: STEAM_ID, cards: { done: 0, total: 1 } });
  });

  it('entrega com nova tentativa; o perfil mostra entregues', async () => {
    failNext = true;
    expect(await app.steamGrantsTick()).toEqual({ done: 0, failed: 1 });
    const [g] = await t.db.select().from(cardSteamGrants);
    expect(g!.attempts).toBe(1);
    expect(await app.steamGrantsTick(new Date(Date.now() + 120_000))).toEqual({ done: 1, failed: 0 });
    expect(given).toHaveLength(1);
    expect(given[0]![0]).toBe(STEAM_ID);
    expect((await call('GET', '/account/steam')).json().cards).toEqual({ done: 1, total: 1 });
  });

  it('desligar apaga o SteamID', async () => {
    expect((await call('DELETE', '/account/steam')).statusCode).toBe(204);
    expect((await call('GET', '/account/steam')).json()).toMatchObject({ linked: false, steamId: null });
  });
});
