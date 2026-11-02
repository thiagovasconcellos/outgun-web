-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-546: região da sala fixa criada pelo próprio game server (a `main` de cada servidor). Uma sala
-- fixa com região só abre em servidor dessa região; nula = qualquer região (as da plataforma).
ALTER TABLE rooms ADD COLUMN region text;
