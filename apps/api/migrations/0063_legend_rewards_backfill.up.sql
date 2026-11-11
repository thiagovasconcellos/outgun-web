-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-609 (RN-CRT-09): concessão retroativa da recompensa da lenda. Quem já tinha a carta quando a
-- conta foi vinculada a ela ficou com uma cópia numerada comum e sem o marco "A lenda em pessoa",
-- porque o resgate só dá a nº 0 e o marco se o vínculo já existe na hora do sorteio. O mesmo SQL
-- roda em `grantLegendRewards` (legend-card-claims.ts) quando a moderação grava o vínculo.
UPDATE user_cards uc SET serial = 0
FROM legend_cards lc
WHERE lc.id = uc.card_id AND lc.linked_user_id = uc.user_id AND uc.serial <> 0
  AND NOT EXISTS (SELECT 1 FROM user_cards z WHERE z.card_id = uc.card_id AND z.serial = 0);

WITH got AS (
  INSERT INTO player_milestones (user_id, milestone, achieved_at, match_id)
  SELECT uc.user_id, 'card_legend', uc.claimed_at, NULL
  FROM user_cards uc JOIN legend_cards lc ON lc.id = uc.card_id AND lc.linked_user_id = uc.user_id
  WHERE uc.serial = 0
  ON CONFLICT (user_id, milestone) DO NOTHING
  RETURNING user_id
)
INSERT INTO notifications (user_id, kind, data)
SELECT user_id, 'milestone', '{"milestones":["card_legend"]}'::jsonb FROM got;
