// SPDX-License-Identifier: GPL-2.0-or-later
import { describe, expect, it } from 'vitest';
import { CARD_CENTER_COLORS, CARD_CLASSES, CARD_RING_COLORS, cardChance, cardNickKey, cardSlug, legendCardProblems, type LegendCardInput } from './legend-cards.js';

const base = (o: Partial<LegendCardInput> = {}): LegendCardInput => ({
  nick: 'SLAN', epithet: '', position: 'Híbrido', bio: 'Primeiro parágrafo.\n\nSegundo.', class: 'especial', generations: [1, 2],
  clans: ['MK', 'Ek (Elite Killers)'], achievements: [{ icon: 'medalha', title: 'Campeão do CBDO', text: 'Pelo Ek.' }], traits: [], abilities: [],
  quote: 'No The Blunt, o temperamento forte virou título.', memory: '', ringColor: CARD_RING_COLORS[0]!, centerColor: CARD_CENTER_COLORS[1]!,
  linkedUserId: null, links: [{ nick: 'JARU' }], sources: '', ...o,
});

describe('cartas de jogador (OG-570)', () => {
  it('6 classes em ordem de raridade, 32 cores de centro', () => {
    expect(CARD_CLASSES.map((c) => c.tier)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(CARD_CENTER_COLORS).toHaveLength(32);
    expect(new Set(CARD_CENTER_COLORS).size).toBe(32);
  });
  it('ficha válida não tem problema', () => expect(legendCardProblems(base())).toEqual([]));
  it('recusa obrigatórios vazios e valores fora das listas', () => {
    expect(legendCardProblems(base({ nick: ' ', bio: '', quote: '' }))).toEqual(['nick', 'bio', 'quote']);
    expect(legendCardProblems(base({ class: 'rara' as never, ringColor: '#123456', centerColor: '#E02828' }))).toEqual(['class', 'ringColor', 'centerColor']);
    expect(legendCardProblems(base({ traits: [{ icon: 'foguete', title: 'x', text: '' }] }))).toEqual(['entries']);
    expect(legendCardProblems(base({ bio: 'x'.repeat(3001) }))).toEqual(['bio']);
  });
  it('nick normalizado e endereço', () => {
    expect(cardNickKey('Ek-Frogue')).toBe(cardNickKey('EK FROGUE'));
    expect(cardNickKey('Tainha*')).toBe('TAINHA');
    expect(cardSlug('Ek-FROGUE')).toBe('ek-frogue');
    expect(cardSlug('Ação!')).toBe('acao');
  });
  it('chance ignora classes sem carta', () => {
    const w = { classico: 50, epico: 25, lendario: 13, especial: 8, nefasto: 3.5, mitica: 0.5 };
    expect(cardChance(w, { classico: 2, mitica: 1 }, 'mitica')).toBeCloseTo(0.5 / 50.5);
    expect(cardChance(w, { classico: 2 }, 'classico')).toBeCloseTo(0.5);
    expect(cardChance(w, {}, 'classico')).toBe(0);
  });
});
