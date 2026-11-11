// SPDX-License-Identifier: GPL-2.0-or-later
import { describe, expect, it } from 'vitest';
import { ApiError } from './api.js';
import { playNowFailure } from './play-now.js';

describe('falha do "Jogar agora" (OG-605)', () => {
  it('sem sala: mensagem com o que fazer, sem abrir a partida', () => {
    expect(playNowFailure(new ApiError(503, 'no_room', 'no casual room available'), false)).toEqual({
      message: 'No room available right now. Create a room or try a training mode.',
    });
  });

  it('recusa da API: a mesma mensagem do lobby', () => {
    expect(playNowFailure(new ApiError(403, 'banned', 'banned'), false)).toEqual({ message: 'You are banned from this room.' });
    expect(playNowFailure(new ApiError(500, 'unknown', 'boom'), false)).toEqual({ message: 'Something went wrong. Try again.' });
    expect(playNowFailure(new Error('qualquer'), false)).toEqual({ message: 'Something went wrong. Try again.' });
  });

  it('sem rede: mensagem em produção; em desenvolvimento, a sala principal', () => {
    const offline = new ApiError(0, 'network', 'network error');
    expect(playNowFailure(offline, false)).toEqual({ message: 'Could not reach the server.' });
    expect(playNowFailure(offline, true)).toEqual({ to: '/play' });
  });

  it('beta fechado: vai para o login', () => {
    expect(playNowFailure(new ApiError(401, 'beta_account_required', 'x'), false)).toEqual({ to: '/login' });
  });
});
