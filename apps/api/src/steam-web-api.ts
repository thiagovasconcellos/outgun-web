// SPDX-License-Identifier: GPL-2.0-or-later
// Web API de publicador da Steam (OG-584/586, D-95): conferir o ticket de sessão do app desktop (quem é
// o jogador na Steam) e criar os itens das cartas no inventário. A chave (`STEAM_WEB_API_KEY`) fica só
// no servidor. Trocável nos testes.
export const STEAM_APP_ID = 663760;
/** Identidade do ticket (`getAuthTicketForWebApi("outgun")` no app). */
export const STEAM_TICKET_IDENTITY = 'outgun';
/** Itens das cartas no Inventory Service: 1000 + id da carta (OG-585). */
export const cardItemDef = (cardId: number) => 1000 + cardId;

export interface SteamApi {
  /** SteamID64 do dono do ticket, ou null se o ticket não vale para o app. */
  authenticateTicket(ticketHex: string): Promise<string | null>;
  /** Cria o item da carta no inventário; devolve o id do item. */
  addItem(steamId: string, itemDefId: number): Promise<string>;
}

const BASE = 'https://partner.steam-api.com';

export function steamWebApi(key: string, fetcher: typeof fetch = fetch): SteamApi {
  return {
    async authenticateTicket(ticketHex) {
      const q = new URLSearchParams({ key, appid: String(STEAM_APP_ID), ticket: ticketHex, identity: STEAM_TICKET_IDENTITY });
      const res = await fetcher(`${BASE}/ISteamUserAuth/AuthenticateUserTicket/v1/?${q}`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`steam auth ${res.status}`);
      const body = (await res.json()) as { response?: { params?: { result?: string; steamid?: string; vacbanned?: boolean; publisherbanned?: boolean }; error?: unknown } };
      const p = body.response?.params;
      return p?.result === 'OK' && p.steamid && /^\d{17}$/.test(p.steamid) ? p.steamid : null;
    },
    async addItem(steamId, itemDefId) {
      const form = new URLSearchParams({ key, appid: String(STEAM_APP_ID), steamid: steamId, 'itemdefid[0]': String(itemDefId), notify: '1' });
      const res = await fetcher(`${BASE}/IInventoryService/AddItem/v1/`, { method: 'POST', body: form, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`steam AddItem ${res.status}`);
      const body = (await res.json()) as { response?: { item_json?: string } };
      const items = JSON.parse(body.response?.item_json ?? '[]') as { itemid?: string }[];
      const id = items[0]?.itemid;
      if (!id) throw new Error('steam AddItem sem item');
      return id;
    },
  };
}
