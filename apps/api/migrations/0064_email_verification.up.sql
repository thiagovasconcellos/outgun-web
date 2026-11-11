-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-610 (D-99, RN-EML-01): confirmação de e-mail. As contas que já existem ficam como confirmadas,
-- menos as de endereço que visivelmente não recebe e-mail (parte local igual ao domínio, "x@x.tld").
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
UPDATE users SET email_verified_at = now() WHERE email_key !~ '^([^@]+)@\1\.[a-z]+$';

CREATE TABLE email_verifications (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- o endereço que o link confirma: se a conta trocar de e-mail, o link antigo não vale
  email_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX email_verifications_user_idx ON email_verifications (user_id);
