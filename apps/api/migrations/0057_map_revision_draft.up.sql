-- SPDX-License-Identifier: GPL-2.0-or-later
-- OG-562 (RN-MRV-10): revisão publicada como rascunho — numerada e imutável como as outras, mas não
-- vira a ativa nem entra em rotação; só um moderador a escolhe numa sala privada Casual.
ALTER TABLE map_revisions ADD COLUMN draft boolean NOT NULL DEFAULT false;
