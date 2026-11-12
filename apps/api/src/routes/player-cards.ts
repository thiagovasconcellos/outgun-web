// SPDX-License-Identifier: GPL-2.0-or-later
// Cartas de Jogador para o jogador (D-94): resgate semanal (OG-576), coleção no perfil (OG-578) e
// página da carta, só para quem a tem (OG-579). Nada da ficha de uma carta não descoberta sai daqui
// (RN-CRT-07).
import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { CARD_CLASS_IDS, cardChance, cardClass, type CardClassId } from '@outgun/protocol';
import type { AppDeps, Services } from '../app.js';
import { EMAIL_NOT_VERIFIED, emailBlocked } from '../auth/sessions.js';
import { claimCard, ClaimError, claimStatus } from '../legend-card-claims.js';
import { cardPng } from '../legend-card-png-cache.js';
import { cardClassOdds, cardGenerations, legendCards, userCards, users } from '../db/schema.js';
import { usernameKey } from '../db/keys.js';
import { ErrorSchema } from './schemas.js';

/** O que a frente da carta precisa (sem a ficha). */
export const CardFace = Type.Object({
  id: Type.Integer(),
  slug: Type.String(),
  nick: Type.String(),
  class: Type.String(),
  ringColor: Type.String(),
  centerColor: Type.String(),
});
export const faceOf = (c: typeof legendCards.$inferSelect) => ({ id: c.id, slug: c.slug, nick: c.nick, class: c.class, ringColor: c.ringColor, centerColor: c.centerColor });

const ClaimStatusSchema = Type.Object({
  week: Type.String(),
  matches: Type.Integer(),
  matchesNeeded: Type.Integer(),
  unlocked: Type.Boolean(),
  used: Type.Integer(),
  available: Type.Integer(),
  perWeek: Type.Integer(),
  nextWeekAt: Type.String(),
  remaining: Type.Integer(),
  owned: Type.Integer(),
  total: Type.Integer(),
});

export function playerCardRoutes({ database, config }: AppDeps, { sessions }: Services): FastifyPluginAsyncTypebox {
  const { db } = database;
  return async (app) => {
    app.get(
      '/cards/claims',
      { schema: { tags: ['cards'], summary: 'Resgates da semana (RN-CRT-04): partidas jogadas, liberados, usados e quando abre a próxima semana', response: { 200: ClaimStatusSchema, 401: ErrorSchema } } },
      async (request, reply) => {
        const user = await sessions.current(request);
        if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'sign in first' });
        reply.header('cache-control', 'no-store');
        return claimStatus(db, user.id);
      },
    );

    app.post(
      '/cards/claims',
      {
        schema: {
          tags: ['cards'],
          summary: 'Resgata a carta `seq` (1 ou 2) da semana: sorteio no servidor, nunca repete; pedir de novo o mesmo `seq` devolve a mesma carta',
          body: Type.Object({ seq: Type.Integer({ minimum: 1, maximum: 2 }) }),
          response: {
            200: Type.Object({ card: CardFace, serial: Type.Integer(), own: Type.Boolean(), seq: Type.Integer(), status: ClaimStatusSchema }),
            401: ErrorSchema,
            403: ErrorSchema,
            409: ErrorSchema,
          },
        },
      },
      async (request, reply) => {
        const user = await sessions.current(request);
        if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'sign in first' });
        if (emailBlocked(config, user)) return reply.code(403).send(EMAIL_NOT_VERIFIED); // RN-EML-01
        try {
          const r = await claimCard(db, user.id, request.body.seq);
          const [card] = await db.select().from(legendCards).where(eq(legendCards.id, r.cardId));
          return { card: faceOf(card!), serial: r.serial, own: r.own, seq: r.seq, status: await claimStatus(db, user.id) };
        } catch (e) {
          if (e instanceof ClaimError) return reply.code(409).send({ error: e.code, message: e.code });
          throw e;
        }
      },
    );
    // --- coleção no perfil (OG-578, RN-CRT-07): só as cartas que a pessoa tem; o resto é só contagem ---
    app.get(
      '/players/:name/cards',
      { schema: { tags: ['cards'], summary: 'Coleção de um jogador: as cartas que ele tem (frente), contagem por classe e a própria carta, se for uma lenda', params: Type.Object({ name: Type.String({ minLength: 1, maxLength: 32 }) }) } },
      async (request, reply) => {
        const [u] = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.usernameKey, usernameKey(request.params.name)));
        if (!u) return reply.code(404).send({ error: 'not_found', message: 'no such player' });
        const owned = await db
          .select({ card: legendCards, serial: userCards.serial, claimedAt: userCards.claimedAt })
          .from(userCards)
          .innerJoin(legendCards, eq(legendCards.id, userCards.cardId))
          .where(eq(userCards.userId, u.id));
        const totals = await db.select({ class: legendCards.class, n: count() }).from(legendCards).where(eq(legendCards.active, true)).groupBy(legendCards.class);
        const tier = (c: string) => cardClass(c).tier;
        owned.sort((a, b) => tier(b.card.class) - tier(a.card.class) || a.card.nickKey.localeCompare(b.card.nickKey));
        const [legend] = await db.select().from(legendCards).where(eq(legendCards.linkedUserId, u.id));
        const legendOwned = legend ? owned.find((o) => o.card.id === legend.id && o.serial === 0) : undefined;
        return {
          player: u.username,
          owned: owned.length,
          total: totals.reduce((s, r) => s + Number(r.n), 0),
          classes: CARD_CLASS_IDS.map((id) => ({
            class: id,
            owned: owned.filter((o) => o.card.class === id).length,
            total: Number(totals.find((r) => r.class === id)?.n ?? 0),
          })),
          cards: owned.map((o) => ({ ...faceOf(o.card), serial: o.serial, claimedAt: o.claimedAt.toISOString() })),
          // recompensa da lenda (OG-580): a própria carta, em destaque, quando já saiu no resgate
          legend: legendOwned ? { ...faceOf(legendOwned.card), serial: 0 } : null,
        };
      },
    );

    // --- imagem da carta (OG-583, D-95): a frente parada, para a Steam e para links; nada da ficha ---
    app.get(
      '/cards/:slug.png',
      { schema: { tags: ['cards'], summary: 'Imagem PNG da frente da carta (boneco, nick, classe e moldura), a mesma do jogo; pública, sem texto da ficha', params: Type.Object({ slug: Type.String({ minLength: 1, maxLength: 40 }) }) } },
      async (request, reply) => {
        const [c] = await db.select().from(legendCards).where(eq(legendCards.slug, request.params.slug));
        if (!c) return reply.code(404).send({ error: 'not_found', message: 'no such card' });
        reply.header('content-type', 'image/png');
        reply.header('cache-control', 'public, max-age=3600');
        reply.header('etag', `"card-${c.id}:${c.revision}"`);
        return reply.send(cardPng(c));
      },
    );

    // --- lendas (OG-580): contas que já tiraram a própria carta (cópia nº 0) → broche "Lenda" no nick ---
    app.get('/cards/legends', { schema: { tags: ['cards'], summary: 'Contas que já tiraram a própria carta: o broche "Lenda" ao lado do nick no portal' } }, async (_request, reply) => {
      reply.header('cache-control', 'public, max-age=300');
      const rows = await db
        .select({ username: users.username, nick: legendCards.nick, class: legendCards.class })
        .from(legendCards)
        .innerJoin(users, eq(users.id, legendCards.linkedUserId))
        .innerJoin(userCards, and(eq(userCards.cardId, legendCards.id), eq(userCards.userId, legendCards.linkedUserId), eq(userCards.serial, 0)));
      return { legends: rows };
    });

    // --- página da carta (OG-579): só para quem tem ---
    app.get(
      '/cards/:slug',
      { schema: { tags: ['cards'], summary: 'Ficha completa de uma carta, só para quem a tem (quem não tem recebe 403 sem nada da ficha)', params: Type.Object({ slug: Type.String({ minLength: 1, maxLength: 40 }) }) } },
      async (request, reply) => {
        const user = await sessions.current(request);
        if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'sign in first' });
        reply.header('cache-control', 'no-store');
        const [c] = await db.select().from(legendCards).where(eq(legendCards.slug, request.params.slug));
        const [mine] = c ? await db.select().from(userCards).where(and(eq(userCards.userId, user.id), eq(userCards.cardId, c.id))) : [];
        if (!c) return reply.code(404).send({ error: 'not_found', message: 'no such card' });
        if (!mine) return reply.code(403).send({ error: 'not_owned', message: 'you have not found this card yet' });
        const [owners] = await db.select({ n: count() }).from(userCards).where(eq(userCards.cardId, c.id));
        const gens = c.generations.length ? await db.select().from(cardGenerations).where(inArray(cardGenerations.id, c.generations)).orderBy(asc(cardGenerations.ord)) : [];
        const weights = Object.fromEntries((await db.select().from(cardClassOdds)).map((w) => [w.class, Number(w.weight)]));
        const active = await db.select({ class: legendCards.class, n: count() }).from(legendCards).where(eq(legendCards.active, true)).groupBy(legendCards.class);
        const counts = Object.fromEntries(active.map((a) => [a.class, Number(a.n)]));
        // cartas ligadas: viram link só as que a pessoa também tem
        const linkIds = c.links.flatMap((l) => (l.cardId ? [l.cardId] : []));
        const linkNicks = c.links.map((l) => l.nick);
        const linked = linkNicks.length
          ? await db
              .select({ id: legendCards.id, slug: legendCards.slug, nick: legendCards.nick, mine: userCards.userId })
              .from(legendCards)
              .leftJoin(userCards, and(eq(userCards.cardId, legendCards.id), eq(userCards.userId, user.id)))
              .where(linkIds.length ? inArray(legendCards.id, linkIds) : inArray(legendCards.nick, linkNicks))
          : [];
        const byNick = new Map(linked.map((l) => [l.nick, l]));
        const byId = new Map(linked.map((l) => [l.id, l]));
        return {
          card: {
            ...faceOf(c),
            epithet: c.epithet,
            position: c.position,
            bio: c.bio,
            generations: gens.map((g) => ({ name: g.name, description: g.description, startedOn: g.startedOn, story: g.story })),
            clans: c.clans,
            achievements: c.achievements,
            traits: c.traits,
            abilities: c.abilities,
            quote: c.quote,
            memory: c.memory,
            active: c.active,
            updatedAt: c.updatedAt.toISOString(),
          },
          mine: { serial: mine.serial, claimedAt: mine.claimedAt.toISOString() },
          owners: Number(owners?.n ?? 0),
          chance: c.active ? cardChance(weights, counts, c.class as CardClassId) : 0,
          links: c.links.map((l) => {
            const hit = (l.cardId ? byId.get(l.cardId) : undefined) ?? byNick.get(l.nick);
            return { nick: l.nick, slug: hit?.mine ? hit.slug : null };
          }),
        };
      },
    );
  };
}
