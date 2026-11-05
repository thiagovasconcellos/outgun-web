// SPDX-License-Identifier: GPL-2.0-or-later
// Broche "Lenda" (OG-580, RN-CRT-09): ao lado do nick no portal, para quem já tirou a própria Carta de
// Jogador (cópia nº 0). Uma chamada a `/cards/legends` por carregamento da página; fora da partida.
import { useEffect, useSyncExternalStore, type CSSProperties } from 'react';
import { cardClass, type CardClassId } from '@outgun/protocol';
import { api } from '../app/api.js';
import { usePrefs } from '../app/prefs.js';

interface Legend {
  username: string;
  nick: string;
  class: CardClassId;
}
let legends: ReadonlyMap<string, Legend> | null = null;
let loading = false;
const listeners = new Set<() => void>();
const key = (name: string) => name.toLowerCase();

function load() {
  if (legends || loading) return;
  loading = true;
  api<{ legends: Legend[] }>('/cards/legends').then(
    (r) => {
      legends = new Map(r.legends.map((l) => [key(l.username), l]));
      for (const f of listeners) f();
    },
    () => {
      loading = false;
    },
  );
}
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};

export function LegendBadge({ username }: { readonly username: string }) {
  const { t } = usePrefs();
  const map = useSyncExternalStore(subscribe, () => legends);
  useEffect(load, []);
  const l = map?.get(key(username));
  if (!l) return null;
  const c = cardClass(l.class);
  return (
    <span className="legend-badge" style={{ '--c1': c.c1, '--c2': c.c2 } as CSSProperties} title={t('Legend of Outgun: $1, $2', l.nick, c.name)}>
      {t('Legend')}
    </span>
  );
}
