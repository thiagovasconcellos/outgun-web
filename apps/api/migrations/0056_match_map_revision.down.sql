-- SPDX-License-Identifier: GPL-2.0-or-later
DROP INDEX matches_map_id;
ALTER TABLE matches DROP COLUMN map_revision_inferred;
ALTER TABLE matches DROP COLUMN map_revision_id;
ALTER TABLE matches DROP COLUMN map_id;
