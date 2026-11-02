// SPDX-License-Identifier: GPL-2.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const regions = vi.hoisted(() => ({ list: [] as { region: string; pingUrl: string }[] }));
vi.mock('./api.js', () => ({ api: vi.fn(async () => ({ regions: regions.list })) }));

/** Módulo novo a cada teste (a medição fica guardada no módulo). */
const load = async () => {
  vi.resetModules();
  return import('./regions.js');
};

describe('região mais próxima (OG-545)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sem medição ainda, não espera: a API usa a região padrão', async () => {
    regions.list = [{ region: 'br', pingUrl: 'https://br/health' }];
    const { nearestRegion } = await load();
    expect(await nearestRegion()).toBeUndefined();
  });

  it('com uma região só, usa ela sem medir de novo (nada de espera na entrada)', async () => {
    regions.list = [{ region: 'br', pingUrl: 'https://br/health' }];
    const { measurePings, nearestRegion } = await load();
    await measurePings();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10 * 60_000); // medição velha
    // ping que nunca responde: se a entrada esperasse por ele, o teste travaria
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
    expect(await nearestRegion()).toBe('br');
  });

  it('com várias regiões e medição recente, a de menor ping', async () => {
    regions.list = [
      { region: 'es', pingUrl: 'https://es/health' },
      { region: 'br', pingUrl: 'https://br/health' },
    ];
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        now += url.includes('es') ? 200 : 30;
        return new Response('{}');
      }),
    );
    const { measurePings, nearestRegion, withRegion } = await load();
    await measurePings();
    expect(await nearestRegion()).toBe('br');
    expect(await withRegion({ name: 'x' })).toEqual({ name: 'x', region: 'br' });
  });
});
