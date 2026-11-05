// SPDX-License-Identifier: GPL-2.0-or-later
// Cartas de Jogador no painel (OG-571, D-94, RN-CRT-02/03/05): qualquer moderador ou admin cria e
// edita; salvar publica na hora e cada gravação vira uma revisão (cópia da ficha) e uma linha na
// auditoria. Desativar tira a carta do sorteio sem tirar de quem já tem. Gerações: só admin.
import { Type, type FastifyPluginAsyncTypebox, type Static } from '@fastify/type-provider-typebox';
import {
  CARD_CLASS_IDS,
  CARD_LIMITS,
  cardFilledFields,
  cardNickKey,
  cardSlug,
  legendCardProblems,
  type CardClassId,
  type LegendCardInput,
} from '@outgun/protocol';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppDeps, Services } from '../app.js';
import type { SessionUser } from '../auth/sessions.js';
import { usernameKey } from '../db/keys.js';
import { adminActions, cardClassOdds, cardGenerations, legendCardRevisions, legendCards, userCards, users } from '../db/schema.js';
import { hasRole, type Role } from './admin.js';
import { ErrorSchema } from './schemas.js';
import { likePrefix } from './social.js';

const L = CARD_LIMITS;
const Entry = Type.Object({ icon: Type.String({ maxLength: 20 }), title: Type.String({ maxLength: L.entryTitle }), text: Type.String({ maxLength: L.entryText }) });
export const LegendCardBody = Type.Object({
  nick: Type.String({ maxLength: L.nick }),
  epithet: Type.String({ maxLength: L.epithet }),
  position: Type.String({ maxLength: L.position }),
  bio: Type.String({ maxLength: L.bio }),
  class: Type.Union(CARD_CLASS_IDS.map((c) => Type.Literal(c))),
  generations: Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 12 }),
  clans: Type.Array(Type.String({ maxLength: L.clan }), { maxItems: L.clans }),
  achievements: Type.Array(Entry, { maxItems: L.entries }),
  traits: Type.Array(Entry, { maxItems: L.entries }),
  abilities: Type.Array(Entry, { maxItems: L.entries }),
  quote: Type.String({ maxLength: L.quote }),
  memory: Type.String({ maxLength: L.memory }),
  ringColor: Type.String({ maxLength: 7 }),
  centerColor: Type.String({ maxLength: 7 }),
  linkedUserId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  links: Type.Array(Type.Object({ nick: Type.String({ maxLength: L.nick }), cardId: Type.Optional(Type.Integer({ minimum: 1 })) }), { maxItems: L.links }),
  sources: Type.String({ maxLength: L.sources }),
});
type Body = Static<typeof LegendCardBody>;
const CardId = Type.Object({ id: Type.Integer({ minimum: 1 }) });

type CardRow = typeof legendCards.$inferSelect;

/** A ficha de uma linha, no formato do painel (e da cópia de cada revisão). */
export function cardInput(r: CardRow): LegendCardInput {
  return {
    nick: r.nick,
    epithet: r.epithet,
    position: r.position,
    bio: r.bio,
    class: r.class as CardClassId,
    generations: r.generations,
    clans: r.clans,
    achievements: r.achievements,
    traits: r.traits,
    abilities: r.abilities,
    quote: r.quote,
    memory: r.memory,
    ringColor: r.ringColor,
    centerColor: r.centerColor,
    linkedUserId: r.linkedUserId,
    links: r.links,
    sources: r.sources,
  };
}

/** Normaliza a ficha recebida: espaços nas pontas, nick em maiúsculas, listas sem itens vazios. */
export function cleanCard(b: Body): LegendCardInput {
  const entries = (list: Body['achievements']) => list.map((e) => ({ icon: e.icon, title: e.title.trim(), text: e.text.trim() })).filter((e) => e.title);
  return {
    nick: b.nick.trim().toUpperCase(),
    epithet: b.epithet.trim(),
    position: b.position.trim(),
    bio: b.bio.replace(/\r\n/g, '\n').trim(),
    class: b.class,
    generations: [...new Set(b.generations)],
    clans: b.clans.map((c) => c.trim()).filter(Boolean),
    achievements: entries(b.achievements),
    traits: entries(b.traits),
    abilities: entries(b.abilities),
    quote: b.quote.trim(),
    memory: b.memory.trim(),
    ringColor: b.ringColor.toUpperCase(),
    centerColor: b.centerColor.toUpperCase(),
    linkedUserId: b.linkedUserId,
    links: b.links.map((l) => ({ nick: l.nick.trim().toUpperCase(), ...(l.cardId ? { cardId: l.cardId } : {}) })).filter((l) => l.nick),
    sources: b.sources.trim(),
  };
}

const lev = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
};
/** Nick parecido (aviso, não bloqueia): um começa com o outro, ou uma letra de diferença. */
export function similarNick(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3 || a === b) return false;
  return a.startsWith(b) || b.startsWith(a) || lev(a, b) <= 1;
}

class CardError extends Error {
  constructor(readonly status: number, readonly code: string, message = code) {
    super(message);
  }
}

export function legendCardAdminRoutes(deps: AppDeps, services: Services): FastifyPluginAsyncTypebox {
  const { db } = deps.database;

  async function guard(request: FastifyRequest, reply: FastifyReply, role: Role): Promise<SessionUser | undefined> {
    const user = await services.sessions.current(request);
    if (!user) {
      void reply.code(401).send({ error: 'unauthorized', message: 'sign in first' });
      return undefined;
    }
    if (!hasRole(user, role)) {
      void reply.code(403).send({ error: 'forbidden', message: `${role} only` });
      return undefined;
    }
    return user;
  }
  const audit = (actor: SessionUser, action: string, reason: string, details: Record<string, unknown>) =>
    db.insert(adminActions).values({ actorUserId: actor.id, actorName: actor.username, action, reason, details: { via: 'painel', ...details } });

  /** Confere a ficha (validação compartilhada, gerações e conta existentes). */
  async function check(card: LegendCardInput): Promise<void> {
    const problems = legendCardProblems(card);
    if (problems.length) throw new CardError(400, 'invalid_card', problems.join(','));
    if (card.generations.length) {
      const known = new Set((await db.select({ id: cardGenerations.id }).from(cardGenerations)).map((g) => g.id));
      if (!card.generations.every((g) => known.has(g))) throw new CardError(400, 'invalid_card', 'generations');
    }
    if (card.linkedUserId) {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, card.linkedUserId));
      if (!u) throw new CardError(400, 'invalid_card', 'linkedUserId');
    }
  }
  /** Erro de unicidade do Postgres → 409 com o motivo. */
  function unique(e: unknown): CardError | undefined {
    const err = ((e as { cause?: { code?: string; constraint_name?: string } })?.cause ?? e) as { code?: string; constraint_name?: string };
    if (err?.code !== '23505') return undefined;
    const name = err.constraint_name ?? '';
    if (name.includes('linked')) return new CardError(409, 'linked_taken', 'this account is already linked to another card');
    return new CardError(409, 'nick_taken', 'there is already a card for this nick');
  }
  async function freeSlug(nick: string, selfId?: number): Promise<string> {
    const base = cardSlug(nick);
    for (let i = 1; ; i++) {
      const slug = i === 1 ? base : `${base}-${i}`;
      const [hit] = await db.select({ id: legendCards.id }).from(legendCards).where(eq(legendCards.slug, slug));
      if (!hit || hit.id === selfId) return slug;
    }
  }
  const send = (reply: FastifyReply, e: unknown) => {
    const err = e instanceof CardError ? e : unique(e);
    if (!err) throw e;
    return reply.code(err.status).send({ error: err.code, message: err.message });
  };

  return async (app) => {
    app.addHook('onSend', async (_request, reply) => {
      reply.header('cache-control', 'no-store');
    });

    app.get(
      '/cards',
      {
        schema: {
          tags: ['admin'],
          summary: 'Catálogo das Cartas de Jogador (OG-571): busca por nick, epíteto ou clã; filtros de classe, geração e ativa',
          querystring: Type.Object({
            q: Type.Optional(Type.String({ maxLength: 40 })),
            class: Type.Optional(Type.Union(CARD_CLASS_IDS.map((c) => Type.Literal(c)))),
            generation: Type.Optional(Type.Integer({ minimum: 1 })),
            active: Type.Optional(Type.Boolean()),
          }),
        },
      },
      async (request, reply) => {
        if (!(await guard(request, reply, 'moderator'))) return reply;
        const { q, class: cls, generation, active } = request.query;
        const conds = [];
        if (cls) conds.push(eq(legendCards.class, cls));
        if (generation) conds.push(sql`${generation} = ANY(${legendCards.generations})`);
        if (active !== undefined) conds.push(eq(legendCards.active, active));
        if (q?.trim()) {
          const t = `%${q.trim().toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
          conds.push(sql`(lower(${legendCards.nick}) LIKE ${t} OR lower(${legendCards.epithet}) LIKE ${t} OR EXISTS (SELECT 1 FROM unnest(${legendCards.clans}) c WHERE lower(c) LIKE ${t}))`);
        }
        const rows = await db
          .select({ card: legendCards, updatedByName: users.username })
          .from(legendCards)
          .leftJoin(users, eq(users.id, legendCards.updatedBy))
          .where(conds.length ? and(...conds) : undefined)
          .orderBy(asc(legendCards.nickKey));
        const owners = new Map((await db.select({ cardId: userCards.cardId, n: count() }).from(userCards).groupBy(userCards.cardId)).map((r) => [r.cardId, Number(r.n)]));
        const all = await db.select({ class: legendCards.class, active: legendCards.active, n: count() }).from(legendCards).groupBy(legendCards.class, legendCards.active);
        return {
          cards: rows.map(({ card: c, updatedByName }) => ({
            id: c.id,
            slug: c.slug,
            nick: c.nick,
            epithet: c.epithet,
            position: c.position,
            class: c.class,
            generations: c.generations,
            clans: c.clans,
            ringColor: c.ringColor,
            centerColor: c.centerColor,
            active: c.active,
            filled: cardFilledFields(cardInput(c)),
            owners: owners.get(c.id) ?? 0,
            revision: c.revision,
            updatedAt: c.updatedAt.toISOString(),
            updatedBy: updatedByName ?? null,
          })),
          // contadores do catálogo inteiro, sem os filtros
          totals: all.map((r) => ({ class: r.class, active: r.active, count: Number(r.n) })),
        };
      },
    );

    app.get('/cards/positions', { schema: { tags: ['admin'], summary: 'Posições já usadas nas fichas, para sugerir no formulário (P11)' } }, async (request, reply) => {
      if (!(await guard(request, reply, 'moderator'))) return reply;
      const rows = await db.selectDistinct({ position: legendCards.position }).from(legendCards).where(sql`${legendCards.position} <> ''`).orderBy(asc(legendCards.position));
      return { positions: rows.map((r) => r.position) };
    });

    app.get(
      '/cards/similar',
      { schema: { tags: ['admin'], summary: 'Nick igual (bloqueia) ou parecido (aviso) com uma carta já cadastrada', querystring: Type.Object({ nick: Type.String({ maxLength: L.nick }), except: Type.Optional(Type.Integer({ minimum: 1 })) }) } },
      async (request, reply) => {
        if (!(await guard(request, reply, 'moderator'))) return reply;
        const key = cardNickKey(request.query.nick);
        const rows = (await db.select({ id: legendCards.id, nick: legendCards.nick, nickKey: legendCards.nickKey, active: legendCards.active }).from(legendCards)).filter((r) => r.id !== request.query.except);
        const pick = (r: (typeof rows)[number]) => ({ id: r.id, nick: r.nick, active: r.active });
        const same = key ? rows.find((r) => r.nickKey === key) : undefined;
        return { same: same ? pick(same) : null, similar: key ? rows.filter((r) => similarNick(key, r.nickKey)).map(pick) : [] };
      },
    );

    app.get(
      '/cards/accounts',
      { schema: { tags: ['admin'], summary: 'Busca de contas para ligar à carta (P13)', querystring: Type.Object({ q: Type.String({ minLength: 1, maxLength: 15 }) }) } },
      async (request, reply) => {
        if (!(await guard(request, reply, 'moderator'))) return reply;
        const rows = await db
          .select({ id: users.id, username: users.username, cardId: legendCards.id, cardNick: legendCards.nick })
          .from(users)
          .leftJoin(legendCards, eq(legendCards.linkedUserId, users.id))
          .where(sql`${users.usernameKey} LIKE ${likePrefix(usernameKey(request.query.q))}`)
          .orderBy(asc(users.usernameKey))
          .limit(10);
        return { accounts: rows.map((r) => ({ id: r.id, username: r.username, linkedCard: r.cardId ? { id: r.cardId, nick: r.cardNick } : null })) };
      },
    );

    app.get('/cards/:id', { schema: { tags: ['admin'], summary: 'Ficha de uma carta com o histórico de revisões', params: CardId } }, async (request, reply) => {
      if (!(await guard(request, reply, 'moderator'))) return reply;
      const [c] = await db.select().from(legendCards).where(eq(legendCards.id, request.params.id));
      if (!c) return reply.code(404).send({ error: 'not_found', message: 'no such card' });
      const revs = await db
        .select({ number: legendCardRevisions.number, data: legendCardRevisions.data, note: legendCardRevisions.note, editedAt: legendCardRevisions.editedAt, editedBy: users.username })
        .from(legendCardRevisions)
        .leftJoin(users, eq(users.id, legendCardRevisions.editedBy))
        .where(eq(legendCardRevisions.cardId, c.id))
        .orderBy(desc(legendCardRevisions.number));
      const name = async (id: string | null) => (id ? ((await db.select({ u: users.username }).from(users).where(eq(users.id, id)))[0]?.u ?? null) : null);
      const [owners] = await db.select({ n: count() }).from(userCards).where(eq(userCards.cardId, c.id));
      return {
        card: {
          id: c.id,
          slug: c.slug,
          active: c.active,
          revision: c.revision,
          ...cardInput(c),
          linkedUsername: await name(c.linkedUserId),
          createdBy: await name(c.createdBy),
          createdAt: c.createdAt.toISOString(),
          updatedBy: await name(c.updatedBy),
          updatedAt: c.updatedAt.toISOString(),
          owners: Number(owners?.n ?? 0),
        },
        revisions: revs.map((r) => ({ number: r.number, data: r.data, note: r.note, editedAt: r.editedAt.toISOString(), editedBy: r.editedBy ?? null })),
      };
    });

    app.post(
      '/cards',
      { schema: { tags: ['admin'], summary: 'Cria uma carta: salvar publica na hora (P8, P19) e grava a revisão 1', body: LegendCardBody, response: { 201: Type.Object({ id: Type.Integer(), slug: Type.String(), revision: Type.Integer() }), 400: ErrorSchema, 409: ErrorSchema } } },
      async (request, reply) => {
        const user = await guard(request, reply, 'moderator');
        if (!user) return reply;
        try {
          const card = cleanCard(request.body);
          await check(card);
          const slug = await freeSlug(card.nick);
          const id = await db.transaction(async (tx) => {
            const [row] = await tx
              .insert(legendCards)
              .values({ ...card, slug, nickKey: cardNickKey(card.nick), createdBy: user.id, updatedBy: user.id })
              .returning({ id: legendCards.id });
            await tx.insert(legendCardRevisions).values({ cardId: row!.id, number: 1, data: { ...card }, note: 'Carta criada', editedBy: user.id });
            return row!.id;
          });
          await audit(user, 'card-create', card.nick, { card: id, class: card.class });
          return reply.code(201).send({ id, slug, revision: 1 });
        } catch (e) {
          return send(reply, e);
        }
      },
    );

    app.put(
      '/cards/:id',
      { schema: { tags: ['admin'], summary: 'Grava a ficha: vale na hora e cria uma revisão nova (sem mudança, nada acontece)', params: CardId, body: Type.Object({ card: LegendCardBody, note: Type.Optional(Type.String({ maxLength: 200 })) }) } },
      async (request, reply) => {
        const user = await guard(request, reply, 'moderator');
        if (!user) return reply;
        try {
          const card = cleanCard(request.body.card);
          await check(card);
          const [cur] = await db.select().from(legendCards).where(eq(legendCards.id, request.params.id));
          if (!cur) return reply.code(404).send({ error: 'not_found', message: 'no such card' });
          if (JSON.stringify(cardInput(cur)) === JSON.stringify(card)) return { id: cur.id, slug: cur.slug, revision: cur.revision, changed: false };
          const slug = card.nick === cur.nick ? cur.slug : await freeSlug(card.nick, cur.id);
          const revision = cur.revision + 1;
          await db.transaction(async (tx) => {
            await tx
              .update(legendCards)
              .set({ ...card, slug, nickKey: cardNickKey(card.nick), revision, updatedBy: user.id, updatedAt: new Date() })
              .where(eq(legendCards.id, cur.id));
            await tx.insert(legendCardRevisions).values({ cardId: cur.id, number: revision, data: { ...card }, note: request.body.note?.trim() ?? '', editedBy: user.id });
          });
          await audit(user, 'card-edit', card.nick, { card: cur.id, revision });
          return { id: cur.id, slug, revision, changed: true };
        } catch (e) {
          return send(reply, e);
        }
      },
    );

    app.put(
      '/cards/:id/active',
      { schema: { tags: ['admin'], summary: 'Desativa ou reativa a carta: desativada sai do sorteio e fica com quem já tem (RN-CRT-02)', params: CardId, body: Type.Object({ active: Type.Boolean() }) } },
      async (request, reply) => {
        const user = await guard(request, reply, 'moderator');
        if (!user) return reply;
        const [c] = await db.update(legendCards).set({ active: request.body.active, updatedBy: user.id, updatedAt: new Date() }).where(eq(legendCards.id, request.params.id)).returning({ nick: legendCards.nick });
        if (!c) return reply.code(404).send({ error: 'not_found', message: 'no such card' });
        await audit(user, request.body.active ? 'card-activate' : 'card-deactivate', c.nick, { card: request.params.id });
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/cards/:id/restore',
      { schema: { tags: ['admin'], summary: 'Volta a ficha a uma revisão antiga, gravando uma revisão nova', params: CardId, body: Type.Object({ revision: Type.Integer({ minimum: 1 }) }) } },
      async (request, reply) => {
        const user = await guard(request, reply, 'moderator');
        if (!user) return reply;
        const [cur] = await db.select().from(legendCards).where(eq(legendCards.id, request.params.id));
        const [old] = cur ? await db.select().from(legendCardRevisions).where(and(eq(legendCardRevisions.cardId, cur.id), eq(legendCardRevisions.number, request.body.revision))) : [];
        if (!cur || !old) return reply.code(404).send({ error: 'not_found', message: 'no such revision' });
        try {
          const card = cleanCard({ ...cardInput(cur), ...(old.data as Partial<Body>) } as Body);
          await check(card);
          const revision = cur.revision + 1;
          const slug = card.nick === cur.nick ? cur.slug : await freeSlug(card.nick, cur.id);
          await db.transaction(async (tx) => {
            await tx.update(legendCards).set({ ...card, slug, nickKey: cardNickKey(card.nick), revision, updatedBy: user.id, updatedAt: new Date() }).where(eq(legendCards.id, cur.id));
            await tx.insert(legendCardRevisions).values({ cardId: cur.id, number: revision, data: { ...card }, note: `Volta à revisão ${old.number}`, editedBy: user.id });
          });
          await audit(user, 'card-restore', card.nick, { card: cur.id, revision, from: old.number });
          return { id: cur.id, slug, revision };
        } catch (e) {
          return send(reply, e);
        }
      },
    );

    // --- chances por classe (P2): moderador e admin ---
    app.get('/card-odds', { schema: { tags: ['admin'], summary: 'Peso de cada classe no sorteio e cartas ativas por classe' } }, async (request, reply) => {
      if (!(await guard(request, reply, 'moderator'))) return reply;
      const weights = await db.select().from(cardClassOdds);
      const active = await db.select({ class: legendCards.class, n: count() }).from(legendCards).where(eq(legendCards.active, true)).groupBy(legendCards.class);
      return {
        classes: CARD_CLASS_IDS.map((id) => ({
          class: id,
          weight: Number(weights.find((w) => w.class === id)?.weight ?? 0),
          activeCards: Number(active.find((a) => a.class === id)?.n ?? 0),
        })),
      };
    });
    app.put(
      '/card-odds',
      { schema: { tags: ['admin'], summary: 'Muda os pesos das classes; vale no próximo resgate', body: Type.Object({ weights: Type.Record(Type.String(), Type.Number({ minimum: 0, maximum: 1000 })) }) } },
      async (request, reply) => {
        const user = await guard(request, reply, 'moderator');
        if (!user) return reply;
        const entries = Object.entries(request.body.weights).filter(([k]) => (CARD_CLASS_IDS as string[]).includes(k));
        if (!entries.length || entries.every(([, w]) => w === 0)) return reply.code(400).send({ error: 'invalid_odds', message: 'at least one class needs weight' });
        await db.transaction(async (tx) => {
          for (const [cls, weight] of entries) {
            await tx
              .insert(cardClassOdds)
              .values({ class: cls, weight: Math.round(weight * 100) / 100, updatedBy: user.id })
              .onConflictDoUpdate({ target: cardClassOdds.class, set: { weight: Math.round(weight * 100) / 100, updatedBy: user.id, updatedAt: new Date() } });
          }
        });
        await audit(user, 'card-odds', '', { weights: Object.fromEntries(entries) });
        return reply.code(204).send(null);
      },
    );

    // --- gerações (P10): leitura para moderador, mudança só admin ---
    app.get('/card-generations', { schema: { tags: ['admin'], summary: 'Gerações das cartas, com quantas cartas usam cada uma' } }, async (request, reply) => {
      if (!(await guard(request, reply, 'moderator'))) return reply;
      const gens = await db.select().from(cardGenerations).orderBy(asc(cardGenerations.ord), asc(cardGenerations.id));
      const used = await db.execute<{ g: number; n: string }>(sql`SELECT g, count(*) AS n FROM legend_cards, unnest(generations) g GROUP BY g`);
      const usage = new Map([...used].map((r) => [Number(r.g), Number(r.n)]));
      return { generations: gens.map((g) => ({ ...g, cards: usage.get(g.id) ?? 0 })) };
    });
    const GenBody = Type.Object({ name: Type.String({ minLength: 1, maxLength: 40 }), description: Type.String({ maxLength: 120 }), ord: Type.Integer({ minimum: 0, maximum: 999 }), active: Type.Boolean() });
    app.post('/card-generations', { schema: { tags: ['admin'], summary: 'Cria uma geração (só admin)', body: GenBody } }, async (request, reply) => {
      const user = await guard(request, reply, 'admin');
      if (!user) return reply;
      const b = request.body;
      const [g] = await db.insert(cardGenerations).values({ name: b.name.trim(), description: b.description.trim(), ord: b.ord, active: b.active }).returning();
      await audit(user, 'card-generation', g!.name, { generation: g!.id });
      return reply.code(201).send(g);
    });
    app.put('/card-generations/:id', { schema: { tags: ['admin'], summary: 'Renomeia, reordena, ativa ou desativa uma geração (só admin)', params: CardId, body: GenBody } }, async (request, reply) => {
      const user = await guard(request, reply, 'admin');
      if (!user) return reply;
      const b = request.body;
      const [g] = await db.update(cardGenerations).set({ name: b.name.trim(), description: b.description.trim(), ord: b.ord, active: b.active }).where(eq(cardGenerations.id, request.params.id)).returning();
      if (!g) return reply.code(404).send({ error: 'not_found', message: 'no such generation' });
      await audit(user, 'card-generation', g.name, { generation: g.id, active: g.active });
      return g;
    });

  };
}
