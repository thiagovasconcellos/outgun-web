// SPDX-License-Identifier: GPL-2.0-or-later
// Cartas de Jogador para o jogador (D-94): resgate semanal (OG-576), coleção no perfil (OG-578) e
// página da carta, só para quem a tem (OG-579). Nada da ficha de uma carta não descoberta sai daqui
// (RN-CRT-07).
import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { eq } from 'drizzle-orm';
import type { AppDeps, Services } from '../app.js';
import { claimCard, ClaimError, claimStatus } from '../legend-card-claims.js';
import { legendCards } from '../db/schema.js';
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

export function playerCardRoutes({ database }: AppDeps, { sessions }: Services): FastifyPluginAsyncTypebox {
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
            409: ErrorSchema,
          },
        },
      },
      async (request, reply) => {
        const user = await sessions.current(request);
        if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'sign in first' });
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
  };
}
