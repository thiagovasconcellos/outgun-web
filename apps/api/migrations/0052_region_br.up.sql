-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-547: a região passa a ser o código do país (ISO 3166-1, RN-REG-04); o servidor do beta, `beta`,
-- vira `br` (São Paulo). O heartbeat seguinte já manda `br`; isto acerta o histórico.
UPDATE game_servers SET region = 'br' WHERE region = 'beta';
UPDATE net_reports SET region = 'br' WHERE region = 'beta';
