// SPDX-License-Identifier: GPL-2.0-or-later
// Imagens das cartas em memória (OG-588): desenhar uma leva cerca de 0,4 s e trava a API nesse tempo,
// e a primeira depois de subir passa de 1 s. Por isso elas são geradas de antemão, com uma pausa entre
// uma e outra, para a Steam e os jogadores não serem quem espera por isso.
import { setTimeout as sleep } from 'node:timers/promises';
import { eq } from 'drizzle-orm';
import type { CardClassId } from '@outgun/protocol';
import type { Db } from './db/client.js';
import { legendCards } from './db/schema.js';
import { renderCardPng } from './legend-card-png.js';

type CardRow = Pick<typeof legendCards.$inferSelect, 'id' | 'revision' | 'nick' | 'class' | 'ringColor' | 'centerColor'>;

const MAX_ENTRIES = 300;
const cache = new Map<string, Buffer>();
const cacheKey = (c: CardRow) => `${c.id}:${c.revision}`;

/** PNG da carta na revisão atual, da memória ou desenhado agora. */
export function cardPng(c: CardRow): Buffer {
  const key = cacheKey(c);
  let png = cache.get(key);
  if (!png) {
    png = renderCardPng({ nick: c.nick, class: c.class as CardClassId, ringColor: c.ringColor, centerColor: c.centerColor });
    if (cache.size >= MAX_ENTRIES) cache.clear();
    cache.set(key, png);
  }
  return png;
}

/** Gera as imagens que faltam das cartas ativas, uma de cada vez. Devolve quantas desenhou. */
export async function warmCardPngs(db: Db, { pauseMs = 500 }: { pauseMs?: number } = {}): Promise<number> {
  const cards = await db.select().from(legendCards).where(eq(legendCards.active, true));
  let rendered = 0;
  for (const card of cards) {
    if (cache.has(cacheKey(card))) continue;
    cardPng(card);
    rendered++;
    await sleep(pauseMs);
  }
  return rendered;
}
