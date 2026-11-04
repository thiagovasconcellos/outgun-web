// SPDX-License-Identifier: GPL-2.0-or-later
// Histórico de um mapa no painel (OG-558, D-91): todas as revisões (imutáveis), baixar o TXT de
// qualquer uma (só aqui, para moderadores, RN-MRV-11), comparar duas lado a lado com o resumo do que
// mudou e restaurar uma antiga como a ativa (as intermediárias ficam).
import { parseMapFile } from '@outgun/content';
import type { GameMap, Wall, WorldCoords } from '@outgun/sim';
import { useEffect, useState } from 'react';
import { api, API_URL, ApiError } from '../app/api.js';
import { usePrefs } from '../app/prefs.js';
import { Button } from '../ui/Button.js';
import { Dialog } from '../ui/Dialog.js';
import { ChoiceField } from '../ui/Field.js';
import { Table } from '../ui/Table.js';
import { MapDrawing } from './MapPreview.js';

export interface MapRevisionRow {
  number: number;
  title: string;
  author: string;
  width: number;
  height: number;
  crc: number;
  sha256: string;
  provenance: string;
  note: string | null;
  baseRevision: number | null;
  publishedBy: string | null;
  publishedAt: string;
  active: boolean;
  draft?: boolean;
}

/** Contagens de um mapa para o resumo da comparação. */
function census(map: GameMap) {
  let walls = 0;
  let ground = 0;
  let circles = 0;
  for (const column of map.rooms)
    for (const room of column) {
      walls += room.walls.length;
      ground += room.ground.length;
      circles += room.walls.filter((w: Wall) => w.kind === 'circ').length;
    }
  return { walls, ground, circles, flags: map.teams.map((t) => t.flags.length), spawns: map.teams.map((t) => t.spawn.length) };
}

const near = (a: WorldCoords | undefined, b: WorldCoords | undefined) => !!a && !!b && a.room.x === b.room.x && a.room.y === b.room.y && Math.hypot(a.x - b.x, a.y - b.y) < 1;

/**
 * O que mudou de `a` para `b` (OG-558): tamanho, paredes, chão, bandeiras, spawns e bases trocadas
 * (a bandeira vermelha de uma está onde a azul da outra estava). Textos já traduzidos.
 */
export function mapChanges(a: GameMap, b: GameMap, t: (text: string, ...args: string[]) => string): string[] {
  const out: string[] = [];
  if (a.title !== b.title) out.push(t('Title: $1 > $2', a.title, b.title));
  if (a.author !== b.author) out.push(t('Author: $1 > $2', a.author || '—', b.author || '—'));
  if (a.width !== b.width || a.height !== b.height) out.push(t('Size: $1 > $2', `${a.width}×${a.height}`, `${b.width}×${b.height}`));
  const ca = census(a);
  const cb = census(b);
  if (ca.walls !== cb.walls) out.push(t('Walls: $1 > $2', String(ca.walls), String(cb.walls)));
  if (ca.circles !== cb.circles) out.push(t('Circular walls: $1 > $2', String(ca.circles), String(cb.circles)));
  if (ca.ground !== cb.ground) out.push(t('Floor pieces: $1 > $2', String(ca.ground), String(cb.ground)));
  for (const team of [0, 1] as const) {
    const name = team === 0 ? t('red') : t('blue');
    if (ca.flags[team] !== cb.flags[team]) out.push(t('Flags ($1): $2 > $3', name, String(ca.flags[team]), String(cb.flags[team])));
    if (ca.spawns[team] !== cb.spawns[team]) out.push(t('Spawn points ($1): $2 > $3', name, String(ca.spawns[team]), String(cb.spawns[team])));
  }
  const swapped = near(a.teams[0].flags[0], b.teams[1].flags[0]) && near(a.teams[1].flags[0], b.teams[0].flags[0]);
  if (swapped) out.push(t('Bases swapped: red is where blue was.'));
  else if (!near(a.teams[0].flags[0], b.teams[0].flags[0]) || !near(a.teams[1].flags[0], b.teams[1].flags[0])) out.push(t('Flags moved.'));
  if (out.length === 0) out.push(t('Same geometry (only text or comments changed).'));
  return out;
}

/** Geometria de uma revisão (texto público imutável da API). */
async function revisionMap(key: string, n: number): Promise<GameMap | null> {
  const res = await fetch(`${API_URL}/maps/${encodeURIComponent(key)}/rev/${n}.txt`);
  if (!res.ok) return null;
  const r = parseMapFile(`${key}.txt`, new Uint8Array(await res.arrayBuffer()));
  return r.ok ? r.map : null;
}

/** Baixa o TXT de uma revisão (bytes exatos) — rota do painel, só moderadores. */
async function download(key: string, n: number): Promise<void> {
  const res = await fetch(`${API_URL}/admin/maps/${encodeURIComponent(key)}/revisions/${n}.txt`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = `${key} (rev ${n}).txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MapHistory({ map, onClose, onChanged }: { readonly map: { key: string; title: string }; readonly onClose: () => void; readonly onChanged: () => void }) {
  const { t } = usePrefs();
  const [rows, setRows] = useState<MapRevisionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [pair, setPair] = useState<[GameMap, GameMap] | null>(null);
  /** Rascunho mais antigo que a ativa: o primeiro clique só avisa (OG-562). */
  const [armed, setArmed] = useState<number | null>(null);
  const load = () =>
    api<{ revisions: MapRevisionRow[] }>(`/admin/maps/${encodeURIComponent(map.key)}/revisions`).then(
      (r) => {
        setRows(r.revisions);
        const active = r.revisions.find((x) => x.active)?.number ?? r.revisions[0]?.number;
        const previous = r.revisions.find((x) => x.number !== active)?.number;
        setRight(active ? String(active) : '');
        setLeft(previous ? String(previous) : '');
      },
      (e: unknown) => setError(e instanceof ApiError ? e.message : String(e)),
    );
  useEffect(() => void load(), [map.key]);
  useEffect(() => {
    setPair(null);
    if (!left || !right || left === right) return;
    let alive = true;
    void Promise.all([revisionMap(map.key, Number(left)), revisionMap(map.key, Number(right))]).then(([a, b]) => alive && a && b && setPair([a, b]));
    return () => {
      alive = false;
    };
  }, [map.key, left, right]);
  const restore = (n: number) =>
    api(`/admin/maps/${encodeURIComponent(map.key)}/restore`, { body: { revision: n } }).then(
      () => {
        void load();
        onChanged();
      },
      (e: unknown) => setError(e instanceof ApiError ? e.message : String(e)),
    );
  const options = (rows ?? []).map((r) => ({ value: String(r.number), label: t('Revision $1', String(r.number)) }));
  return (
    <Dialog open title={t('History of $1', map.title)} onClose={onClose} closeLabel={t('Close')} className="admin-map-history">
      {error && (
        <p className="stats-note error" role="alert">
          {error}
        </p>
      )}
      <Table
        caption={t('Revisions')}
        rows={rows ?? []}
        rowKey={(r) => String(r.number)}
        empty={t('Loading...')}
        columns={[
          { key: 'n', header: '#', cell: (r) => (r.active ? `${r.number} ★` : r.draft ? `${r.number} (${t('draft')})` : r.number), align: 'end' },
          { key: 'title', header: t('Title'), cell: (r) => `${r.title} · ${r.author || '—'}` },
          { key: 'by', header: t('By'), cell: (r) => `${r.publishedBy ?? '—'} · ${new Date(r.publishedAt).toLocaleString()}` },
          { key: 'origin', header: t('Origin'), cell: (r) => [r.provenance, r.baseRevision ? t('from revision $1', String(r.baseRevision)) : '', r.note ?? ''].filter(Boolean).join(' · ') },
          {
            key: 'actions',
            header: '',
            align: 'end',
            cell: (r) => (
              <span className="admin-row-actions">
                <Button variant="ghost" onClick={() => void download(map.key, r.number).catch((e: unknown) => setError(String(e)))}>
                  {t('Download TXT')}
                </Button>
                {!r.active && (
                  <Button
                    variant={armed === r.number ? 'danger' : 'ghost'}
                    onClick={() => {
                      const activeNumber = rows?.find((x) => x.active)?.number ?? 0;
                      if (r.draft && r.number < activeNumber && armed !== r.number) return setArmed(r.number);
                      setArmed(null);
                      void restore(r.number);
                    }}
                  >
                    {armed === r.number ? t('Older than the active revision: activate anyway?') : r.draft ? t('Activate this draft') : t('Restore')}
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
      {(rows?.length ?? 0) > 1 && (
        <>
          <h4>{t('Compare')}</h4>
          <div className="ui-row">
            <ChoiceField label={t('Before')} value={left} onChange={setLeft} options={options} />
            <ChoiceField label={t('After')} value={right} onChange={setRight} options={options} />
          </div>
          {pair && (
            <>
              <div className="admin-map-compare">
                <MapDrawing map={pair[0]} label={t('Revision $1', left)} />
                <MapDrawing map={pair[1]} label={t('Revision $1', right)} />
              </div>
              <ul className="stats-note">
                {mapChanges(pair[0], pair[1], t).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
