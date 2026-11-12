// SPDX-License-Identifier: GPL-2.0-or-later
// Confirmação de e-mail (OG-610, D-99, RN-EML-01): link no cadastro, uso único, reenvio com limite e
// as ações travadas enquanto a conta não confirma.
import { eq } from 'drizzle-orm';
import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type App } from '../app.js';
import { loadConfig } from '../config.js';
import { migrateUp } from '../db/migrate.js';
import { emailVerifications, users } from '../db/schema.js';
import { MemoryMailer } from '../mail/mailer.js';
import { createTestDatabase, pgAdminUrl, type TestDatabase } from '../test/db.js';

const ORIGIN = 'http://localhost:5173';

describe.skipIf(!pgAdminUrl)('confirmação de e-mail (OG-610)', () => {
  let t: TestDatabase;
  let app: App;
  let open: App;
  const mailer = new MemoryMailer();
  let ip = 0;

  beforeAll(async () => {
    t = await createTestDatabase();
    await migrateUp(t.sql);
    const env = { REGISTER_PER_HOUR: '1000', FORGOT_PER_HOUR: '1000' };
    app = await buildApp({ config: { ...loadConfig({ ...env, EMAIL_VERIFICATION: '1' }), databaseUrl: t.url }, database: t, mailer });
    // a mesma API com a chave desligada: nada fica travado
    open = await buildApp({ config: { ...loadConfig(env), databaseUrl: t.url }, database: t, mailer });
  });
  afterAll(async () => {
    await app?.close();
    await open?.close();
    await t?.drop();
  });

  const cookieOf = (res: LightMyRequestResponse) => `og_session=${res.cookies.find((x) => x.name === 'og_session')!.value}`;
  const post = (url: string, payload: unknown, cookie?: string, on: App = app) =>
    on.inject({ method: 'POST', url, payload: payload as Record<string, unknown>, remoteAddress: `10.2.0.${++ip}`, headers: { origin: ORIGIN, ...(cookie ? { cookie } : {}) } });
  const me = async (cookie: string) => (await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })).json().user as { emailVerified: boolean };
  const register = async (username: string) => {
    const res = await post('/auth/register', { username, email: `${username.toLowerCase()}@x.com`, password: 'senha-boa-123', language: 'pt-BR' });
    expect(res.statusCode).toBe(201);
    return { cookie: cookieOf(res), user: res.json().user as { emailVerified: boolean } };
  };
  const lastToken = (to: string) => /verify-email#token=([\w-]+)/.exec(mailer.outbox.filter((m) => m.to === to).at(-1)!.text)![1]!;
  const clan = (tag: string) => ({ name: `Clã ${tag}`, tag });

  it('conta nova nasce sem confirmação, com o link nas boas-vindas; sem confirmar, as ações ficam travadas', async () => {
    const a = await register('Nova');
    expect(a.user.emailVerified).toBe(false);
    expect(mailer.outbox.at(-1)).toMatchObject({ to: 'nova@x.com', subject: 'Bem-vindo ao Outgun Web' });
    expect(lastToken('nova@x.com').length).toBeGreaterThan(20);
    for (const res of [
      await post('/clans', clan('NV'), a.cookie),
      await post('/cards/claims', { seq: 1 }, a.cookie),
      await post('/rooms/ranked', { name: 'R', format: '3x3', bestOf: 1 }, a.cookie),
    ]) {
      expect([res.statusCode, res.json().error]).toEqual([403, 'email_not_verified']);
    }
    // com a chave desligada (EMAIL_VERIFICATION ausente) a mesma conta cria o clã
    expect((await post('/clans', clan('OFF'), a.cookie, open)).statusCode).toBe(201);
  });

  it('o link confirma uma vez só; link errado ou vencido é recusado; confirmada, a conta passa nas travas', async () => {
    const a = await register('Confirma');
    const token = lastToken('confirma@x.com');
    expect((await post('/auth/email/verify', { token: 'x'.repeat(43) })).json().error).toBe('invalid_token');
    expect((await post('/auth/email/verify', { token })).statusCode).toBe(200);
    expect((await post('/auth/email/verify', { token })).json().error).toBe('invalid_token');
    expect((await me(a.cookie)).emailVerified).toBe(true);
    expect((await post('/clans', clan('CF'), a.cookie)).statusCode).toBe(201);
    expect((await post('/auth/email/verify/resend', {}, a.cookie)).json().error).toBe('already_verified');

    const b = await register('Vencido');
    await t.db.update(emailVerifications).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await post('/auth/email/verify', { token: lastToken('vencido@x.com') })).json().error).toBe('invalid_token');
    expect((await me(b.cookie)).emailVerified).toBe(false);
  });

  it('reenvio: precisa de sessão, o link novo invalida o anterior e o 4º pedido na hora é recusado', async () => {
    expect((await post('/auth/email/verify/resend', {})).statusCode).toBe(401);
    const a = await register('Reenvia');
    const first = lastToken('reenvia@x.com');
    expect((await post('/auth/email/verify/resend', { language: 'en' }, a.cookie)).statusCode).toBe(202);
    expect(mailer.outbox.at(-1)).toMatchObject({ to: 'reenvia@x.com', subject: 'Outgun Web: confirm your e-mail' });
    const second = lastToken('reenvia@x.com');
    expect(second).not.toBe(first);
    expect((await post('/auth/email/verify', { token: first })).json().error).toBe('invalid_token');
    expect((await post('/auth/email/verify/resend', {}, a.cookie)).statusCode).toBe(202);
    expect((await post('/auth/email/verify/resend', {}, a.cookie)).statusCode).toBe(202);
    expect((await post('/auth/email/verify/resend', {}, a.cookie)).statusCode).toBe(429);
    expect((await post('/auth/email/verify', { token: lastToken('reenvia@x.com') })).statusCode).toBe(200);
  });

  it('migração (D-99): conta antiga fica confirmada, menos a de e-mail "x@x.tld"', async () => {
    const rule = (email: string) => t.sql<{ ok: boolean }[]>`SELECT ${email} !~ '^([^@]+)@\\1\\.[a-z]+$' AS ok`.then((r) => r[0]!.ok);
    expect([await rule('ae@ae.ae'), await rule('jogador@gmail.com'), await rule('gmail@gmail.com'), await rule('a@ae.ae')]).toEqual([false, true, false, true]);
    // conta criada antes da coluna existir: sem cadastro pela API, a migração marca na hora
    await t.sql`INSERT INTO users (username, username_key, email, email_key, password_hash) VALUES ('Antiga', 'antiga', 'antiga@x.com', 'antiga@x.com', 'x'), ('Falsa', 'falsa', 'zz@zz.zz', 'zz@zz.zz', 'x')`;
    await t.sql`UPDATE users SET email_verified_at = now() WHERE email_verified_at IS NULL AND username_key IN ('antiga', 'falsa') AND email_key !~ '^([^@]+)@\\1\\.[a-z]+$'`;
    const rows = await t.db.select({ name: users.username, at: users.emailVerifiedAt }).from(users).where(eq(users.passwordHash, 'x'));
    expect(rows.map((r) => [r.name, r.at !== null]).sort()).toEqual([['Antiga', true], ['Falsa', false]]);
  });
});
