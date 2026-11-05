// SPDX-License-Identifier: GPL-2.0-or-later
// Conta Steam (OG-584, D-95): no app da Steam, com a conta logada, liga a conta Steam sozinho uma vez
// por sessão (o app manda o ticket; a API confere na Steam). As cartas vão para o inventário Steam.
import { useEffect } from 'react';
import { useAccount } from './account.js';
import { api } from './api.js';
import { desktopBridge } from './install.js';

export interface SteamLinkState {
  linked: boolean;
  available: boolean;
  steamId: string | null;
  cards: { done: number; total: number };
}

/** Liga a conta Steam pelo ticket do app (se o app abriu pela Steam). */
export async function linkSteamAccount(): Promise<SteamLinkState | null> {
  const bridge = desktopBridge();
  if (!bridge?.steamAuthTicket || !bridge.steamAvailable?.()) return null;
  const t = await bridge.steamAuthTicket();
  if (!t) return null;
  return api<SteamLinkState>('/account/steam', { body: { ticket: t.ticket } });
}

export function useSteamAutoLink(): void {
  const { user } = useAccount();
  useEffect(() => {
    if (!user || !desktopBridge()?.steamAuthTicket || !desktopBridge()?.steamAvailable?.()) return;
    const key = `outgun.steamLinked.${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    void api<SteamLinkState>('/account/steam')
      .then((s) => (s.available && !s.linked ? linkSteamAccount() : null))
      .catch(() => undefined);
  }, [user]);
}
