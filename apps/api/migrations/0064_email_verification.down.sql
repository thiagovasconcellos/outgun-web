-- SPDX-License-Identifier: GPL-2.0-or-later
DROP TABLE email_verifications;
ALTER TABLE users DROP COLUMN email_verified_at;
