// SPDX-License-Identifier: GPL-2.0-or-later
// Sessões de navegador: cookie httpOnly com um token aleatório; o banco guarda o hash.
import { and, eq, gt, ne } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from '../db/client.js';
import { sessions, users } from '../db/schema.js';
import { newToken, tokenHash } from './tokens.js';

export const SESSION_COOKIE = 'og_session';
const DAY = 24 * 60 * 60_000;

export interface SessionUser {
  sessionId: string;
  id: string;
  username: string;
  email: string;
  clanTag: string | null;
  /** Tag decorada pelo estilo do clã (OG-338). */
  clanLabel: string | null;
  isAdmin: boolean;
  /** Moderador do painel (OG-087). */
  isModerator: boolean;
  /** E-mail confirmado (OG-610, RN-EML-01); nulo = ainda não. */
  emailVerifiedAt: Date | null;
}

/** Resposta padrão das ações que exigem e-mail confirmado (RN-EML-01). */
export const EMAIL_NOT_VERIFIED = { error: 'email_not_verified', message: 'confirm your e-mail first' } as const;

/** A conta está barrada das ações que exigem e-mail confirmado? Só com `EMAIL_VERIFICATION=1` (o desligamento rápido se o envio de e-mail falhar). */
export function emailBlocked(config: { requireVerifiedEmail: boolean }, user: Pick<SessionUser, 'emailVerifiedAt'>): boolean {
  return config.requireVerifiedEmail && user.emailVerifiedAt === null;
}

export class SessionStore {
  constructor(
    private readonly db: Db,
    private readonly ttlMs: number,
    private readonly secureCookie: boolean,
  ) {}

  async create(userId: string, request: FastifyRequest, reply: FastifyReply): Promise<string> {
    const token = newToken();
    const id = tokenHash(token);
    await this.db.insert(sessions).values({
      id,
      userId,
      expiresAt: new Date(Date.now() + this.ttlMs),
      ip: request.ip,
      userAgent: request.headers['user-agent']?.slice(0, 300) ?? null,
    });
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secureCookie,
      maxAge: Math.floor(this.ttlMs / 1000),
    });
    return id;
  }

  /** Usuário da sessão do cookie, ou undefined. Renova a validade uma vez por dia (sessão deslizante). */
  async current(request: FastifyRequest): Promise<SessionUser | undefined> {
    const token = request.cookies[SESSION_COOKIE];
    if (!token || token.length > 100) return undefined;
    const id = tokenHash(token);
    const now = new Date();
    const [row] = await this.db
      .select({
        sessionId: sessions.id,
        lastSeenAt: sessions.lastSeenAt,
        id: users.id,
        username: users.username,
        email: users.email,
        clanTag: users.clanTag,
        clanLabel: users.clanLabel,
        isAdmin: users.isAdmin,
        isModerator: users.isModerator,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)));
    if (!row) return undefined;
    if (now.getTime() - row.lastSeenAt.getTime() > DAY) {
      await this.db
        .update(sessions)
        .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + this.ttlMs) })
        .where(eq(sessions.id, id));
    }
    const { lastSeenAt: _seen, ...user } = row;
    return user;
  }

  async destroy(sessionId: string, reply: FastifyReply): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
    this.clearCookie(reply);
  }

  clearCookie(reply: FastifyReply): void {
    reply.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure: this.secureCookie });
  }

  /** Encerra as sessões do usuário, menos `keep` (troca de senha, RN-PLT-03). */
  async destroyAllFor(userId: string, keep?: string): Promise<void> {
    await this.db
      .delete(sessions)
      .where(keep ? and(eq(sessions.userId, userId), ne(sessions.id, keep)) : eq(sessions.userId, userId));
  }
}
