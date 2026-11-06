// SPDX-License-Identifier: GPL-2.0-or-later
// Conta Steam (OG-584, D-95): o app desktop manda um ticket de sessão da Steam; a API confere na Steam
// (chave de publicador) e liga o SteamID à conta. Ao ligar, as cartas que a pessoa já tem entram na
// fila do inventário Steam (OG-586). Desligar apaga o SteamID; os itens já entregues ficam na Steam.
import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { and, eq, inArray, ne } from 'drizzle-orm';
import type { AppDeps, Services } from '../app.js';
import { queueSteamGrants, retryFailedSteamGrants, steamGrantSummary } from '../card-steam-grants.js';
import { cardSteamGrants, users } from '../db/schema.js';
import type { SteamApi } from '../steam-web-api.js';
import { ErrorSchema } from './schemas.js';

const SteamState = Type.Object({ linked: Type.Boolean(), available: Type.Boolean(), steamId: Type.Union([Type.String(), Type.Null()]), cards: Type.Object({ done: Type.Integer(), total: Type.Integer() }) });

export function steamAccountRoutes({ database }: AppDeps, { sessions }: Services, steam: SteamApi | null): FastifyPluginAsyncTypebox {
  const { db } = database;
  return async (app) => {
    app.get('/steam', { schema: { tags: ['conta'], summary: 'Conta Steam ligada e as cartas entregues no inventário Steam', response: { 200: SteamState, 401: ErrorSchema } } }, async (request, reply) => {
      const user = await sessions.current(request);
      if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'sign in first' });
      const [u] = await db.select({ steamId: users.steamId }).from(users).where(eq(users.id, user.id));
      return { linked: Boolean(u?.steamId), available: steam !== null, steamId: u?.steamId ?? null, cards: await steamGrantSummary(db, user.id) };
    });

    app.post(
      '/steam',
      {
        schema: {
          tags: ['conta'],
          summary: 'Liga a conta Steam pelo ticket do app desktop (conferido na Steam)',
          body: Type.Object({ ticket: Type.String({ pattern: '^[0-9a-fA-F]{16,2048}$' }) }),
          response: { 200: SteamState, 401: ErrorSchema, 403: ErrorSchema, 503: ErrorSchema },
        },
      },
      async (request, reply) => {
        const user = await sessions.current(request);
        if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'sign in first' });
        if (!steam) return reply.code(503).send({ error: 'steam_unavailable', message: 'steam integration is off' });
        let steamId: string | null;
        try {
          steamId = await steam.authenticateTicket(request.body.ticket);
        } catch {
          return reply.code(503).send({ error: 'steam_unavailable', message: 'steam did not answer' });
        }
        if (!steamId) return reply.code(403).send({ error: 'invalid_ticket', message: 'the steam ticket is not valid for this game' });
        await db.transaction(async (tx) => {
          // um SteamID numa conta só: a última que ligou fica com ele
          await tx.update(users).set({ steamId: null, steamLinkedAt: null }).where(and(eq(users.steamId, steamId!), ne(users.id, user.id)));
          await tx.update(users).set({ steamId, steamLinkedAt: new Date() }).where(eq(users.id, user.id));
          // entregas ainda não feitas de outro SteamID (troca de conta Steam) passam para o novo
          await tx.update(cardSteamGrants).set({ steamId }).where(and(eq(cardSteamGrants.userId, user.id), inArray(cardSteamGrants.status, ['pending', 'failed'])));
          // religar é a saída de quem ficou com entrega presa (OG-587)
          await retryFailedSteamGrants(tx, user.id);
          await queueSteamGrants(tx, user.id);
        });
        return { linked: true, available: true, steamId, cards: await steamGrantSummary(db, user.id) };
      },
    );

    app.delete('/steam', { schema: { tags: ['conta'], summary: 'Desliga a conta Steam (os itens já entregues ficam na Steam)' } }, async (request, reply) => {
      const user = await sessions.current(request);
      if (!user) return reply.code(401).send({ error: 'unauthorized', message: 'sign in first' });
      await db.update(users).set({ steamId: null, steamLinkedAt: null }).where(eq(users.id, user.id));
      // o que não foi entregue some; religar põe de novo na fila (OG-587)
      await db.delete(cardSteamGrants).where(and(eq(cardSteamGrants.userId, user.id), inArray(cardSteamGrants.status, ['pending', 'failed'])));
      return reply.code(204).send(null);
    });
  };
}
