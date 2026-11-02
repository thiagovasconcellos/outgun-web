-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-540 (issue #29): imagens coladas ou anexadas no campo de evidências do relato de bug. Ficam no
-- banco (até 2 MB cada, PNG, JPEG ou WebP) e saem por um endereço público não adivinhável, que a
-- issue do GitHub mostra como imagem.
CREATE TABLE feedback_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_images_user_idx ON feedback_images (user_id, created_at);
