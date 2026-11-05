// SPDX-License-Identifier: GPL-2.0-or-later
// Cartas de Jogador para o jogador (D-94): resgate com abertura por classe (OG-577), coleção no
// perfil (OG-578), página da carta só para quem a tem (OG-579) e a recompensa da lenda (OG-580).
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CARD_CLASSES, CARD_ICONS, cardClass, cardParagraphs, SHOWS_SERIAL_FROM_TIER, type CardClassId, type CardEntry } from '@outgun/protocol';
import { useAccount } from '../app/account.js';
import { api, ApiError } from '../app/api.js';
import { usePrefs } from '../app/prefs.js';
import { Badge, Button } from '../ui/Button.js';
import { Page } from '../ui/Page.js';
import { Panel } from '../ui/Panel.js';
import { PlayerCard } from '../ui/PlayerCard.js';
import { cardSerialText } from '../ui/player-card.js';
import './cards.css';

export interface CardFace {
  id: number;
  slug: string;
  nick: string;
  class: CardClassId;
  ringColor: string;
  centerColor: string;
}
export interface ClaimStatus {
  week: string;
  matches: number;
  matchesNeeded: number;
  unlocked: boolean;
  used: number;
  available: number;
  perWeek: number;
  nextWeekAt: string;
  remaining: number;
  owned: number;
  total: number;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const classVars = (cls: CardClassId) => {
  const c = cardClass(cls);
  return { '--c1': c.c1, '--c2': c.c2 } as CSSProperties;
};
const CardIcon = ({ name }: { name: string }) => (
  <svg className="cards-ico" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: (CARD_ICONS[name] ?? CARD_ICONS['estrela']!).svg }} />
);

/** Resgates da semana de quem entrou (null = sem conta). */
export function useClaimStatus(): { status: ClaimStatus | null | undefined; reload: () => void } {
  const { user } = useAccount();
  const [status, setStatus] = useState<ClaimStatus | null | undefined>(undefined);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!user) {
      setStatus(user === null ? null : undefined);
      return;
    }
    let alive = true;
    api<ClaimStatus>('/cards/claims').then(
      (s) => alive && setStatus(s),
      () => alive && setStatus(null),
    );
    return () => {
      alive = false;
    };
  }, [user, tick]);
  return { status, reload: useCallback(() => setTick((n) => n + 1), []) };
}

// --- resgate e abertura (OG-577) ---
/** Suspense antes de virar, por degrau: quanto mais rara, mais tempo o verso brilha. */
const CHARGE_MS = [0, 200, 600, 1000, 1200, 1800];

interface ClaimResult {
  card: CardFace;
  serial: number;
  own: boolean;
  seq: number;
  status: ClaimStatus;
}

export function ClaimScreen() {
  const { t, prefs } = usePrefs();
  const navigate = useNavigate();
  const { user } = useAccount();
  const { status, reload } = useClaimStatus();
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [phase, setPhase] = useState<'idle' | 'charging' | 'open'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const flip = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const s = result?.status ?? status;

  const claim = () => {
    if (!s || phase === 'charging') return;
    setError(null);
    setPhase('idle');
    setResult(null);
    api<ClaimResult>('/cards/claims', { body: { seq: s.used + 1 } }).then(
      (r) => {
        setResult(r);
        const tier = cardClass(r.card.class).tier;
        const wait = reducedMotion() ? 0 : (CHARGE_MS[tier] ?? 0);
        setPhase(wait ? 'charging' : 'open');
        timer.current = setTimeout(() => {
          setPhase('open');
          if (!reducedMotion() && tier >= 2) setBurst((n) => n + 1);
          if (!reducedMotion() && (tier === 3 || tier === 5) && flip.current) {
            flip.current.classList.remove('cards-shake');
            void flip.current.offsetWidth;
            flip.current.classList.add('cards-shake');
          }
        }, wait);
      },
      (e: unknown) => {
        setError(e instanceof ApiError ? claimError(e.code, t) : String(e));
        reload();
      },
    );
  };

  const tier = result ? cardClass(result.card.class).tier : 0;
  const nextWeek = s ? new Date(s.nextWeekAt).toLocaleString(prefs.locale, { weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <Page title={t('Claim a card')} subtitle="Outgun Player Cards" onBack={() => void navigate(-1)}>
      {user === null ? (
        <p className="ui-muted">
          {t('Sign in to collect the player cards.')} <Link to="/login">{t('Sign in')}</Link>
        </p>
      ) : !s ? (
        <p className="ui-muted">{t('Loading...')}</p>
      ) : (
        <div className="cards-claim">
          <div className="cards-claim-stage">
            <div
              ref={flip}
              className={`cards-flip ${phase === 'open' ? 'open' : ''} ${phase === 'charging' ? `charging ct${tier}` : ''}`}
              style={classVars(result?.card.class ?? 'epico')}
            >
              <div className="cards-flip-in">
                <div className="cards-flip-face">
                  <PlayerCard backClass={phase === 'charging' && result ? result.card.class : null} />
                </div>
                <div className="cards-flip-face front">{result && <PlayerCard look={result.card} serial={result.serial} />}</div>
              </div>
            </div>
            {burst > 0 && <div key={burst} className={`cards-burst b${Math.min(5, tier)}`} style={classVars(result?.card.class ?? 'epico')} aria-hidden="true" />}
          </div>
          <div className="cards-claim-side" aria-live="polite">
            {phase === 'open' && result ? (
              <div className="cards-claim-result" style={classVars(result.card.class)}>
                <h2>{result.card.nick}</h2>
                <p>
                  <b>{cardClass(result.card.class).name}</b> {'★'.repeat(tier + 1)}
                  {tier >= SHOWS_SERIAL_FROM_TIER || result.own ? ` · ${t('Copy no. $1', cardSerialText(result.serial, result.card.class))}` : ''}
                </p>
                {result.own && <LegendReveal nick={result.card.nick} />}
                <div className="ui-row">
                  <Button variant="primary" onClick={() => void navigate(`/cartas/${result.card.slug}`)}>
                    {t('See the card page')}
                  </Button>
                  {s.available > 0 && <Button onClick={claim}>{t('Claim the next one')}</Button>}
                </div>
              </div>
            ) : null}
            <dl className="cards-claim-facts">
              <dt>{t('Claims this week')}</dt>
              <dd>
                {s.used}/{s.perWeek}
              </dd>
              <dt>{t('Matches this week')}</dt>
              <dd>{t('$1 of $2', String(Math.min(s.matches, s.matchesNeeded)), String(s.matchesNeeded))}</dd>
              <dt>{t('Your collection')}</dt>
              <dd>
                {s.owned}/{s.total}
              </dd>
            </dl>
            {s.remaining === 0 && s.total > 0 ? (
              <p className="cards-note">{t('You have all the cards! New ones arrive from time to time.')}</p>
            ) : !s.unlocked ? (
              <p className="cards-note">{t('Play $1 more matches this week (Casual or Ranked) to unlock $2 claims. Training does not count.', String(s.matchesNeeded - s.matches), String(s.perWeek))}</p>
            ) : s.available > 0 ? (
              phase !== 'open' && (
                <Button variant="primary" size="lg" onClick={claim} disabled={phase === 'charging'}>
                  {t('Claim card ($1 left)', String(s.available))}
                </Button>
              )
            ) : (
              <p className="cards-note">{t('You used the claims of this week. New ones on $1.', nextWeek)}</p>
            )}
            {error && (
              <p className="stats-note error" role="alert">
                {error}
              </p>
            )}
            {user && <Link to={`/players/${encodeURIComponent(user.username)}#cards`}>{t('My collection')}</Link>}
          </div>
        </div>
      )}
    </Page>
  );
}

function claimError(code: string, t: (s: string, ...a: string[]) => string): string {
  if (code === 'not_unlocked') return t('Play 3 matches this week to unlock the claims.');
  if (code === 'no_claims_left') return t('You used the claims of this week.');
  if (code === 'collection_complete') return t('You have all the cards! New ones arrive from time to time.');
  return t('Could not claim now. Try again.');
}

/** Recompensa da lenda (OG-580) no momento da abertura. */
function LegendReveal({ nick }: { nick: string }) {
  const { t } = usePrefs();
  return (
    <div className="cards-legend">
      <b>{t('You drew your own card!')}</b>
      <span>{t('Copy no. 0 of $1 is yours, with the Legend badge next to your nick and the milestone "The legend in person".', nick)}</span>
    </div>
  );
}

// --- coleção no perfil (OG-578) ---
interface Collection {
  player: string;
  owned: number;
  total: number;
  classes: { class: CardClassId; owned: number; total: number }[];
  cards: (CardFace & { serial: number; claimedAt: string })[];
  legend: (CardFace & { serial: number }) | null;
}

export function ProfileCards({ name, owner }: { readonly name: string; readonly owner: boolean }) {
  const { t } = usePrefs();
  const [data, setData] = useState<Collection | null | undefined>(undefined);
  const { status } = useClaimStatus();
  useEffect(() => {
    let alive = true;
    api<Collection>(`/players/${encodeURIComponent(name)}/cards`).then(
      (d) => alive && setData(d),
      () => alive && setData(null),
    );
    return () => {
      alive = false;
    };
  }, [name]);
  if (!data) return null;
  const claim = owner && status && status.available > 0;
  return (
    <Panel
      id="cards"
      title="Outgun Player Cards"
      actions={
        owner ? (
          <Link to="/cartas/resgatar">{claim ? t('Claim card ($1 left)', String(status.available)) : t('Claim a card')}</Link>
        ) : undefined
      }
    >
      <div className="cards-collection">
        {data.legend && (
          <div className="cards-legend-own" style={classVars(data.legend.class)}>
            <Link to={`/cartas/${data.legend.slug}`} className="cards-legend-card">
              <PlayerCard look={data.legend} serial={0} />
            </Link>
            <div>
              <Badge tone="warning">{t('Legend')}</Badge>
              <p>{t('$1 is a legend of Outgun: this is their own card, copy no. 0.', data.player)}</p>
            </div>
          </div>
        )}
        <p className="cards-count">
          <b>
            {data.owned}/{data.total}
          </b>{' '}
          {t('cards discovered')}
        </p>
        <ul className="cards-classes">
          {CARD_CLASSES.map((c) => {
            const row = data.classes.find((x) => x.class === c.id);
            return (
              <li key={c.id} style={classVars(c.id)}>
                <span>{c.name}</span>
                <b>
                  {row?.owned ?? 0}/{row?.total ?? 0}
                </b>
              </li>
            );
          })}
        </ul>
        {data.cards.length === 0 ? (
          <p className="ui-muted">
            {owner ? t('Your collection is empty: $1 cards to discover. Play 3 matches in a week to claim 2 cards.', String(data.total)) : t('No cards yet.')}
          </p>
        ) : (
          <ul className="cards-grid">
            {data.cards.map((c) => (
              <li key={c.id}>
                <Link to={`/cartas/${c.slug}`} aria-label={`${c.nick}, ${cardClass(c.class).name}`}>
                  <PlayerCard look={c} serial={c.serial} still />
                </Link>
              </li>
            ))}
            {Array.from({ length: Math.max(0, data.total - data.owned) }, (_, i) => (
              <li key={`?${i}`} className="cards-unknown" aria-hidden="true">
                ?
              </li>
            )).slice(0, 24)}
          </ul>
        )}
      </div>
    </Panel>
  );
}

// --- página da carta (OG-579) ---
interface CardPage {
  card: CardFace & {
    epithet: string;
    position: string;
    bio: string;
    generations: { name: string; description: string }[];
    clans: string[];
    achievements: CardEntry[];
    traits: CardEntry[];
    abilities: CardEntry[];
    quote: string;
    memory: string;
    active: boolean;
    updatedAt: string;
  };
  mine: { serial: number; claimedAt: string };
  owners: number;
  chance: number;
  links: { nick: string; slug: string | null }[];
}

export function CardPageScreen() {
  const { t, prefs } = usePrefs();
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const { user } = useAccount();
  const [state, setState] = useState<{ page?: CardPage; error?: string }>({});
  useEffect(() => {
    let alive = true;
    setState({});
    api<CardPage>(`/cards/${encodeURIComponent(slug)}`).then(
      (page) => alive && setState({ page }),
      (e: unknown) => alive && setState({ error: e instanceof ApiError ? e.code : 'error' }),
    );
    return () => {
      alive = false;
    };
  }, [slug, user]);
  const back = () => void navigate(-1);
  if (!state.page) {
    return (
      <Page title="Outgun Player Cards" onBack={back}>
        {state.error === 'not_owned' ? (
          <div className="cards-locked">
            <PlayerCard />
            <div>
              <h2>{t('You have not discovered this card yet')}</h2>
              <p className="ui-muted">{t('The story of each card opens to whoever gets it in a claim. Play 3 matches in a week to claim 2 cards.')}</p>
              <Link to="/cartas/resgatar">{t('Claim a card')}</Link>
            </div>
          </div>
        ) : state.error === 'unauthorized' ? (
          <p className="ui-muted">
            {t('Sign in to collect the player cards.')} <Link to="/login">{t('Sign in')}</Link>
          </p>
        ) : state.error ? (
          <p className="ui-muted">{t('Card not found.')}</p>
        ) : (
          <p className="ui-muted">{t('Loading...')}</p>
        )}
      </Page>
    );
  }
  const { card: c, mine, owners, chance, links } = state.page;
  const cls = cardClass(c.class);
  const list = (items: CardEntry[]) =>
    items.length ? (
      <ul className="cards-list">
        {items.map((x, i) => (
          <li key={i}>
            <CardIcon name={x.icon} />
            <div>
              <b>{x.title}</b>
              {x.text && <p>{x.text}</p>}
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="ui-muted">-</p>
    );
  return (
    <Page title="Outgun Player Cards" onBack={back} width="wide">
      <article className="cards-page" style={classVars(c.class)}>
        <header className="cards-band">
          <h2>{c.nick}</h2>
          <div className="cards-band-line">
            <span className="cards-pill">
              {cls.name} <span aria-hidden="true">{'★'.repeat(cls.tier + 1)}</span>
            </span>
            {c.epithet && <span className="cards-epithet">{c.epithet}</span>}
            {c.position && <span className="ui-muted">{c.position}</span>}
          </div>
        </header>
        <div className="cards-page-grid">
          <aside>
            <PlayerCard look={c} serial={mine.serial} />
            <div className="cards-mine">
              <span className="ui-muted">{t('Your copy')}</span>
              <b>{t('No. $1', cardSerialText(mine.serial, c.class))}</b>
              <span>{t('Claimed on $1', new Date(mine.claimedAt).toLocaleDateString(prefs.locale, { dateStyle: 'medium' }))}</span>
              {mine.serial === 0 && <Badge tone="warning">{t('Legend')}</Badge>}
            </div>
          </aside>
          <div className="cards-page-main">
            {c.quote && <p className="cards-gold">"{c.quote}"</p>}
            <div className="cards-facts">
              <div>
                <small>{t('Class')}</small>
                <b>{cls.name}</b>
              </div>
              <div>
                <small>{t('Position')}</small>
                <b>{c.position || '-'}</b>
              </div>
              <div>
                <small>{t('Generation')}</small>
                <b>{c.generations.map((g) => g.name).join(', ') || '-'}</b>
                {c.generations.length > 0 && <small>{c.generations.map((g) => g.description).join(' · ')}</small>}
              </div>
            </div>
            {c.clans.length > 0 && (
              <section>
                <h3>{t('Clans')}</h3>
                <div className="cards-clans">
                  {c.clans.map((x, i) => (
                    <span key={i} className={i === c.clans.length - 1 ? 'main' : ''}>
                      {x}
                    </span>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h3>{t('Story')}</h3>
              <div className="cards-bio">
                {cardParagraphs(c.bio).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
            {c.achievements.length > 0 && (
              <section>
                <h3>{t('Achievements')}</h3>
                <ul className="cards-ach">
                  {c.achievements.map((x, i) => (
                    <li key={i}>
                      <span className="cards-medal">
                        <CardIcon name={x.icon} />
                      </span>
                      <div>
                        <b>{x.title}</b>
                        {x.text && <p>{x.text}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <div className="cards-two">
              <section>
                <h3>{t('Traits')}</h3>
                {list(c.traits)}
              </section>
              <section>
                <h3>{t('Special abilities')}</h3>
                {list(c.abilities)}
              </section>
            </div>
            {c.memory && <p className="cards-memory">"{c.memory}"</p>}
            <section>
              <h3>{t('In the collection')}</h3>
              <div className="cards-stats">
                <div>
                  <b>{owners}</b>
                  <small>{t('players have it')}</small>
                </div>
                <div>
                  <b>{chance ? `${(chance * 100).toLocaleString(prefs.locale, { maximumFractionDigits: chance < 0.01 ? 2 : 1 })} %` : '-'}</b>
                  <small>{c.active ? t('chance per claim') : t('out of the draw')}</small>
                </div>
              </div>
            </section>
            {links.length > 0 && (
              <section>
                <h3>{t('Linked cards')}</h3>
                <div className="cards-links">
                  {links.map((l) =>
                    l.slug ? (
                      <Link key={l.nick} to={`/cartas/${l.slug}`}>
                        {l.nick}
                      </Link>
                    ) : (
                      <span key={l.nick} title={t('Not discovered yet')}>
                        {l.nick}
                      </span>
                    ),
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </article>
    </Page>
  );
}
