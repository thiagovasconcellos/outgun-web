// SPDX-License-Identifier: GPL-2.0-or-later
import { describe, expect, it } from 'vitest';
import { isCountryRegion, regionName } from './Flag.js';

describe('país da região (OG-547)', () => {
  it('só código de 2 letras é país', () => {
    expect(isCountryRegion('br')).toBe(true);
    expect(isCountryRegion('es')).toBe(true);
    expect(isCountryRegion('de')).toBe(true);
    expect(isCountryRegion('local')).toBe(false);
    expect(isCountryRegion('beta')).toBe(false);
    expect(isCountryRegion(null)).toBe(false);
  });
  it('nome do país na língua do jogador; o que não é país volta como veio', () => {
    expect(regionName('br', 'pt-BR')).toBe('Brasil');
    expect(regionName('es', 'pt-BR')).toBe('Espanha');
    expect(regionName('es', 'en')).toBe('Spain');
    expect(regionName('de', 'pt-BR')).toBe('Alemanha');
    expect(regionName('de', 'en')).toBe('Germany');
    expect(regionName('local', 'en')).toBe('local');
  });
});
