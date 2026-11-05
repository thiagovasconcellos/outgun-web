// SPDX-License-Identifier: GPL-2.0-or-later
// Convite pela Steam no site (OG-447 a OG-450, D-95): o botão "Convidar amigos da Steam" e quem leva o
// convidado à sala. Só no app da Steam (`canSteamInvite`); no navegador nada aparece.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAccount } from './account.js';
import { api } from './api.js';
import { canSteamInvite, desktopBridge, type SteamJoin } from './install.js';
import { usePrefs } from './prefs.js';
import { Button } from '../ui/Button.js';

/** Abre a janela de amigos da Steam para a sala; sala com senha pede antes o token de convite. */
export async function inviteSteamFriends(room: string, password?: string, by?: string): Promise<boolean> {
  const bridge = desktopBridge();
  if (!bridge?.steamInvite) return false;
  let token: string | null = null;
  if (password) {
    try {
      token = (await api<{ token: string | null }>(`/rooms/${encodeURIComponent(room)}/invite`, { body: { password } })).token;
    } catch {
      return false;
    }
  }
  return bridge.steamInvite(room, token, by ?? null);
}

/** Avisa o app que saiu da sala: o lobby da Steam do convite fecha. */
export function leaveSteamRoom(): void {
  desktopBridge()?.steamLeaveRoom?.();
}

// o convite aceito fica guardado na aba por 10 min: sobrevive ao login (Ranked exige conta, OG-450)
const KEY = 'outgun.steamJoin';
const TTL_MS = 10 * 60_000;
function remember(j: SteamJoin): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...j, at: Date.now() }));
  } catch {
    // sem storage, só a navegação leva o convite
  }
}
/** Token e quem convidou do convite aceito para esta sala, se ainda vale. */
export function steamJoinFor(room: string | null): { invite?: string; invitedBy?: string } {
  if (!room) return {};
  try {
    const j = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as (SteamJoin & { at: number }) | null;
    if (!j || j.room !== room || Date.now() - j.at > TTL_MS) return {};
    return { ...(j.token ? { invite: j.token } : {}), ...(j.by ? { invitedBy: j.by } : {}) };
  } catch {
    return {};
  }
}

export function SteamInviteButton({ room, password, variant = 'secondary', block = false, disabled = false }: { readonly room: string; readonly password?: string | undefined; readonly variant?: 'primary' | 'secondary' | 'ghost'; readonly block?: boolean; readonly disabled?: boolean }) {
  const { t } = usePrefs();
  const { user } = useAccount();
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  if (!canSteamInvite()) return null;
  const click = () => {
    setState('busy');
    void inviteSteamFriends(room, password, user?.id).then((ok) => setState(ok ? 'idle' : 'failed'));
  };
  return (
    <Button variant={variant} block={block} disabled={disabled || state === 'busy'} onClick={click} title={state === 'failed' ? t('Could not open the Steam invite. Is the Steam overlay on?') : undefined}>
      {state === 'failed' ? t('Invite failed: try again') : t('Invite Steam friends')}
    </Button>
  );
}

/** Leva à sala quem aceitou um convite da Steam (com o app aberto ou aberto pelo convite). */
export function useSteamJoins(): void {
  const navigate = useNavigate();
  useEffect(() => {
    const bridge = desktopBridge();
    if (!bridge?.onSteamJoin) return;
    const go = (j: SteamJoin | null) => {
      if (!j) return;
      remember(j);
      // a página da sala decide: Casual entra direto; Ranked sem conta passa pelo login e volta
      void navigate(`/rooms/${encodeURIComponent(j.room)}?convite=steam`);
    };
    void bridge.steamPendingJoin?.().then(go);
    return bridge.onSteamJoin(go);
  }, [navigate]);
}
