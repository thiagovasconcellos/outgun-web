// SPDX-License-Identifier: GPL-2.0-or-later
import { describe, expect, it } from 'vitest';
import { INVITE_TTL_MS, roomInviteToken, validRoomInvite } from './room-invite.js';

describe('token de convite da sala (OG-447)', () => {
  const now = Date.parse('2026-11-05T20:00:00Z');
  it('vale para a sala e a senha certas, até vencer', () => {
    const t = roomInviteToken('sala-1', 'hash-a', now);
    expect(validRoomInvite(t, 'sala-1', 'hash-a', now + 1000)).toBe(true);
    expect(validRoomInvite(t, 'sala-2', 'hash-a', now)).toBe(false);
    expect(validRoomInvite(t, 'sala-1', 'hash-b', now)).toBe(false); // senha trocada
    expect(validRoomInvite(t, 'sala-1', 'hash-a', now + INVITE_TTL_MS + 1000)).toBe(false);
    expect(validRoomInvite('lixo', 'sala-1', 'hash-a', now)).toBe(false);
  });
});
