// SPDX-License-Identifier: GPL-2.0-or-later
// Ping por região (OG-545, RN-REG-01): medido uma vez e compartilhado pela lista de salas e por todas
// as entradas que abrem ou escolhem sala ("Jogar agora", entrar rápido, sala privada, Ranked e a
// entrada numa sala da plataforma que ainda não está no ar), para cada uma ir à região mais próxima.
import { useEffect, useState } from 'react';
import { api } from './api.js';

export type Pings = ReadonlyMap<string, number>;

/** Medição recente o bastante para escolher a região sem medir de novo. */
const FRESH_MS = 60_000;
/** Quem entra não espera mais que isso pela medição; sem ela, a API usa a região padrão. */
const WAIT_MS = 1_500;

let last: { at: number; pings: Pings } | undefined;
let running: Promise<Pings> | undefined;
const listeners = new Set<(pings: Pings) => void>();

/** Menor de 3 `GET <pingUrl>` (o /health do game server); região fora do ar fica sem ping. */
async function ping(url: string): Promise<number | undefined> {
  let best = Infinity;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    try {
      await fetch(url, { cache: 'no-store' });
      best = Math.min(best, performance.now() - t0);
    } catch {
      // fora do ar
    }
  }
  return best < Infinity ? Math.round(best) : undefined;
}

async function measure(): Promise<Pings> {
  const { regions } = await api<{ regions: { region: string; pingUrl: string }[] }>('/regions');
  const results = await Promise.all(
    regions.map(async ({ region, pingUrl }) => [region, await ping(pingUrl)] as const),
  );
  const pings = new Map<string, number>();
  for (const [region, ms] of results) if (ms !== undefined) pings.set(region, ms);
  return pings;
}

/** Mede de novo (uma medição por vez) e avisa quem usa `usePings`. */
export function measurePings(): Promise<Pings> {
  running ??= measure()
    .then((pings) => {
      last = { at: Date.now(), pings };
      for (const l of listeners) l(pings);
      return pings;
    })
    .catch(() => last?.pings ?? new Map<string, number>())
    .finally(() => {
      running = undefined;
    });
  return running;
}

/** Região de menor ping. */
export function bestRegion(pings: Pings): string | undefined {
  return [...pings].sort((a, b) => a[1] - b[1])[0]?.[0];
}

/**
 * Região mais próxima para abrir ou escolher sala: a da medição recente, ou mede agora esperando no
 * máximo `WAIT_MS`. Sem medição, `undefined` (a API usa a região padrão da plataforma).
 */
export async function nearestRegion(): Promise<string | undefined> {
  if (last && Date.now() - last.at < FRESH_MS) return bestRegion(last.pings);
  const timeout = new Promise<undefined>((resolve) =>
    setTimeout(() => resolve(undefined), WAIT_MS),
  );
  const pings = await Promise.race([measurePings(), timeout]);
  return bestRegion(pings ?? last?.pings ?? new Map());
}

/** Corpo com a região mais próxima, para os pedidos que abrem ou escolhem sala. */
export async function withRegion<T extends object>(body: T): Promise<T & { region?: string }> {
  const region = await nearestRegion();
  return region ? { ...body, region } : body;
}

/** Ping de cada região (ms), atualizado a cada 30 s enquanto a tela estiver aberta. */
export function usePings(): Pings {
  const [pings, setPings] = useState<Pings>(() => last?.pings ?? new Map());
  useEffect(() => {
    listeners.add(setPings);
    void measurePings();
    const id = setInterval(() => void measurePings(), 30_000);
    return () => {
      listeners.delete(setPings);
      clearInterval(id);
    };
  }, []);
  return pings;
}

/** Começa a medir cedo (tela inicial), para o "Jogar agora" não esperar. */
export function useWarmPings(): void {
  useEffect(() => {
    if (!last || Date.now() - last.at >= FRESH_MS) void measurePings();
  }, []);
}
