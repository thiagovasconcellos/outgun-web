// SPDX-License-Identifier: GPL-2.0-or-later
// Resgate semanal (OG-576, RN-CRT-04/05/06): semana de Brasília, 3 partidas liberam 2 resgates,
// sorteio pelo peso sem repetir, cópia nº 0 da lenda.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { claimCard, ClaimError, claimStatus, drawCard, weekKey, weekStart, type DrawCandidate } from './legend-card-claims.js';
import { migrateUp } from './db/migrate.js';
import { cardClassOdds, legendCards, matches, matchPlayers, userCards, users } from './db/schema.js';
import { seed } from './db/seed.js';
import { createTestDatabase, pgAdminUrl, type TestDatabase } from './test/db.js';

const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

describe('semana do resgate', () => {
  it('começa segunda 00:00 em Brasília (03:00 UTC)', () => {
    // domingo 23:59 em Brasília = segunda 02:59 UTC: ainda a semana anterior
    expect(weekKey(new Date('2026-11-16T02:59:00Z'))).toBe('2026-11-09');
    expect(weekKey(new Date('2026-11-16T03:00:00Z'))).toBe('2026-11-16');
    expect(weekStart(new Date('2026-11-12T15:00:00Z')).toISOString()).toBe('2026-11-09T03:00:00.000Z');
  });
});

describe('sorteio', () => {
  const W = { classico: 50, epico: 25, lendario: 13, especial: 8, nefasto: 3.5, mitica: 0.5 };
  it('segue os pesos e ignora classes sem candidata', () => {
    const cands: DrawCandidate[] = [
      ...Array.from({ length: 30 }, (_, i) => ({ id: i + 1, class: 'classico' as const })),
      ...Array.from({ length: 5 }, (_, i) => ({ id: 100 + i, class: 'especial' as const })),
    ];
    const rand = seeded(7);
    const n = { classico: 0, especial: 0 };
    for (let i = 0; i < 20000; i++) n[drawCard(cands, W, rand)!.class as 'classico' | 'especial']++;
    expect(n.especial / 20000).toBeCloseTo(8 / 58, 1);
  });
  it('sem candidata não sorteia; peso zero cai no uniforme', () => {
    expect(drawCard([], W, Math.random)).toBeNull();
    expect(drawCard([{ id: 9, class: 'mitica' }], { mitica: 0 }, () => 0.99)!.id).toBe(9);
  });
});

describe.skipIf(!pgAdminUrl)('resgate no banco (OG-576)', () => {
  let t: TestDatabase;
  let uid = '';
  let legend = '';
  const now = new Date('2026-11-12T15:00:00Z');
  const card = (nick: string, cls: string, linked: string | null = null) =>
    t.db.insert(legendCards).values({ slug: nick.toLowerCase(), nick, nickKey: nick, bio: 'x', class: cls, quote: 'x', ringColor: '#E02828', centerColor: '#00FF00', linkedUserId: linked }).returning({ id: legendCards.id });
  const play = async (userId: string, n: number, at = now) => {
    for (let i = 0; i < n; i++) {
      const [m] = await t.db.insert(matches).values({ serverId: 't', serverMatchId: `${userId}-${at.getTime()}-${i}`, mode: 'casual', ranked: false, map: 'x', redScore: 0, blueScore: 0, startedAt: at, endedAt: at }).returning();
      await t.db.insert(matchPlayers).values({ matchId: m!.id, slot: 0, userId, name: 'p', team: 0 });
    }
  };

  beforeAll(async () => {
    t = await createTestDatabase();
    await migrateUp(t.sql);
    await seed(t.db);
    const [a, b] = await t.db.select().from(users).limit(2);
    uid = a!.id;
    legend = b!.id;
    await card('UM', 'classico');
    await card('DOIS', 'classico');
    await card('TRES', 'epico', legend);
  });
  afterAll(async () => t?.drop());

  it('2 partidas não liberam; 3 liberam 2 resgates; o 3º é recusado; não repete', async () => {
    await play(uid, 2);
    expect((await claimStatus(t.db, uid, now)).available).toBe(0);
    await expect(claimCard(t.db, uid, 1, { now })).rejects.toEqual(new ClaimError('not_unlocked'));
    await play(uid, 1);
    expect((await claimStatus(t.db, uid, now)).available).toBe(2);
    const a = await claimCard(t.db, uid, 1, { now });
    expect((await claimCard(t.db, uid, 1, { now })).cardId).toBe(a.cardId); // duplo clique
    const b = await claimCard(t.db, uid, 2, { now });
    expect(b.cardId).not.toBe(a.cardId);
    await expect(claimCard(t.db, uid, 2 + 1, { now })).rejects.toBeInstanceOf(ClaimError);
    expect((await claimStatus(t.db, uid, now)).available).toBe(0);
    expect(a.serial).toBe(1);
  });

  it('semana seguinte zera; a lenda recebe a própria carta com a cópia nº 0', async () => {
    const next = new Date('2026-11-17T15:00:00Z');
    await t.db.update(cardClassOdds).set({ weight: 0 }).where(eq(cardClassOdds.class, 'classico'));
    await play(legend, 3, next);
    const r = await claimCard(t.db, legend, 1, { now: next, rand: () => 0 });
    expect(r).toMatchObject({ own: true, serial: 0 });
    const [uc] = await t.db.select().from(userCards).where(eq(userCards.userId, legend));
    expect(uc!.serial).toBe(0);
  });
});
