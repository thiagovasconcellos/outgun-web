// SPDX-License-Identifier: GPL-2.0-or-later
// Aba "Cartas" do painel (OG-573/574/575, D-94, RN-CRT-02/03/05): catálogo, ficha com revisões,
// formulário com a carta ao vivo, chances por classe e gerações. Qualquer moderador cria e edita
// (salvar publica na hora); gerações, só admin. No celular, só a consulta (D-80).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  CARD_CENTER_COLORS,
  CARD_CLASSES,
  CARD_ICONS,
  CARD_LIMITS,
  CARD_RING_COLORS,
  cardChance,
  cardClass,
  cardFilledFields,
  cardParagraphs,
  legendCardProblems,
  type CardClassId,
  type CardEntry,
  type LegendCardInput,
} from '@outgun/protocol';
import { api, ApiError } from '../app/api.js';
import { isPhone } from '../app/phone.js';
import { usePrefs } from '../app/prefs.js';
import { Badge, Button } from '../ui/Button.js';
import { ChoiceField, TextAreaField, TextField } from '../ui/Field.js';
import { PlayerCard } from '../ui/PlayerCard.js';
import { Table } from '../ui/Table.js';

type T = (s: string, ...a: string[]) => string;
const errorText = (e: unknown) => (e instanceof ApiError ? e.message : String(e));
const when = (iso: string) => new Date(iso).toLocaleString();

function useLoad<D>(path: string | null): { data: D | undefined; error: string | null; reload: () => void } {
  const [state, setState] = useState<{ data: D | undefined; error: string | null }>({ data: undefined, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<D>(path).then(
      (data) => alive && setState({ data, error: null }),
      (e: unknown) => alive && setState((s) => ({ data: s.data, error: errorText(e) })),
    );
    return () => {
      alive = false;
    };
  }, [path, tick]);
  return { ...state, reload: useCallback(() => setTick((n) => n + 1), []) };
}

function Status({ text, error }: { text?: string | null | undefined; error?: string | null | undefined }): ReactNode {
  if (error) return <p className="stats-note error" role="alert">{error}</p>;
  return text ? <p className="stats-note" role="status">{text}</p> : null;
}

interface CatalogCard {
  id: number;
  slug: string;
  nick: string;
  epithet: string;
  position: string;
  class: CardClassId;
  generations: number[];
  clans: string[];
  ringColor: string;
  centerColor: string;
  active: boolean;
  filled: number;
  owners: number;
  revision: number;
  updatedAt: string;
  updatedBy: string | null;
}
interface Generation {
  id: number;
  ord: number;
  name: string;
  description: string;
  active: boolean;
  cards: number;
}
interface Revision {
  number: number;
  data: Partial<LegendCardInput>;
  note: string;
  editedAt: string;
  editedBy: string | null;
}
interface CardDetail {
  card: LegendCardInput & { id: number; slug: string; active: boolean; revision: number; linkedUsername: string | null; createdBy: string | null; createdAt: string; updatedBy: string | null; updatedAt: string; owners: number };
  revisions: Revision[];
}
interface OddsRow {
  class: CardClassId;
  weight: number;
  activeCards: number;
}

type View = { kind: 'catalog' } | { kind: 'card'; id: number } | { kind: 'edit'; id: number | null } | { kind: 'odds' };

export function CardsTab({ isAdmin }: { readonly isAdmin: boolean }) {
  const { t } = usePrefs();
  const [view, setView] = useState<View>({ kind: 'catalog' });
  const phone = isPhone();
  const gens = useLoad<{ generations: Generation[] }>('/admin/card-generations');
  const nav: [View['kind'], string][] = [
    ['catalog', t('Catalog')],
    ...(phone ? [] : ([['edit', t('New card')], ['odds', t('Odds and generations')]] as [View['kind'], string][])),
  ];
  const go = (k: View['kind']) => setView(k === 'edit' ? { kind: 'edit', id: null } : k === 'odds' ? { kind: 'odds' } : { kind: 'catalog' });
  return (
    <section className="admin-tab admin-cards">
      <p className="stats-tabs" role="tablist" aria-label={t('Cards')}>
        {nav.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view.kind === k && !(k === 'edit' && view.kind === 'edit' && view.id !== null)} className={view.kind === k ? 'active' : ''} onClick={() => go(k)}>
            {label}
          </button>
        ))}
      </p>
      {view.kind === 'catalog' && <Catalog t={t} gens={gens.data?.generations ?? []} open={(id) => setView({ kind: 'card', id })} />}
      {view.kind === 'card' && <CardSheet t={t} id={view.id} gens={gens.data?.generations ?? []} phone={phone} back={() => setView({ kind: 'catalog' })} edit={() => setView({ kind: 'edit', id: view.id })} />}
      {view.kind === 'edit' && <CardForm key={view.id ?? 'new'} t={t} id={view.id} gens={gens.data?.generations ?? []} done={(id) => setView({ kind: 'card', id })} cancel={() => setView(view.id ? { kind: 'card', id: view.id } : { kind: 'catalog' })} />}
      {view.kind === 'odds' && <OddsAndGenerations t={t} isAdmin={isAdmin} gens={gens} />}
    </section>
  );
}

const Swatch = ({ ring, center }: { ring: string; center: string }) => <span className="admin-card-dot" style={{ background: ring, boxShadow: `inset 0 0 0 3px ${center}` }} aria-hidden="true" />;
const ClassBadge = ({ cls }: { cls: CardClassId }) => {
  const c = cardClass(cls);
  return (
    <span className="admin-card-class" style={{ color: c.c2, borderColor: c.c1 }}>
      {c.name} {'★'.repeat(c.tier + 1)}
    </span>
  );
};
const genLabel = (ids: readonly number[], gens: readonly Generation[]) =>
  ids
    .map((id) => gens.find((g) => g.id === id))
    .filter(Boolean)
    .sort((a, b) => a!.ord - b!.ord)
    .map((g) => g!.name)
    .join(', ') || '—';

// --- catálogo (OG-573) ---
function Catalog({ t, gens, open }: { t: T; gens: Generation[]; open: (id: number) => void }) {
  const [q, setQ] = useState('');
  const [cls, setCls] = useState<'' | CardClassId>('');
  const [gen, setGen] = useState('');
  const [state, setState] = useState<'' | 'true' | 'false'>('');
  const params = new URLSearchParams({ ...(q.trim() ? { q: q.trim() } : {}), ...(cls ? { class: cls } : {}), ...(gen ? { generation: gen } : {}), ...(state ? { active: state } : {}) });
  const list = useLoad<{ cards: CatalogCard[]; totals: { class: CardClassId; active: boolean; count: number }[] }>(`/admin/cards?${params}`);
  const totals = list.data?.totals ?? [];
  const sum = (f: (r: (typeof totals)[number]) => boolean) => totals.filter(f).reduce((s, r) => s + r.count, 0);
  return (
    <>
      <div className="admin-card-tiles">
        <div>
          <b>{sum((r) => r.active)}</b>
          <small>{t('active cards')}</small>
        </div>
        <div>
          <b>{sum((r) => !r.active)}</b>
          <small>{t('deactivated')}</small>
        </div>
        {CARD_CLASSES.map((c) => (
          <div key={c.id}>
            <b style={{ color: c.c2 }}>{sum((r) => r.active && r.class === c.id)}</b>
            <small>{c.name}</small>
          </div>
        ))}
      </div>
      <div className="admin-bar">
        <TextField label={t('Search by nick, epithet or clan')} value={q} maxLength={40} onChange={setQ} />
        <ChoiceField label={t('Class')} value={cls} onChange={setCls} options={[{ value: '' as const, label: t('All') }, ...CARD_CLASSES.map((c) => ({ value: c.id, label: c.name }))]} />
        <ChoiceField label={t('Generation')} value={gen} onChange={setGen} options={[{ value: '', label: t('All') }, ...gens.map((g) => ({ value: String(g.id), label: g.name }))]} />
        <ChoiceField label={t('Status')} value={state} onChange={setState} options={[{ value: '' as const, label: t('All') }, { value: 'true' as const, label: t('Active') }, { value: 'false' as const, label: t('Deactivated') }]} />
        <span className="admin-summary">
          <Badge>{t('$1 cards', String(list.data?.cards.length ?? 0))}</Badge>
          <Status error={list.error} />
        </span>
      </div>
      <Table
        phoneCards
        caption={t('Player cards')}
        rows={list.data?.cards ?? []}
        rowKey={(c) => String(c.id)}
        onRowActivate={(c) => open(c.id)}
        empty={t('No cards yet.')}
        columns={[
          {
            key: 'nick',
            header: t('Nick'),
            cell: (c) => (
              <span className="admin-card-nick">
                <Swatch ring={c.ringColor} center={c.centerColor} />
                <b>{c.nick}</b>
                {c.epithet && <small> {c.epithet}</small>}
              </span>
            ),
          },
          { key: 'class', header: t('Class'), cell: (c) => <ClassBadge cls={c.class} /> },
          { key: 'position', header: t('Position'), cell: (c) => c.position || '—', hideOnPhone: true },
          { key: 'gen', header: t('Generation'), cell: (c) => genLabel(c.generations, gens), hideOnPhone: true },
          { key: 'status', header: t('Status'), cell: (c) => (c.active ? <Badge tone="success">{t('Active')}</Badge> : <Badge tone="danger">{t('Deactivated')}</Badge>) },
          { key: 'filled', header: t('Sheet'), cell: (c) => `${c.filled}/11`, align: 'end', hideOnPhone: true },
          { key: 'owners', header: t('Owners'), cell: (c) => c.owners, align: 'end' },
          { key: 'edited', header: t('Last edit'), cell: (c) => <small>{`${when(c.updatedAt)} · ${c.updatedBy ?? '—'}`}</small>, hideOnPhone: true },
        ]}
      />
    </>
  );
}

// --- ficha (OG-573) ---
const FIELD_NAMES: [keyof LegendCardInput, string][] = [
  ['nick', 'Nick'],
  ['epithet', 'Epithet'],
  ['position', 'Position'],
  ['class', 'Class'],
  ['bio', 'Biography'],
  ['quote', 'Golden quote'],
  ['memory', 'Memory'],
  ['clans', 'Clans'],
  ['generations', 'Generation'],
  ['ringColor', 'Ring color'],
  ['centerColor', 'Center color'],
  ['achievements', 'Achievements'],
  ['traits', 'Traits'],
  ['abilities', 'Special abilities'],
  ['linkedUserId', 'Current account'],
  ['links', 'Linked cards'],
  ['sources', 'Sources'],
];
function showValue(k: keyof LegendCardInput, v: unknown, gens: readonly Generation[]): string {
  if (v == null || v === '') return '—';
  if (k === 'class') return cardClass(String(v)).name;
  if (k === 'generations') return genLabel(v as number[], gens);
  if (k === 'clans') return (v as string[]).join(', ') || '—';
  if (k === 'links') return (v as { nick: string }[]).map((l) => l.nick).join(', ') || '—';
  if (Array.isArray(v)) return (v as CardEntry[]).map((e) => e.title).join(', ') || '—';
  const s = String(v);
  return s.length > 180 ? `${s.slice(0, 180)}...` : s;
}
function diffRev(a: Partial<LegendCardInput> | undefined, b: Partial<LegendCardInput>, gens: readonly Generation[], t: T) {
  if (!a) return [];
  return FIELD_NAMES.filter(([k]) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map(([k, n]) => ({ name: t(n), from: showValue(k, a[k], gens), to: showValue(k, b[k], gens) }));
}

function checklist(c: LegendCardInput, t: T) {
  const problems = new Set(legendCardProblems(c));
  return [
    { text: t('Nick, class and colors'), ok: !['nick', 'class', 'ringColor', 'centerColor'].some((p) => problems.has(p as never)), required: true },
    { text: t('Biography'), ok: !problems.has('bio'), required: true },
    { text: t('Golden quote'), ok: !problems.has('quote'), required: true },
    { text: t('Position and generation'), ok: Boolean(c.position && c.generations.length) },
    { text: t('Clans'), ok: c.clans.length > 0 },
    { text: t('At least 1 trait and 1 ability'), ok: c.traits.length > 0 && c.abilities.length > 0 },
    { text: t('Sources'), ok: Boolean(c.sources.trim()) },
  ];
}
const Checklist = ({ card, t }: { card: LegendCardInput; t: T }) => (
  <ul className="admin-card-checks">
    {checklist(card, t).map((x) => (
      <li key={x.text} className={x.ok ? 'ok' : x.required ? 'missing' : 'warn'}>
        {x.text}
      </li>
    ))}
  </ul>
);

function CardSheet({ t, id, gens, phone, back, edit }: { t: T; id: number; gens: Generation[]; phone: boolean; back: () => void; edit: () => void }) {
  const d = useLoad<CardDetail>(`/admin/cards/${id}`);
  const odds = useLoad<{ classes: OddsRow[] }>('/admin/card-odds');
  const [status, setStatus] = useState<{ text?: string; error?: string }>({});
  const [confirm, setConfirm] = useState(false);
  const c = d.data?.card;
  if (!c) return <Status error={d.error} text={t('Loading...')} />;
  const weights = Object.fromEntries((odds.data?.classes ?? []).map((o) => [o.class, o.weight]));
  const counts = Object.fromEntries((odds.data?.classes ?? []).map((o) => [o.class, o.activeCards]));
  const chance = c.active ? cardChance(weights, counts, c.class) : 0;
  const revs = d.data!.revisions;
  const toggle = () =>
    api(`/admin/cards/${id}/active`, { method: 'PUT', body: { active: !c.active } }).then(
      () => {
        setConfirm(false);
        setStatus({ text: c.active ? t('Card deactivated: it left the draw.') : t('Card active again.') });
        d.reload();
      },
      (e: unknown) => setStatus({ error: errorText(e) }),
    );
  const restore = (n: number) =>
    api(`/admin/cards/${id}/restore`, { body: { revision: n } }).then(
      () => {
        setStatus({ text: t('Back to revision $1.', String(n)) });
        d.reload();
      },
      (e: unknown) => setStatus({ error: errorText(e) }),
    );
  const cls = cardClass(c.class);
  return (
    <div className="admin-card-sheet" style={{ '--c1': cls.c1, '--c2': cls.c2 } as CSSProperties}>
      <div className="admin-row-actions">
        <Button variant="ghost" onClick={back}>
          {t('Back to the catalog')}
        </Button>
        <Status text={status.text} error={status.error} />
      </div>
      <div className="admin-card-head">
        <h3>{c.nick}</h3>
        <ClassBadge cls={c.class} />
        {c.active ? <Badge tone="success">{t('Active')}</Badge> : <Badge tone="danger">{t('Deactivated')}</Badge>}
        <small className="admin-muted">
          /cartas/{c.slug} · {t('revision $1', String(c.revision))} · {when(c.updatedAt)} · {c.updatedBy ?? '—'}
        </small>
      </div>
      <div className="admin-card-grid">
        <aside>
          <PlayerCard look={c} />
          {!phone && (
            <div className="admin-card-actions">
              <Button variant="primary" onClick={edit}>
                {t('Edit sheet')}
              </Button>
              {confirm ? (
                <>
                  <Button variant="danger" onClick={() => void toggle()}>
                    {t('Confirm: deactivate $1', c.nick)}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirm(false)}>
                    {t('No')}
                  </Button>
                </>
              ) : c.active ? (
                <Button variant="danger" onClick={() => setConfirm(true)}>
                  {t('Deactivate')}
                </Button>
              ) : (
                <Button onClick={() => void toggle()}>{t('Activate again')}</Button>
              )}
              {c.active && <small className="admin-muted">{t('Deactivated cards leave the draw; whoever has it keeps it.')}</small>}
            </div>
          )}
          <Link to={`/cartas/${c.slug}`}>{t('See the card page')}</Link>
        </aside>
        <div className="admin-card-main">
          <div className="admin-card-two">
            <div>
              <h4>{t('Sheet')}</h4>
              <Checklist card={c} t={t} />
            </div>
            <div>
              <h4>{t('In the collection')}</h4>
              <div className="admin-card-tiles">
                <div>
                  <b>{c.owners}</b>
                  <small>{t('players have it')}</small>
                </div>
                <div>
                  <b>{chance ? `${(chance * 100).toLocaleString(undefined, { maximumFractionDigits: chance < 0.01 ? 2 : 1 })} %` : '—'}</b>
                  <small>{t('chance per claim')}</small>
                </div>
              </div>
            </div>
          </div>
          <dl className="admin-card-facts">
            <dt>{t('Position')}</dt>
            <dd>{c.position || '—'}</dd>
            <dt>{t('Generation')}</dt>
            <dd>{genLabel(c.generations, gens)}</dd>
            <dt>{t('Clans')}</dt>
            <dd>{c.clans.join(' > ') || '—'}</dd>
            <dt>{t('Created by')}</dt>
            <dd>
              {c.createdBy ?? '—'} · {when(c.createdAt)}
            </dd>
            <dt>{t('Current account')}</dt>
            <dd>{c.linkedUsername ?? '—'}</dd>
            <dt>{t('Sources')}</dt>
            <dd>{c.sources || '—'}</dd>
          </dl>
          {c.quote && <p className="admin-card-quote">"{c.quote}"</p>}
          <div className="admin-card-bio">
            {cardParagraphs(c.bio).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <h4>{t('Revisions')}</h4>
          <Table
            caption={t('Revisions')}
            rows={revs}
            rowKey={(r) => String(r.number)}
            columns={[
              { key: 'n', header: t('Rev.'), cell: (r) => <b>{r.number}</b> },
              { key: 'at', header: t('When'), cell: (r) => when(r.editedAt) },
              { key: 'by', header: t('Who'), cell: (r) => r.editedBy ?? '—' },
              {
                key: 'what',
                header: t('What changed'),
                cell: (r) => {
                  const prev = revs.find((x) => x.number === r.number - 1)?.data;
                  const diff = diffRev(prev, r.data, gens, t);
                  return (
                    <div className="admin-card-diff">
                      <span>{r.note || (r.number === 1 ? t('Card created') : t('Sheet edited'))}</span>
                      {diff.length > 0 && (
                        <details>
                          <summary>{t('$1 fields', String(diff.length))}</summary>
                          {diff.map((x) => (
                            <div key={x.name}>
                              <b>{x.name}:</b> <del>{x.from}</del> <ins>{x.to}</ins>
                            </div>
                          ))}
                        </details>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'restore',
                header: '',
                align: 'end',
                cell: (r) =>
                  r.number !== c.revision && !phone ? (
                    <Button variant="ghost" onClick={() => void restore(r.number)}>
                      {t('Restore')}
                    </Button>
                  ) : null,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// --- formulário (OG-574) ---
const EMPTY: LegendCardInput = {
  nick: '',
  epithet: '',
  position: '',
  bio: '',
  class: 'classico',
  generations: [],
  clans: [],
  achievements: [],
  traits: [],
  abilities: [],
  quote: '',
  memory: '',
  ringColor: CARD_RING_COLORS[0]!,
  centerColor: CARD_CENTER_COLORS[0]!,
  linkedUserId: null,
  links: [],
  sources: '',
};
const pickInput = (c: LegendCardInput): LegendCardInput => Object.fromEntries(Object.keys(EMPTY).map((k) => [k, c[k as keyof LegendCardInput]])) as unknown as LegendCardInput;

function Entries({ t, label, list, onChange }: { t: T; label: string; list: CardEntry[]; onChange: (l: CardEntry[]) => void }) {
  const set = (i: number, e: Partial<CardEntry>) => onChange(list.map((x, j) => (j === i ? { ...x, ...e } : x)));
  return (
    <fieldset className="admin-card-entries">
      <legend>{label}</legend>
      {list.map((e, i) => (
        <div key={i} className="admin-card-entry">
          <select className="ui-input" aria-label={t('Icon')} value={e.icon} onChange={(ev) => set(i, { icon: ev.target.value })}>
            {Object.entries(CARD_ICONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </select>
          <input className="ui-input" aria-label={t('Title')} placeholder={t('Title')} maxLength={CARD_LIMITS.entryTitle} value={e.title} onChange={(ev) => set(i, { title: ev.target.value })} />
          <input className="ui-input" aria-label={t('Text')} placeholder={t('Short text')} maxLength={CARD_LIMITS.entryText} value={e.text} onChange={(ev) => set(i, { text: ev.target.value })} />
          <Button variant="ghost" aria-label={t('Remove')} onClick={() => onChange(list.filter((_, j) => j !== i))}>
            x
          </Button>
        </div>
      ))}
      {list.length < CARD_LIMITS.entries && (
        <div>
          <Button variant="ghost" onClick={() => onChange([...list, { icon: 'estrela', title: '', text: '' }])}>
            {t('Add')}
          </Button>
        </div>
      )}
    </fieldset>
  );
}

function Swatches({ label, colors, value, onChange }: { label: string; colors: readonly string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="admin-card-swatches" role="group" aria-label={label}>
      <span>{label}</span>
      <div>
        {colors.map((c) => (
          <button key={c} type="button" className="admin-card-swatch" style={{ background: c }} aria-label={c} aria-pressed={c.toUpperCase() === value.toUpperCase()} onClick={() => onChange(c)} />
        ))}
      </div>
    </div>
  );
}

function AccountPicker({ t, value, name, onChange }: { t: T; value: string | null; name: string | null; onChange: (id: string | null, name: string | null) => void }) {
  const [q, setQ] = useState('');
  const found = useLoad<{ accounts: { id: string; username: string; linkedCard: { id: number; nick: string } | null }[] }>(q.trim() ? `/admin/cards/accounts?${new URLSearchParams({ q: q.trim() })}` : null);
  if (value)
    return (
      <div className="admin-card-account">
        <span>
          {t('Current account')}: <b>{name ?? value}</b>
        </span>
        <Button variant="ghost" onClick={() => onChange(null, null)}>
          {t('Unlink')}
        </Button>
      </div>
    );
  return (
    <div className="admin-card-account">
      <TextField label={t('Current account in Outgun Web (optional)')} value={q} maxLength={15} onChange={setQ} hint={t('Gets copy no. 0 and the legend reward when drawing their own card.')} />
      {q.trim() && (
        <ul>
          {(found.data?.accounts ?? []).map((a) => (
            <li key={a.id}>
              <button type="button" disabled={a.linkedCard !== null} onClick={() => onChange(a.id, a.username)}>
                {a.username}
                {a.linkedCard ? ` (${a.linkedCard.nick})` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CardForm({ t, id, gens, done, cancel }: { t: T; id: number | null; gens: Generation[]; done: (id: number) => void; cancel: () => void }) {
  const existing = useLoad<CardDetail>(id ? `/admin/cards/${id}` : null);
  const positions = useLoad<{ positions: string[] }>('/admin/cards/positions');
  const [card, setCard] = useState<LegendCardInput | null>(id ? null : EMPTY);
  const [linkedName, setLinkedName] = useState<string | null>(null);
  const base = useRef<string>(JSON.stringify(EMPTY));
  const [clansText, setClansText] = useState('');
  const [linksText, setLinksText] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<{ text?: string; error?: string }>({});
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const c = existing.data?.card;
    if (!c || card) return;
    const input = pickInput(c);
    base.current = JSON.stringify(input);
    setCard(input);
    setClansText(input.clans.join(', '));
    setLinksText(input.links.map((l) => l.nick).join(', '));
    setLinkedName(c.linkedUsername);
  }, [existing.data, card]);
  const [similar, setSimilar] = useState<{ same: { id: number; nick: string } | null; similar: { id: number; nick: string }[] }>({ same: null, similar: [] });
  const nick = card?.nick ?? '';
  useEffect(() => {
    if (!nick.trim()) return setSimilar({ same: null, similar: [] });
    const h = setTimeout(() => {
      api<typeof similar>(`/admin/cards/similar?${new URLSearchParams({ nick: nick.trim(), ...(id ? { except: String(id) } : {}) })}`).then(setSimilar, () => undefined);
    }, 300);
    return () => clearTimeout(h);
  }, [nick, id]);
  const dirty = card !== null && JSON.stringify(card) !== base.current;
  useEffect(() => {
    if (!dirty) return;
    const warn = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const look = useMemo(() => (card ? { nick: card.nick.trim().toUpperCase() || '???', class: card.class, ringColor: card.ringColor, centerColor: card.centerColor } : null), [card]);
  if (!card || !look) return <Status error={existing.error} text={t('Loading...')} />;
  const set = (p: Partial<LegendCardInput>) => setCard({ ...card, ...p });
  const required = checklist(card, t).filter((x) => x.required && !x.ok);
  const save = () => {
    const body = { ...card, nick: card.nick.trim().toUpperCase() };
    const req = id ? api<{ id: number }>(`/admin/cards/${id}`, { method: 'PUT', body: { card: body, ...(note.trim() ? { note: note.trim() } : {}) } }) : api<{ id: number }>('/admin/cards', { body });
    req.then(
      (r) => {
        base.current = JSON.stringify(card);
        done(r.id);
      },
      (e: unknown) => setStatus({ error: e instanceof ApiError && e.code === 'nick_taken' ? t('There is already a card for this nick.') : errorText(e) }),
    );
  };
  return (
    <div className="admin-card-form">
      <div className="admin-card-formhead">
        <h3>{id ? t('Editing $1', existing.data?.card.nick ?? '') : t('New card')}</h3>
        <small className="admin-muted">{t('Saving publishes right away: the card goes into the draw and every save keeps the previous version.')}</small>
      </div>
      <div className="admin-card-formgrid">
        <form
          className="admin-panel"
          onSubmit={(ev) => {
            ev.preventDefault();
            save();
          }}
        >
          <div className="admin-panel-fields">
            <TextField label={t('Nick (as it was in the game)')} value={card.nick} maxLength={CARD_LIMITS.nick} onChange={(v) => set({ nick: v })} />
            <TextField label={t('Epithet (optional, only on the page)')} value={card.epithet} maxLength={CARD_LIMITS.epithet} onChange={(v) => set({ epithet: v })} />
          </div>
          {similar.same ? (
            <p className="admin-card-warn">
              {t('There is already a card for $1.', similar.same.nick)}
            </p>
          ) : similar.similar.length > 0 ? (
            <p className="admin-card-warn">{t('Similar to $1. Check it is not the same person.', similar.similar.map((s) => s.nick).join(', '))}</p>
          ) : null}
          <div className="admin-panel-fields">
            <label className="ui-field">
              <span className="ui-label">{t('Position')}</span>
              <input className="ui-input" list="card-positions" value={card.position} maxLength={CARD_LIMITS.position} onChange={(ev) => set({ position: ev.target.value })} />
              <datalist id="card-positions">
                {(positions.data?.positions ?? []).map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <TextField label={t('Clans, in career order (comma separated)')} value={clansText} maxLength={200} onChange={(v) => {
              setClansText(v);
              set({ clans: v.split(',').map((x) => x.trim()).filter(Boolean) });
            }} />
          </div>
          <TextAreaField label={t('Biography (one paragraph per blank line)')} value={card.bio} rows={8} maxLength={CARD_LIMITS.bio} onChange={(v) => set({ bio: v })} hint={`${card.bio.length} / ${CARD_LIMITS.bio}`} />
          <fieldset className="admin-card-radios">
            <legend>{t('Class')}</legend>
            {CARD_CLASSES.map((c) => (
              <label key={c.id} style={{ borderColor: card.class === c.id ? c.c1 : undefined }}>
                <input type="radio" name="card-class" checked={card.class === c.id} onChange={() => set({ class: c.id })} />
                <span style={{ color: c.c2 }}>{c.name}</span> <small>{'★'.repeat(c.tier + 1)}</small>
              </label>
            ))}
          </fieldset>
          <fieldset className="admin-card-radios">
            <legend>{t('Generation')}</legend>
            {gens
              .filter((g) => g.active || card.generations.includes(g.id))
              .map((g) => (
                <label key={g.id} title={g.description}>
                  <input type="checkbox" checked={card.generations.includes(g.id)} onChange={(ev) => set({ generations: ev.target.checked ? [...card.generations, g.id] : card.generations.filter((x) => x !== g.id) })} />
                  {g.name} <small>{g.description}</small>
                </label>
              ))}
          </fieldset>
          <Entries t={t} label={t('Achievements')} list={card.achievements} onChange={(l) => set({ achievements: l })} />
          <div className="admin-panel-fields">
            <TextField label={t('Golden quote (highlight at the top of the page)')} value={card.quote} maxLength={CARD_LIMITS.quote} onChange={(v) => set({ quote: v })} hint={`${card.quote.length} / ${CARD_LIMITS.quote}`} />
            <TextField label={t('Memory or quote from someone (optional)')} value={card.memory} maxLength={CARD_LIMITS.memory} onChange={(v) => set({ memory: v })} />
          </div>
          <Entries t={t} label={t('Traits')} list={card.traits} onChange={(l) => set({ traits: l })} />
          <Entries t={t} label={t('Special abilities')} list={card.abilities} onChange={(l) => set({ abilities: l })} />
          <Swatches label={t('Ring and barrel (clan colors)')} colors={CARD_RING_COLORS} value={card.ringColor} onChange={(c) => set({ ringColor: c })} />
          <Swatches label={t('Center (the color the player used)')} colors={CARD_CENTER_COLORS} value={card.centerColor} onChange={(c) => set({ centerColor: c })} />
          <AccountPicker
            t={t}
            value={card.linkedUserId}
            name={linkedName}
            onChange={(v, n) => {
              setLinkedName(n);
              set({ linkedUserId: v });
            }}
          />
          <div className="admin-panel-fields">
            <TextField label={t('Linked cards (nicks in the story, comma separated)')} value={linksText} maxLength={200} onChange={(v) => {
              setLinksText(v);
              set({ links: v.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean).slice(0, CARD_LIMITS.links).map((n) => ({ nick: n.slice(0, CARD_LIMITS.nick) })) });
            }} />
            <TextField label={t('Sources (who told it, links, prints)')} value={card.sources} maxLength={CARD_LIMITS.sources} onChange={(v) => set({ sources: v })} />
            {id && <TextField label={t('Note for the history (optional)')} value={note} maxLength={200} onChange={setNote} />}
          </div>
          <div className="admin-row-actions">
            <Button type="submit" variant="primary" disabled={required.length > 0 || similar.same !== null}>
              {t('Save and publish')}
            </Button>
            {leaving ? (
              <>
                <Button variant="danger" onClick={cancel}>
                  {t('Discard changes')}
                </Button>
                <Button variant="ghost" onClick={() => setLeaving(false)}>
                  {t('Keep editing')}
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => (dirty ? setLeaving(true) : cancel())}>
                {t('Cancel')}
              </Button>
            )}
            <Status text={status.text} error={status.error} />
          </div>
        </form>
        <aside className="admin-card-preview">
          <PlayerCard look={look} />
          <h4>{t('Before saving')}</h4>
          <Checklist card={card} t={t} />
          <small className="admin-muted">{t('Required items are needed to save; the others are recommended.')}</small>
          <small className="admin-muted">{t('Sheet $1/11', String(cardFilledFields(card)))}</small>
        </aside>
      </div>
    </div>
  );
}

// --- chances e gerações (OG-575) ---
function OddsAndGenerations({ t, isAdmin, gens }: { t: T; isAdmin: boolean; gens: ReturnType<typeof useLoad<{ generations: Generation[] }>> }) {
  const odds = useLoad<{ classes: OddsRow[] }>('/admin/card-odds');
  const [w, setW] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState<{ text?: string; error?: string }>({});
  const rows = odds.data?.classes ?? [];
  useEffect(() => {
    if (odds.data && !w) setW(Object.fromEntries(odds.data.classes.map((r) => [r.class, String(r.weight)])));
  }, [odds.data, w]);
  const weights = Object.fromEntries(rows.map((r) => [r.class, Math.max(0, Number(w?.[r.class] ?? r.weight) || 0)]));
  const counts = Object.fromEntries(rows.map((r) => [r.class, r.activeCards]));
  const live = rows.filter((r) => r.activeCards > 0);
  const total = live.reduce((s, r) => s + (weights[r.class] ?? 0), 0);
  const cards = rows.reduce((s, r) => s + r.activeCards, 0);
  const save = () =>
    api('/admin/card-odds', { method: 'PUT', body: { weights } }).then(
      () => {
        setStatus({ text: t('Odds saved: they apply from the next claim.') });
        odds.reload();
      },
      (e: unknown) => setStatus({ error: errorText(e) }),
    );
  return (
    <div className="admin-cards-odds">
      <div className="admin-panel">
        <h3>{t('Odds per class')}</h3>
        <p className="admin-muted">{t('Weight of each class in the draw. Classes without an active card the player lacks leave the sum, so the draw never repeats.')}</p>
        <Table
          caption={t('Odds per class')}
          rows={rows}
          rowKey={(r) => r.class}
          columns={[
            { key: 'class', header: t('Class'), cell: (r) => <ClassBadge cls={r.class} /> },
            {
              key: 'weight',
              header: t('Weight'),
              cell: (r) => <input className="ui-input admin-card-weight" type="number" min={0} max={1000} step={0.5} aria-label={t('Weight of $1', cardClass(r.class).name)} value={w?.[r.class] ?? ''} onChange={(ev) => setW({ ...(w ?? {}), [r.class]: ev.target.value })} />,
            },
            { key: 'pct', header: t('Per claim'), align: 'end', cell: (r) => (total && r.activeCards ? `${(((weights[r.class] ?? 0) / total) * 100).toFixed(1)} %` : '—') },
            { key: 'cards', header: t('Active cards'), align: 'end', cell: (r) => r.activeCards },
            { key: 'each', header: t('Each card'), align: 'end', cell: (r) => (r.activeCards ? `${(cardChance(weights, counts, r.class) * 100).toFixed(2)} %` : '—') },
          ]}
        />
        {rows
          .filter((r) => (weights[r.class] ?? 0) > 0 && r.activeCards === 0)
          .map((r) => (
            <p key={r.class} className="admin-card-warn">
              {t('$1 has weight but no active card: its odds go to the other classes.', cardClass(r.class).name)}
            </p>
          ))}
        <p className="admin-muted">{t('With 2 claims a week and no repeats, a player who claims every week completes the $1 cards in $2 weeks.', String(cards), String(Math.ceil(cards / 2)))}</p>
        <div className="admin-row-actions">
          <Button variant="primary" onClick={() => void save()} disabled={!total}>
            {t('Save odds')}
          </Button>
          <Status text={status.text} error={status.error ?? odds.error} />
        </div>
      </div>
      <Generations t={t} isAdmin={isAdmin} gens={gens} />
    </div>
  );
}

function Generations({ t, isAdmin, gens }: { t: T; isAdmin: boolean; gens: ReturnType<typeof useLoad<{ generations: Generation[] }>> }) {
  const [edit, setEdit] = useState<{ id: number | null; name: string; description: string; ord: string; active: boolean } | null>(null);
  const [status, setStatus] = useState<{ text?: string; error?: string }>({});
  const list = gens.data?.generations ?? [];
  const save = () => {
    if (!edit) return;
    const body = { name: edit.name.trim(), description: edit.description.trim(), ord: Number(edit.ord) || 0, active: edit.active };
    (edit.id ? api(`/admin/card-generations/${edit.id}`, { method: 'PUT', body }) : api('/admin/card-generations', { body })).then(
      () => {
        setEdit(null);
        setStatus({ text: t('Done.') });
        gens.reload();
      },
      (e: unknown) => setStatus({ error: errorText(e) }),
    );
  };
  return (
    <div className="admin-panel">
      <h3>{t('Generations')}</h3>
      {!isAdmin && <p className="admin-muted">{t('Only admins change the generations.')}</p>}
      <Table
        caption={t('Generations')}
        rows={list}
        rowKey={(g) => String(g.id)}
        columns={[
          { key: 'ord', header: t('Order'), cell: (g) => g.ord, align: 'end' },
          { key: 'name', header: t('Name'), cell: (g) => <b>{g.name}</b> },
          { key: 'desc', header: t('Description'), cell: (g) => g.description },
          { key: 'cards', header: t('Cards'), cell: (g) => g.cards, align: 'end' },
          { key: 'active', header: t('Status'), cell: (g) => (g.active ? <Badge tone="success">{t('Active')}</Badge> : <Badge tone="danger">{t('Deactivated')}</Badge>) },
          {
            key: 'edit',
            header: '',
            align: 'end',
            cell: (g) =>
              isAdmin ? (
                <Button variant="ghost" onClick={() => setEdit({ id: g.id, name: g.name, description: g.description, ord: String(g.ord), active: g.active })}>
                  {t('Edit')}
                </Button>
              ) : null,
          },
        ]}
      />
      {isAdmin &&
        (edit ? (
          <div className="admin-panel-fields">
            <TextField label={t('Name')} value={edit.name} maxLength={40} onChange={(v) => setEdit({ ...edit, name: v })} />
            <TextField label={t('Description')} value={edit.description} maxLength={120} onChange={(v) => setEdit({ ...edit, description: v })} />
            <TextField label={t('Order')} value={edit.ord} maxLength={3} onChange={(v) => setEdit({ ...edit, ord: v.replace(/\D/g, '') })} />
            <label className="admin-inline-check">
              <input type="checkbox" checked={edit.active} onChange={(ev) => setEdit({ ...edit, active: ev.target.checked })} /> {t('Active')}
            </label>
            <div className="admin-row-actions">
              <Button variant="primary" disabled={!edit.name.trim()} onClick={save}>
                {t('Save')}
              </Button>
              <Button variant="ghost" onClick={() => setEdit(null)}>
                {t('Cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button onClick={() => setEdit({ id: null, name: '', description: '', ord: String((list.at(-1)?.ord ?? 0) + 1), active: true })}>{t('New generation')}</Button>
          </div>
        ))}
      <Status text={status.text} error={status.error ?? gens.error} />
    </div>
  );
}
