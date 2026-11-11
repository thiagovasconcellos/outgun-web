// SPDX-License-Identifier: GPL-2.0-or-later
// Resgate semanal das Cartas de Jogador (OG-576, D-94, RN-CRT-04/05/06): 2 resgates por semana
// (segunda a domingo, Brasília) liberados por 3 partidas Casual ou ranqueadas na semana; treino não
// grava partida, então não conta. O sorteio é feito aqui, no servidor, na hora do resgate: classe
// pelo peso entre as classes com carta ativa que a conta ainda não tem, depois uma carta da classe.
// Nunca repete. O número da cópia é a ordem de recebimento; a lenda vinculada recebe a nº 0.
import { randomInt } from 'node:crypto';
import { CARD_CLASS_IDS, type CardClassId } from '@outgun/protocol';
import { and, count, eq, gte, isNull, sql } from 'drizzle-orm';
import type { Db } from './db/client.js';
import { cardClaims, cardClassOdds, legendCards, matches, matchPlayers, userCards, users } from './db/schema.js';
import { notify } from './routes/notifications.js';
import { queueSteamGrants } from './card-steam-grants.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export const CLAIMS_PER_WEEK = 2;
export const MATCHES_TO_UNLOCK = 3;
/** Brasília não tem horário de verão desde 2019: UTC−3 o ano todo. */
const BRT_OFFSET_MS = -3 * 3600_000;

/** Começo da semana (segunda 00:00 em Brasília) de um instante, como instante UTC. */
export function weekStart(now: Date): Date {
  const local = new Date(now.getTime() + BRT_OFFSET_MS);
  const dow = (local.getUTCDay() + 6) % 7; // segunda = 0
  const monday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow);
  return new Date(monday - BRT_OFFSET_MS);
}
/** Segunda-feira da semana como data ('2026-11-09'), a chave de `card_claims.week`. */
export const weekKey = (now: Date) => new Date(weekStart(now).getTime() + BRT_OFFSET_MS).toISOString().slice(0, 10);
export const nextWeekStart = (now: Date) => new Date(weekStart(now).getTime() + 7 * 86400_000);

export interface DrawCandidate {
  id: number;
  class: CardClassId;
}
/**
 * Sorteio (RN-CRT-05): `rand` em [0, 1). Classes sem candidata saem da soma; peso total zero com
 * candidatas (todas as classes restantes com peso 0) cai no sorteio uniforme entre as candidatas.
 */
export function drawCard(candidates: readonly DrawCandidate[], weights: Readonly<Partial<Record<CardClassId, number>>>, rand: () => number): DrawCandidate | null {
  if (candidates.length === 0) return null;
  const byClass = new Map<CardClassId, DrawCandidate[]>();
  for (const c of candidates) byClass.set(c.class, [...(byClass.get(c.class) ?? []), c]);
  const live = CARD_CLASS_IDS.filter((id) => byClass.has(id));
  const total = live.reduce((s, id) => s + Math.max(0, weights[id] ?? 0), 0);
  if (total <= 0) return candidates[Math.min(candidates.length - 1, Math.floor(rand() * candidates.length))]!;
  let x = rand() * total;
  let cls = live[live.length - 1]!;
  for (const id of live) {
    x -= Math.max(0, weights[id] ?? 0);
    if (x < 0 && (weights[id] ?? 0) > 0) {
      cls = id;
      break;
    }
  }
  const list = byClass.get(cls)!;
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))]!;
}
const cryptoRand = () => randomInt(2 ** 32) / 2 ** 32;

/** Partidas da conta na semana (Casual e ranqueadas; bots não contam). */
export async function weekMatches(tx: Db | Tx, userId: string, now: Date): Promise<number> {
  const [r] = await tx
    .select({ n: count() })
    .from(matchPlayers)
    .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
    .where(and(eq(matchPlayers.userId, userId), eq(matchPlayers.isBot, false), gte(matches.endedAt, weekStart(now))));
  return Number(r?.n ?? 0);
}

export interface ClaimStatus {
  week: string;
  matches: number;
  matchesNeeded: number;
  unlocked: boolean;
  used: number;
  available: number;
  perWeek: number;
  nextWeekAt: string;
  /** Cartas ativas que a conta ainda não tem (0 = coleção completa). */
  remaining: number;
  owned: number;
  total: number;
}

export async function claimStatus(tx: Db | Tx, userId: string, now = new Date()): Promise<ClaimStatus> {
  const week = weekKey(now);
  const played = await weekMatches(tx, userId, now);
  const [used] = await tx.select({ n: count() }).from(cardClaims).where(and(eq(cardClaims.userId, userId), eq(cardClaims.week, week)));
  const [owned] = await tx.select({ n: count() }).from(userCards).where(eq(userCards.userId, userId));
  const [total] = await tx.select({ n: count() }).from(legendCards).where(eq(legendCards.active, true));
  const [remaining] = await tx
    .select({ n: count() })
    .from(legendCards)
    .leftJoin(userCards, and(eq(userCards.cardId, legendCards.id), eq(userCards.userId, userId)))
    .where(and(eq(legendCards.active, true), isNull(userCards.userId)));
  const unlocked = played >= MATCHES_TO_UNLOCK;
  const usedN = Number(used?.n ?? 0);
  const left = Number(remaining?.n ?? 0);
  return {
    week,
    matches: played,
    matchesNeeded: MATCHES_TO_UNLOCK,
    unlocked,
    used: usedN,
    available: unlocked && left > 0 ? Math.min(CLAIMS_PER_WEEK - usedN, left) : 0,
    perWeek: CLAIMS_PER_WEEK,
    nextWeekAt: nextWeekStart(now).toISOString(),
    remaining: left,
    owned: Number(owned?.n ?? 0),
    total: Number(total?.n ?? 0),
  };
}

export class ClaimError extends Error {
  constructor(readonly code: 'not_unlocked' | 'no_claims_left' | 'collection_complete' | 'wrong_seq') {
    super(code);
  }
}

export interface ClaimResult {
  seq: number;
  cardId: number;
  serial: number;
  /** A carta é a da própria conta (cópia nº 0, recompensa da lenda). */
  own: boolean;
  repeated: boolean;
}

/**
 * Resgata a carta `seq` (1 ou 2) da semana. Idempotente: pedir de novo um `seq` já resgatado devolve
 * a mesma carta (duplo clique, rede instável). A linha da conta fica travada durante o sorteio.
 */
export async function claimCard(db: Db, userId: string, seq: number, o: { now?: Date; rand?: () => number } = {}): Promise<ClaimResult> {
  const now = o.now ?? new Date();
  const rand = o.rand ?? cryptoRand;
  const week = weekKey(now);
  return db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
    const done = await tx.select().from(cardClaims).where(and(eq(cardClaims.userId, userId), eq(cardClaims.week, week)));
    const same = done.find((c) => c.seq === seq);
    if (same) {
      const [uc] = await tx.select().from(userCards).where(and(eq(userCards.userId, userId), eq(userCards.cardId, same.cardId)));
      return { seq, cardId: same.cardId, serial: uc?.serial ?? 0, own: uc?.serial === 0, repeated: true };
    }
    if (done.length >= CLAIMS_PER_WEEK) throw new ClaimError('no_claims_left');
    if (seq !== done.length + 1) throw new ClaimError('wrong_seq');
    if ((await weekMatches(tx, userId, now)) < MATCHES_TO_UNLOCK) throw new ClaimError('not_unlocked');
    const candidates = await tx
      .select({ id: legendCards.id, class: legendCards.class })
      .from(legendCards)
      .leftJoin(userCards, and(eq(userCards.cardId, legendCards.id), eq(userCards.userId, userId)))
      .where(and(eq(legendCards.active, true), isNull(userCards.userId)));
    const weights = Object.fromEntries((await tx.select().from(cardClassOdds)).map((w) => [w.class, Number(w.weight)]));
    const pick = drawCard(candidates as DrawCandidate[], weights, rand);
    if (!pick) throw new ClaimError('collection_complete');
    const [card] = await tx.select({ linked: legendCards.linkedUserId }).from(legendCards).where(eq(legendCards.id, pick.id)).for('update');
    const own = card?.linked === userId;
    let serial = 0;
    if (!own) {
      const [m] = await tx.select({ m: sql<number>`coalesce(max(${userCards.serial}), 0)` }).from(userCards).where(eq(userCards.cardId, pick.id));
      serial = Number(m?.m ?? 0) + 1;
    }
    await tx.insert(userCards).values({ userId, cardId: pick.id, serial, claimedAt: now });
    await tx.insert(cardClaims).values({ userId, week, seq, cardId: pick.id, claimedAt: now });
    // inventário Steam (OG-586): entra na fila se a conta tem Steam ligada
    await queueSteamGrants(tx, userId, [pick.id]);
    // recompensa da lenda (OG-580, RN-CRT-09): marco "A lenda em pessoa" (o broche e o destaque saem da cópia nº 0)
    if (own) {
      const got = await tx.execute<{ milestone: string }>(sql`
        INSERT INTO player_milestones (user_id, milestone, achieved_at, match_id) VALUES (${userId}, 'card_legend', ${now.toISOString()}, NULL)
        ON CONFLICT (user_id, milestone) DO NOTHING RETURNING milestone`);
      if (got.length > 0) await notify(tx, [userId], 'milestone', { milestones: ['card_legend'] });
    }
    return { seq, cardId: pick.id, serial, own, repeated: false };
  });
}

/**
 * Recompensa da lenda para quem já tinha a carta quando a conta foi vinculada a ela (OG-609,
 * RN-CRT-09): o resgate só dá a cópia nº 0 e o marco se o vínculo já existe na hora do sorteio. Aqui
 * a cópia da conta vinculada vira a nº 0 (se a nº 0 está livre) e quem tem a nº 0 da própria carta
 * sem o marco "A lenda em pessoa" ganha o marco e o aviso, uma vez só. Pode rodar quantas vezes
 * quiser; com `cardId`, só essa carta. Devolve as contas que ganharam o marco agora.
 * O mesmo SQL está na migração 0063, que faz a concessão retroativa.
 */
export async function grantLegendRewards(tx: Db | Tx, cardId?: number): Promise<string[]> {
  const only = cardId === undefined ? sql`` : sql`AND lc.id = ${cardId}`;
  await tx.execute(sql`
    UPDATE user_cards uc SET serial = 0
    FROM legend_cards lc
    WHERE lc.id = uc.card_id AND lc.linked_user_id = uc.user_id AND uc.serial <> 0 ${only}
      AND NOT EXISTS (SELECT 1 FROM user_cards z WHERE z.card_id = uc.card_id AND z.serial = 0)`);
  const got = await tx.execute<{ user_id: string }>(sql`
    INSERT INTO player_milestones (user_id, milestone, achieved_at, match_id)
    SELECT uc.user_id, 'card_legend', uc.claimed_at, NULL
    FROM user_cards uc JOIN legend_cards lc ON lc.id = uc.card_id AND lc.linked_user_id = uc.user_id
    WHERE uc.serial = 0 ${only}
    ON CONFLICT (user_id, milestone) DO NOTHING RETURNING user_id`);
  const ids = got.map((r) => r.user_id);
  await notify(tx, ids, 'milestone', { milestones: ['card_legend'] });
  return ids;
}

/**
 * Depois de gravar uma partida: quem acabou de chegar à 3ª partida da semana ganha o aviso de que
 * os resgates estão liberados (uma vez por semana), se ainda há carta a descobrir.
 */
export async function noticeUnlockedClaims(tx: Db | Tx, userIds: readonly string[], endedAt: Date): Promise<void> {
  if (userIds.length === 0 || weekStart(endedAt).getTime() !== weekStart(new Date()).getTime()) return;
  const due: string[] = [];
  for (const id of userIds) if ((await weekMatches(tx, id, endedAt)) === MATCHES_TO_UNLOCK) due.push(id);
  if (due.length === 0) return;
  const [active] = await tx.select({ n: count() }).from(legendCards).where(eq(legendCards.active, true));
  if (!Number(active?.n ?? 0)) return;
  await notify(tx, due, 'cards', { cards: CLAIMS_PER_WEEK });
}
