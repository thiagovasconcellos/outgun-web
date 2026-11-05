// SPDX-License-Identifier: GPL-2.0-or-later
// Convite pela Steam para sala com senha (OG-447, D-95): a senha não vai nos dados do lobby da Steam.
// Quem está na sala (e sabe a senha) pede um token curto que dispensa a senha por 10 minutos. O token
// é um HMAC com o hash da senha da sala como chave: trocar a senha invalida os convites.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const INVITE_TTL_MS = 10 * 60_000;

const mac = (passwordHash: string, roomId: string, exp: number) => createHmac('sha256', passwordHash).update(`${roomId}.${exp}`).digest('base64url');

export function roomInviteToken(roomId: string, passwordHash: string, now = Date.now()): string {
  const exp = Math.floor((now + INVITE_TTL_MS) / 1000);
  return `${exp}.${mac(passwordHash, roomId, exp)}`;
}

export function validRoomInvite(token: string, roomId: string, passwordHash: string, now = Date.now()): boolean {
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp * 1000 < now) return false;
  const a = Buffer.from(m[2]!);
  const b = Buffer.from(mac(passwordHash, roomId, exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
