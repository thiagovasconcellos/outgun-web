// SPDX-License-Identifier: GPL-2.0-or-later
// Definições dos itens das cartas no Steam Inventory Service (OG-585, D-95): uma por carta ativa
// marcada para a Steam, gerada do catálogo. Só nome (o nick), classe (etiqueta) e a imagem do OG-583:
// nenhum texto da ficha. Não trocável e não vendável. O JSON vai para o Steamworks (Inventory Service →
// Item Definitions).
import { cardClass, type CardClassId } from '@outgun/protocol';
import { and, asc, eq } from 'drizzle-orm';
import type { Db } from './db/client.js';
import { legendCards } from './db/schema.js';
import { cardItemDef, STEAM_APP_ID } from './steam-web-api.js';

export async function steamItemDefs(db: Db, webUrl: string): Promise<{ appid: number; items: Record<string, unknown>[] }> {
  const rows = await db.select().from(legendCards).where(and(eq(legendCards.active, true), eq(legendCards.steam, true))).orderBy(asc(legendCards.id));
  const base = webUrl.replace(/\/$/, '');
  return {
    appid: STEAM_APP_ID,
    items: rows.map((c) => {
      const cls = cardClass(c.class as CardClassId);
      // a revisão no endereço faz a Steam buscar a imagem nova quando a carta muda
      const icon = `${base}/api/cards/${c.slug}.png?r=${c.revision}`;
      return {
        itemdefid: cardItemDef(c.id),
        type: 'item',
        name: c.nick,
        name_color: cls.c2.replace('#', '').toUpperCase(),
        background_color: '05070A',
        icon_url: icon,
        icon_url_large: icon,
        tags: `classe:${cls.id};colecao:outgun-player-cards`,
        display_type: `Outgun Player Cards · ${cls.name}`,
        tradable: false,
        marketable: false,
        commodity: false,
        auto_stack: false,
        game_only: false,
      };
    }),
  };
}
