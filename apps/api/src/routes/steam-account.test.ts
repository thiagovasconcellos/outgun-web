// SPDX-License-Identifier: GPL-2.0-or-later
// Conta Steam e cartas no inventário Steam (OG-584/586, D-95), com a Steam falsa.
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type App } from '../app.js';
import { retryFailedSteamGrants } from '../card-steam-grants.js';
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
  let steamDown = false;
  const steam: SteamApi = {
    authenticateTicket: async (hex) => (hex === 'aabbccddeeff0011' ? STEAM_ID : null),
    addItem: async (id, def) => {
      if (steamDown) throw new Error('steam fora');
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

  // OG-587: uma carta nova na fila, e a Steam fora até esgotar as 8 tentativas. O nextAt vem no passado
  // porque o padrão usa o relógio do banco, que pode estar à frente do relógio do teste
  const exhaust = async (nick: string) => {
    const [c] = await t.db.insert(legendCards).values({ slug: nick.toLowerCase(), nick, nickKey: nick, bio: 'x', class: 'classico', quote: 'q', ringColor: '#E02828', centerColor: '#00FF00' }).returning();
    await t.db.insert(userCards).values({ userId: me, cardId: c!.id, serial: 1 });
    await t.db.insert(cardSteamGrants).values({ userId: me, cardId: c!.id, steamId: STEAM_ID, attempts: 7, nextAt: new Date(Date.now() - 1000) });
    steamDown = true;
    await app.steamGrantsTick();
    steamDown = false;
    const key = and(eq(cardSteamGrants.userId, me), eq(cardSteamGrants.cardId, c!.id));
    const grant = async () => (await t.db.select().from(cardSteamGrants).where(key))[0];
    expect(await grant()).toMatchObject({ status: 'failed', attempts: 8 });
    return grant;
  };
  const HOUR = 60 * 60_000;

  it('entrega que esgotou as tentativas descansa um dia e volta sozinha (OG-587)', async () => {
    const grant = await exhaust('TRES');
    expect(await app.steamGrantsTick(new Date(Date.now() + 23 * HOUR))).toEqual({ done: 0, failed: 0 });
    expect((await grant())!.status).toBe('failed');
    expect(await app.steamGrantsTick(new Date(Date.now() + 25 * HOUR))).toEqual({ done: 1, failed: 0 });
    expect(await grant()).toMatchObject({ status: 'done', attempts: 0, lastError: null });
  });

  it('a CLI e religar devolvem à fila na hora (OG-587)', async () => {
    const byCli = await exhaust('QUATRO');
    expect(await retryFailedSteamGrants(t.db, me)).toBe(1);
    expect(await app.steamGrantsTick()).toEqual({ done: 1, failed: 0 });
    expect((await byCli())!.status).toBe('done');

    const byLink = await exhaust('CINCO');
    expect((await call('POST', '/account/steam', { ticket: 'aabbccddeeff0011' })).statusCode).toBe(200);
    expect(await byLink()).toMatchObject({ status: 'pending', attempts: 0 });
    expect(await app.steamGrantsTick()).toEqual({ done: 1, failed: 0 });
  });

  it('nada vai para um SteamID que não está mais ligado à conta (OG-587)', async () => {
    const grant = await exhaust('SEIS');
    await t.db.update(cardSteamGrants).set({ steamId: '76561198000000002' }).where(and(eq(cardSteamGrants.userId, me), eq(cardSteamGrants.status, 'failed')));
    expect(await retryFailedSteamGrants(t.db)).toBe(0);
    expect(await app.steamGrantsTick(new Date(Date.now() + 25 * HOUR))).toEqual({ done: 0, failed: 0 });
    expect((await grant())!.status).toBe('failed');
    await t.db.update(cardSteamGrants).set({ steamId: STEAM_ID }).where(and(eq(cardSteamGrants.userId, me), eq(cardSteamGrants.status, 'failed')));
  });

  it('desligar apaga o SteamID e o que não foi entregue; os entregues ficam', async () => {
    const before = await t.db.select().from(cardSteamGrants).where(eq(cardSteamGrants.status, 'done'));
    expect(before.length).toBeGreaterThan(0);
    expect((await t.db.select().from(cardSteamGrants).where(eq(cardSteamGrants.status, 'failed'))).length).toBeGreaterThan(0);
    expect((await call('DELETE', '/account/steam')).statusCode).toBe(204);
    expect((await call('GET', '/account/steam')).json()).toMatchObject({ linked: false, steamId: null });
    const left = await t.db.select().from(cardSteamGrants);
    expect(left.every((g) => g.status === 'done')).toBe(true);
    expect(left).toHaveLength(before.length);
  });
});
