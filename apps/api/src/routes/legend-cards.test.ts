// SPDX-License-Identifier: GPL-2.0-or-later
// Cartas de Jogador no painel (OG-571, D-94): moderador cria e edita (salvar publica), revisões,
// desativar, nick igual/parecido, chances e gerações (só admin muda).
import { desc, eq } from 'drizzle-orm';
import { CARD_CENTER_COLORS, CARD_RING_COLORS } from '@outgun/protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type App } from '../app.js';
import { loadConfig } from '../config.js';
import { migrateUp } from '../db/migrate.js';
import { adminActions, users } from '../db/schema.js';
import { seed } from '../db/seed.js';
import { MemoryMailer } from '../mail/mailer.js';
import { createTestDatabase, pgAdminUrl, type TestDatabase } from '../test/db.js';
import { similarNick } from './legend-cards.js';

const ORIGIN = 'http://localhost:5173';
const ficha = (o: Record<string, unknown> = {}) => ({
  nick: 'slan', epithet: '', position: 'Híbrido', bio: 'Primeiro parágrafo.\n\nSegundo.', class: 'especial', generations: [1, 2], clans: ['MK', 'Ek'],
  achievements: [{ icon: 'medalha', title: 'Campeão do CBDO', text: 'Pelo Ek.' }], traits: [], abilities: [], quote: 'No The Blunt, o temperamento forte virou título.',
  memory: '', ringColor: CARD_RING_COLORS[0], centerColor: CARD_CENTER_COLORS[1], linkedUserId: null, links: [], sources: 'grupo', ...o,
});

it('nick parecido: prefixo ou uma letra de diferença', () => {
  expect(similarNick('JARU', 'JARULE')).toBe(true);
  expect(similarNick('SLAN', 'SLAM')).toBe(true);
  expect(similarNick('NIX', 'SLAN')).toBe(false);
  expect(similarNick('AB', 'ABC')).toBe(false);
});

describe.skipIf(!pgAdminUrl)('cartas de jogador no painel (OG-571)', () => {
  let t: TestDatabase;
  let app: App;
  const cookies: Record<'admin' | 'mod' | 'player', string> = { admin: '', mod: '', player: '' };
  const login = async (username: string) => {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { username, password: 'outgun-dev' }, headers: { origin: ORIGIN }, remoteAddress: `10.9.1.${username.length}` });
    return `og_session=${res.cookies.find((c) => c.name === 'og_session')!.value}`;
  };
  const call = (method: 'GET' | 'POST' | 'PUT', url: string, who?: keyof typeof cookies, payload?: unknown) =>
    app.inject({ method, url, ...(payload !== undefined ? { payload: payload as object } : {}), headers: { origin: ORIGIN, ...(who ? { cookie: cookies[who] } : {}) } });

  beforeAll(async () => {
    t = await createTestDatabase();
    await migrateUp(t.sql);
    await seed(t.db);
    await t.db.update(users).set({ isModerator: true }).where(eq(users.username, 'Jogador2'));
    app = await buildApp({ config: { ...loadConfig({}), databaseUrl: t.url }, database: t, mailer: new MemoryMailer(), logger: false });
    cookies.admin = await login('Admin');
    cookies.mod = await login('Jogador2');
    cookies.player = await login('Jogador1');
  });
  afterAll(async () => {
    await app?.close();
    await t?.drop();
  });

  it('jogador comum não entra', async () => {
    expect((await call('GET', '/admin/cards', 'player')).statusCode).toBe(403);
    expect((await call('POST', '/admin/cards', 'player', ficha())).statusCode).toBe(403);
    expect((await call('GET', '/admin/cards')).statusCode).toBe(401);
  });

  it('moderador cria (publica na hora), edita com revisão e o histórico guarda a anterior', async () => {
    const res = await call('POST', '/admin/cards', 'mod', ficha());
    expect(res.statusCode).toBe(201);
    const { id, slug } = res.json();
    expect(slug).toBe('slan');
    const list = (await call('GET', '/admin/cards?q=ek', 'mod')).json();
    expect(list.cards.map((c: { nick: string; active: boolean }) => [c.nick, c.active])).toEqual([['SLAN', true]]);
    // sem mudança: nada acontece
    expect((await call('PUT', `/admin/cards/${id}`, 'mod', { card: ficha() })).json()).toMatchObject({ revision: 1, changed: false });
    expect((await call('PUT', `/admin/cards/${id}`, 'mod', { card: ficha({ quote: 'Outra frase.' }), note: 'frase' })).json()).toMatchObject({ revision: 2, changed: true });
    const detail = (await call('GET', `/admin/cards/${id}`, 'mod')).json();
    expect(detail.card.quote).toBe('Outra frase.');
    expect(detail.revisions.map((r: { number: number }) => r.number)).toEqual([2, 1]);
    expect(detail.revisions[1].data.quote).toBe('No The Blunt, o temperamento forte virou título.');
    expect((await call('POST', `/admin/cards/${id}/restore`, 'mod', { revision: 1 })).json().revision).toBe(3);
    expect((await call('GET', `/admin/cards/${id}`, 'mod')).json().card.quote).toBe('No The Blunt, o temperamento forte virou título.');
    const [a] = await t.db.select().from(adminActions).orderBy(desc(adminActions.id)).limit(1);
    expect(a!.action).toBe('card-restore');
  });

  it('nick igual é recusado e parecido vira aviso; ficha inválida dá 400', async () => {
    expect((await call('POST', '/admin/cards', 'mod', ficha({ nick: 'S-LAN' }))).json().error).toBe('nick_taken');
    expect((await call('GET', '/admin/cards/similar?nick=slam', 'mod')).json()).toMatchObject({ same: null, similar: [{ nick: 'SLAN' }] });
    expect((await call('GET', '/admin/cards/similar?nick=Slan', 'mod')).json().same.nick).toBe('SLAN');
    const bad = await call('POST', '/admin/cards', 'mod', ficha({ nick: 'NIX', quote: '', ringColor: '#123456' }));
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toBe('quote,ringColor');
    expect((await call('POST', '/admin/cards', 'mod', ficha({ nick: 'NIX', generations: [99] }))).json().message).toBe('generations');
  });

  it('desativar tira do catálogo ativo; posições sugeridas', async () => {
    const id = (await call('POST', '/admin/cards', 'mod', ficha({ nick: 'NIX', position: 'Desenvolvedor', class: 'lendario' }))).json().id;
    expect((await call('PUT', `/admin/cards/${id}/active`, 'mod', { active: false })).statusCode).toBe(204);
    expect((await call('GET', '/admin/cards?active=true', 'mod')).json().cards.map((c: { nick: string }) => c.nick)).toEqual(['SLAN']);
    expect((await call('GET', '/admin/cards/positions', 'mod')).json().positions).toEqual(['Desenvolvedor', 'Híbrido']);
  });

  it('conta vinculada a uma carta só', async () => {
    const [u] = await t.db.select().from(users).where(eq(users.username, 'Jogador1'));
    expect((await call('POST', '/admin/cards', 'mod', ficha({ nick: 'JARU', linkedUserId: u!.id }))).statusCode).toBe(201);
    expect((await call('POST', '/admin/cards', 'mod', ficha({ nick: 'FROGUE', linkedUserId: u!.id }))).json().error).toBe('linked_taken');
    expect((await call('GET', '/admin/cards/accounts?q=jogador1', 'mod')).json().accounts[0].linkedCard.nick).toBe('JARU');
  });

  it('chances: moderador muda; gerações: só admin muda', async () => {
    expect((await call('PUT', '/admin/card-odds', 'mod', { weights: { nefasto: 2 } })).statusCode).toBe(204);
    const odds = (await call('GET', '/admin/card-odds', 'mod')).json().classes;
    expect(odds.find((c: { class: string }) => c.class === 'nefasto').weight).toBe(2);
    expect((await call('PUT', '/admin/card-odds', 'mod', { weights: { classico: 0 } })).statusCode).toBe(204);
    const gens = (await call('GET', '/admin/card-generations', 'mod')).json().generations;
    expect(gens.map((g: { description: string }) => g.description)).toEqual(['Outgun 0.5', 'Outgun 1.0', 'Outgun hospedado por jogadores', 'Outgun Web']);
    expect(gens[0].cards).toBeGreaterThan(0);
    const g = { name: '5ª geração', description: 'Futuro', ord: 5, active: true };
    expect((await call('POST', '/admin/card-generations', 'mod', g)).statusCode).toBe(403);
    expect((await call('POST', '/admin/card-generations', 'admin', g)).statusCode).toBe(201);
  });
});
