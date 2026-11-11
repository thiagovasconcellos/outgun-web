// SPDX-License-Identifier: GPL-2.0-or-later
// "Jogar agora" (RN-UI-04): a um clique da tela inicial e da barra superior (OG-201).
import { useNavigate } from 'react-router';
import { joinErrorText } from '../game/net/ticket.js';
import { quickJoin } from '../screens/lobby.js';
import { useToast } from '../ui/Toast.js';
import { joinName, useAccount } from './account.js';
import { ApiError } from './api.js';
import { usePrefs } from './prefs.js';
import { useWarmPings } from './regions.js';

/** O que fazer quando o "Jogar agora" falha: ir para outra tela ou mostrar uma mensagem (chave de tradução). */
export type PlayNowFailure = { readonly to: string } | { readonly message: string };

/**
 * Falha do `quick-join` (OG-605): nunca abre `/play` sem sala em produção, que caía na sala errada
 * (a tela preta da issue #52). `dev`: sem a API no ar (desenvolvimento), entra na sala principal.
 */
export function playNowFailure(error: unknown, dev: boolean): PlayNowFailure {
  const code = error instanceof ApiError ? error.code : 'unknown';
  // beta fechado (OG-106): sem conta, vai para o login
  if (code === 'beta_account_required' || code === 'account_required') return { to: '/login' };
  if (code === 'network') return dev ? { to: '/play' } : { message: 'Could not reach the server.' };
  if (code === 'no_room') return { message: 'No room available right now. Create a room or try a training mode.' };
  return { message: joinErrorText(code) };
}

/** Entra numa sala Casual escolhida pela API (OG-069); sem a API (desenvolvimento), na sala principal. */
export function usePlayNow(): () => void {
  const { t, prefs } = usePrefs();
  const { user } = useAccount();
  const navigate = useNavigate();
  const toast = useToast();
  useWarmPings();
  return () =>
    void quickJoin('casual', joinName(user, prefs.playerName)).then(
      (id) => void navigate(`/play?sala=${encodeURIComponent(id)}`),
      (e: unknown) => {
        const failure = playNowFailure(e, import.meta.env.DEV);
        if ('to' in failure) void navigate(failure.to);
        else toast(t(failure.message), 'danger');
      },
    );
}
