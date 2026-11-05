-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-570 (D-94, RN-CRT-01..06): Cartas de Jogador ("Outgun Player Cards"). A ficha fica só no banco
-- (RN-CRT-08). Listas da ficha (clãs, conquistas, características, habilidades, cartas ligadas) ficam
-- em colunas da carta: a ficha é gravada e revisada inteira, e cada gravação vira uma revisão.

-- Gerações (P10): cadastro do admin; a carta guarda os ids.
CREATE TABLE card_generations (
  id serial PRIMARY KEY,
  ord smallint NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true
);
INSERT INTO card_generations (ord, name, description) VALUES
  (1, '1ª geração', 'Outgun 0.5'),
  (2, '2ª geração', 'Outgun 1.0'),
  (3, '3ª geração', 'Outgun hospedado por jogadores'),
  (4, '4ª geração', 'Outgun Web');

CREATE TABLE legend_cards (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  nick text NOT NULL CHECK (char_length(nick) BETWEEN 1 AND 16),
  -- nick normalizado (só letras e números, maiúsculas): dois cadastros da mesma pessoa
  nick_key text NOT NULL UNIQUE,
  epithet text NOT NULL DEFAULT '',
  position text NOT NULL DEFAULT '',
  bio text NOT NULL,
  class text NOT NULL CHECK (class IN ('classico', 'epico', 'lendario', 'especial', 'nefasto', 'mitica')),
  generations integer[] NOT NULL DEFAULT '{}',
  clans text[] NOT NULL DEFAULT '{}',
  achievements jsonb NOT NULL DEFAULT '[]',
  traits jsonb NOT NULL DEFAULT '[]',
  abilities jsonb NOT NULL DEFAULT '[]',
  quote text NOT NULL,
  memory text NOT NULL DEFAULT '',
  ring_color text NOT NULL,
  center_color text NOT NULL,
  -- conta atual do jogador da carta (P13): recebe a cópia nº 0 e a recompensa da lenda
  linked_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  links jsonb NOT NULL DEFAULT '[]',
  sources text NOT NULL DEFAULT '',
  -- desativada: sai do sorteio; quem tem continua com ela (RN-CRT-02)
  active boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX legend_cards_class_idx ON legend_cards (class) WHERE active;
CREATE UNIQUE INDEX legend_cards_linked_idx ON legend_cards (linked_user_id) WHERE linked_user_id IS NOT NULL;

-- Cópia da ficha a cada gravação (como as revisões de mapas).
CREATE TABLE legend_card_revisions (
  card_id integer NOT NULL REFERENCES legend_cards (id) ON DELETE CASCADE,
  number integer NOT NULL,
  data jsonb NOT NULL,
  note text NOT NULL DEFAULT '',
  edited_by uuid REFERENCES users (id) ON DELETE SET NULL,
  edited_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, number)
);

-- Peso de cada classe no sorteio (P2): moderador e admin editam.
CREATE TABLE card_class_odds (
  class text PRIMARY KEY CHECK (class IN ('classico', 'epico', 'lendario', 'especial', 'nefasto', 'mitica')),
  weight numeric(6, 2) NOT NULL CHECK (weight >= 0),
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO card_class_odds (class, weight) VALUES
  ('classico', 50), ('epico', 25), ('lendario', 13), ('especial', 8), ('nefasto', 3.5), ('mitica', 0.5);

-- Resgates (RN-CRT-04): até 2 por semana; `week` é a segunda-feira da semana em Brasília.
CREATE TABLE card_claims (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  week date NOT NULL,
  seq smallint NOT NULL CHECK (seq BETWEEN 1 AND 2),
  card_id integer NOT NULL REFERENCES legend_cards (id),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week, seq)
);

-- Inventário (RN-CRT-06/07): nunca repete; o número da cópia é a ordem de recebimento da carta
-- (0 = a lenda vinculada).
CREATE TABLE user_cards (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  card_id integer NOT NULL REFERENCES legend_cards (id),
  serial integer NOT NULL CHECK (serial >= 0),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id),
  UNIQUE (card_id, serial)
);
CREATE INDEX user_cards_card_idx ON user_cards (card_id);
