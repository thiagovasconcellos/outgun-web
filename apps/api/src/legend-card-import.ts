// SPDX-License-Identifier: GPL-2.0-or-later
// Importação das cartas já feitas (OG-581, RN-CRT-02/03, cuidados da RN-MRV-09): um JSON com as
// fichas (fora do repositório público, RN-CRT-08) passa pela mesma validação do painel; `--dry-run`
// só mostra o que aconteceria. Idempotente pela chave do nick: rodar de novo não duplica, e uma ficha
// que mudou vira uma revisão nova. Tudo numa transação.
import { cardNickKey, cardSlug, isCardClass, legendCardProblems, type LegendCardInput } from '@outgun/protocol';
import { eq } from 'drizzle-orm';
import type { Db } from './db/client.js';
import { adminActions, cardGenerations, legendCardRevisions, legendCards } from './db/schema.js';
import { canonical, cardInput, cleanCard } from './routes/legend-cards.js';

/** Uma ficha do arquivo: o formato do painel, com `cls` no lugar de `class` e campos extras ignorados. */
export interface ImportedCard extends Omit<LegendCardInput, 'class'> {
  cls?: string;
  class?: string;
  source?: string;
}

export interface ImportReport {
  dryRun: boolean;
  created: string[];
  updated: string[];
  unchanged: string[];
  problems: { nick: string; source?: string | undefined; problems: string[] }[];
}

export async function importLegendCards(db: Db, list: readonly ImportedCard[], o: { dryRun: boolean; note?: string }): Promise<ImportReport> {
  const report: ImportReport = { dryRun: o.dryRun, created: [], updated: [], unchanged: [], problems: [] };
  const gens = new Set((await db.select({ id: cardGenerations.id }).from(cardGenerations)).map((g) => g.id));
  const seen = new Map<string, string>();
  const ok: LegendCardInput[] = [];
  for (const raw of list) {
    const cls = raw.class ?? raw.cls ?? '';
    const card = cleanCard({ ...raw, class: (isCardClass(cls) ? cls : 'classico') as LegendCardInput['class'], linkedUserId: null } as Parameters<typeof cleanCard>[0]);
    const problems: string[] = legendCardProblems(card);
    if (!isCardClass(cls)) problems.push(`class:${cls}`);
    if (!card.generations.every((g) => gens.has(g))) problems.push('generations');
    const key = cardNickKey(card.nick);
    if (seen.has(key)) problems.push(`duplicate:${seen.get(key)}`);
    seen.set(key, card.nick);
    if (problems.length) report.problems.push({ nick: card.nick, source: raw.source, problems });
    else ok.push(card);
  }
  await db.transaction(async (tx) => {
    for (const card of ok) {
      const key = cardNickKey(card.nick);
      const [cur] = await tx.select().from(legendCards).where(eq(legendCards.nickKey, key));
      if (cur) {
        // a conta ligada fica como está no banco (o arquivo não traz contas)
        const next = { ...card, linkedUserId: cur.linkedUserId };
        if (canonical(cardInput(cur)) === canonical(next)) {
          report.unchanged.push(card.nick);
          continue;
        }
        report.updated.push(card.nick);
        if (o.dryRun) continue;
        const revision = cur.revision + 1;
        await tx.update(legendCards).set({ ...next, revision, updatedAt: new Date() }).where(eq(legendCards.id, cur.id));
        await tx.insert(legendCardRevisions).values({ cardId: cur.id, number: revision, data: { ...next }, note: o.note ?? 'Importação' });
        continue;
      }
      report.created.push(card.nick);
      if (o.dryRun) continue;
      let slug = cardSlug(card.nick);
      for (let i = 2; (await tx.select({ id: legendCards.id }).from(legendCards).where(eq(legendCards.slug, slug))).length; i++) slug = `${cardSlug(card.nick)}-${i}`;
      const [row] = await tx.insert(legendCards).values({ ...card, slug, nickKey: key }).returning({ id: legendCards.id });
      await tx.insert(legendCardRevisions).values({ cardId: row!.id, number: 1, data: { ...card }, note: o.note ?? 'Importação' });
    }
    if (!o.dryRun && (report.created.length || report.updated.length)) {
      await tx.insert(adminActions).values({ actorName: 'importação', action: 'card-import', reason: o.note ?? '', details: { via: 'cli', created: report.created.length, updated: report.updated.length } });
    }
  });
  return report;
}
