-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-550: versão de cada game server (do heartbeat), para o painel mostrar se um satélite ficou para trás.
ALTER TABLE game_servers ADD COLUMN release text;
