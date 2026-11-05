-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-576 (RN-CRT-04): aviso de resgates de carta liberados na semana.
ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK (kind IN ('clan_invite', 'clan_request', 'milestone', 'number_expiring', 'number_released', 'cup', 'cards'));
