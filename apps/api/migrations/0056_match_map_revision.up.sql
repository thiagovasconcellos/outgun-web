-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-555 (D-91, RN-MRV-05): a partida aponta para o mapa e a revisão jogada. Nulos nas partidas de
-- mapas gerados; `map_revision_inferred` marca o preenchimento das antigas da moderação (revisão
-- vigente no início da partida, sem prova). O preenchimento roda depois da semente do catálogo.
ALTER TABLE matches ADD COLUMN map_id integer REFERENCES maps(id);
ALTER TABLE matches ADD COLUMN map_revision_id integer REFERENCES map_revisions(id);
ALTER TABLE matches ADD COLUMN map_revision_inferred boolean NOT NULL DEFAULT false;
CREATE INDEX matches_map_id ON matches (map_id);
