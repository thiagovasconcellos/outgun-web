-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-584/585/586 (D-95, RN-CRT-10): conta Steam ligada (app desktop), cartas fora da Steam e entregas
-- das cartas no inventário Steam.
ALTER TABLE users ADD COLUMN steam_id text;
ALTER TABLE users ADD COLUMN steam_linked_at timestamptz;
CREATE UNIQUE INDEX users_steam_id_idx ON users (steam_id) WHERE steam_id IS NOT NULL;

ALTER TABLE legend_cards ADD COLUMN steam boolean NOT NULL DEFAULT true;

-- uma entrega por conta e carta; `steam_item_id` é o item criado na Steam
CREATE TABLE card_steam_grants (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  card_id integer NOT NULL REFERENCES legend_cards (id),
  steam_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  attempts smallint NOT NULL DEFAULT 0,
  next_at timestamptz NOT NULL DEFAULT now(),
  steam_item_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz,
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX card_steam_grants_due_idx ON card_steam_grants (next_at) WHERE status = 'pending';
