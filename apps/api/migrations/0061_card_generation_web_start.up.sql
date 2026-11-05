-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-581 (P10): a 4ª geração (Outgun Web) começa na primeira partida ranqueada da versão web,
-- pela decisão do PO em 2026-11-05. A data sai do próprio banco (horário de Brasília).
UPDATE card_generations
  SET started_on = (SELECT (min(started_at) AT TIME ZONE 'America/Sao_Paulo')::date FROM matches WHERE ranked)
  WHERE ord = 4 AND started_on IS NULL;
UPDATE card_generations
  SET story = 'O Outgun volta como jogo web e na Steam, com contas, ranking, clãs, OutCup e as Cartas de Jogador. A era começa na primeira partida ranqueada da versão web.'
  WHERE ord = 4;
