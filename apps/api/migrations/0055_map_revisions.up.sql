-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-552 (D-91, RN-MRV-01..03): identidade estável de cada mapa (nativo, da moderação ou importado) e
-- revisões imutáveis. `key` é o nome usado nas rotações e partidas (`matches.map`); o título exibido
-- é o `P title` da revisão ativa. O texto fica em Latin-1 (um caractere = um byte), como os arquivos.
CREATE TABLE maps (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  origin text NOT NULL CHECK (origin IN ('native', 'panel', 'import')),
  active_revision integer,
  playable boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE map_revisions (
  id serial PRIMARY KEY,
  map_id integer NOT NULL REFERENCES maps(id),
  number integer NOT NULL,
  text text NOT NULL,
  sha256 text NOT NULL,
  crc integer NOT NULL,
  title text NOT NULL,
  author text NOT NULL DEFAULT '',
  width smallint NOT NULL,
  height smallint NOT NULL,
  published_by uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  provenance text NOT NULL,
  note text,
  base_revision integer,
  UNIQUE (map_id, number),
  UNIQUE (map_id, sha256)
);
-- nomes antigos (case-insensitive na busca) → mapa; nunca fundem nada sozinhos (RN-MRV-03)
CREATE TABLE map_aliases (
  alias text PRIMARY KEY,
  map_id integer NOT NULL REFERENCES maps(id)
);
CREATE INDEX map_aliases_lower ON map_aliases (lower(alias));

-- RN-MRV-02: revisão não se apaga nem muda de conteúdo. Só a conciliação de duplicatas (OG-560) muda
-- `map_id`/`number` de uma revisão, na mesma transação que liga os mapas.
CREATE FUNCTION map_revisions_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'map revisions are never deleted';
  END IF;
  IF (NEW.text, NEW.sha256, NEW.crc, NEW.title, NEW.author, NEW.width, NEW.height, NEW.published_at, NEW.provenance)
     IS DISTINCT FROM (OLD.text, OLD.sha256, OLD.crc, OLD.title, OLD.author, OLD.width, OLD.height, OLD.published_at, OLD.provenance) THEN
    RAISE EXCEPTION 'map revisions are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER map_revisions_immutable BEFORE UPDATE OR DELETE ON map_revisions FOR EACH ROW EXECUTE FUNCTION map_revisions_immutable();
