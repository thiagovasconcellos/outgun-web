-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-563 (D-92): contas que saíram do jogo Ranked em andamento e podem voltar à vaga, do heartbeat.
ALTER TABLE rooms ADD COLUMN away jsonb NOT NULL DEFAULT '[]'::jsonb;
