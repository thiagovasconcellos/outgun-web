// SPDX-License-Identifier: GPL-2.0-or-later
// Entrega das cartas no inventário Steam (OG-586, D-95, RN-CRT-10): cada carta de quem tem a conta
// Steam ligada vira uma entrega pendente; um relógio da API entrega com `AddItem` e tenta de novo com
// espera crescente. Falha da Steam nunca afeta o resgate.
import { and, asc, count, eq, isNull, lte } from 'drizzle-orm';
import type { Db } from './db/client.js';
import { cardSteamGrants, legendCards, userCards, users } from './db/schema.js';
import { cardItemDef, type SteamApi } from './steam-web-api.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
const MAX_ATTEMPTS = 8;

/** Põe na fila as cartas da conta que ainda não foram para a Steam (no resgate e ao ligar a conta). */
export async function queueSteamGrants(tx: Db | Tx, userId: string, cardIds?: readonly number[]): Promise<number> {
  const [u] = await tx.select({ steamId: users.steamId }).from(users).where(eq(users.id, userId));
  if (!u?.steamId) return 0;
  const rows = await tx
    .select({ cardId: userCards.cardId })
    .from(userCards)
    .innerJoin(legendCards, eq(legendCards.id, userCards.cardId))
    .leftJoin(cardSteamGrants, and(eq(cardSteamGrants.userId, userCards.userId), eq(cardSteamGrants.cardId, userCards.cardId)))
    .where(and(eq(userCards.userId, userId), eq(legendCards.steam, true), isNull(cardSteamGrants.userId)));
  const ids = rows.map((r) => r.cardId).filter((id) => !cardIds || cardIds.includes(id));
  if (!ids.length) return 0;
  await tx.insert(cardSteamGrants).values(ids.map((cardId) => ({ userId, cardId, steamId: u.steamId! }))).onConflictDoNothing();
  return ids.length;
}

/** Um passo do relógio: entrega até `limit` pendentes vencidas. */
export async function deliverSteamGrants(db: Db, steam: SteamApi | null, now = new Date(), limit = 20): Promise<{ done: number; failed: number }> {
  if (!steam) return { done: 0, failed: 0 };
  const due = await db
    .select()
    .from(cardSteamGrants)
    .where(and(eq(cardSteamGrants.status, 'pending'), lte(cardSteamGrants.nextAt, now)))
    .orderBy(asc(cardSteamGrants.nextAt))
    .limit(limit);
  let done = 0;
  let failed = 0;
  for (const g of due) {
    const key = and(eq(cardSteamGrants.userId, g.userId), eq(cardSteamGrants.cardId, g.cardId));
    try {
      const item = await steam.addItem(g.steamId, cardItemDef(g.cardId));
      await db.update(cardSteamGrants).set({ status: 'done', steamItemId: item, doneAt: now, lastError: null }).where(key);
      done++;
    } catch (e) {
      const attempts = g.attempts + 1;
      // 1, 2, 4, 8... minutos, até 8 tentativas
      const next = new Date(now.getTime() + 60_000 * 2 ** Math.min(attempts - 1, 10));
      await db
        .update(cardSteamGrants)
        .set({ attempts, nextAt: next, lastError: String(e).slice(0, 300), ...(attempts >= MAX_ATTEMPTS ? { status: 'failed' as const } : {}) })
        .where(key);
      failed++;
    }
  }
  return { done, failed };
}

/** Situação das entregas de uma conta: { done, total } (para o perfil). */
export async function steamGrantSummary(db: Db, userId: string): Promise<{ done: number; total: number }> {
  const rows = await db.select({ status: cardSteamGrants.status, n: count() }).from(cardSteamGrants).where(eq(cardSteamGrants.userId, userId)).groupBy(cardSteamGrants.status);
  const n = (s: string) => Number(rows.find((r) => r.status === s)?.n ?? 0);
  return { done: n('done'), total: n('done') + n('pending') + n('failed') };
}


