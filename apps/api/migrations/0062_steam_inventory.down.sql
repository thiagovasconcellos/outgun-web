-- SPDX-License-Identifier: GPL-2.0-or-later
DROP TABLE card_steam_grants;
ALTER TABLE legend_cards DROP COLUMN steam;
DROP INDEX users_steam_id_idx;
ALTER TABLE users DROP COLUMN steam_linked_at;
ALTER TABLE users DROP COLUMN steam_id;
