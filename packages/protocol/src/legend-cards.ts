// SPDX-License-Identifier: GPL-2.0-or-later
// Cartas de Jogador (OG-570, D-94, RN-CRT-01..09): definições compartilhadas por API e cliente — as 6
// classes em ordem de raridade, os ícones da ficha, os limites e a validação. Proposta e escada de
// exclusividade em `plan/specs/cartas-de-jogador/proposta.html`.
import { CLAN_COLORS, EXTRA_COLOUR_DEFAULTS } from './colors.js';

export type CardClassId = 'classico' | 'epico' | 'lendario' | 'especial' | 'nefasto' | 'mitica';

export interface CardClass {
  id: CardClassId;
  /** Degrau da escada (0 = Clássico ... 5 = Mítica): estrelas = tier + 1. */
  tier: number;
  name: string;
  /** Cor principal (moldura, brilho) e secundária (textos, estrelas). */
  c1: string;
  c2: string;
}

/** Da mais comum para a mais rara (P2). */
export const CARD_CLASSES: readonly CardClass[] = [
  { id: 'classico', tier: 0, name: 'Clássico', c1: '#2c9bff', c2: '#8fd0ff' },
  { id: 'epico', tier: 1, name: 'Épico', c1: '#a43dff', c2: '#dcaaff' },
  { id: 'lendario', tier: 2, name: 'Lendário', c1: '#f2a81e', c2: '#ffd866' },
  { id: 'especial', tier: 3, name: 'Especial', c1: '#ff2626', c2: '#ffc21a' },
  { id: 'nefasto', tier: 4, name: 'Nefasto', c1: '#b8692c', c2: '#b4b4bb' },
  { id: 'mitica', tier: 5, name: 'Mítica', c1: '#3dff2e', c2: '#f0cc5c' },
];
export const CARD_CLASS_IDS = CARD_CLASSES.map((c) => c.id);
export const cardClass = (id: string): CardClass => CARD_CLASSES.find((c) => c.id === id) ?? CARD_CLASSES[0]!;
export const isCardClass = (id: unknown): id is CardClassId => typeof id === 'string' && (CARD_CLASS_IDS as string[]).includes(id);
/** A partir do Lendário a carta mostra o número da cópia (P1). */
export const SHOWS_SERIAL_FROM_TIER = 2;

/** Ícones da ficha (lista fechada): traços em 24 × 24, `stroke` na cor do texto. */
export const CARD_ICONS: Readonly<Record<string, { name: string; svg: string }>> = {
  estrela: { name: 'Estrela', svg: '<polygon points="12,2.5 14.8,8.9 21.6,9.4 16.4,13.8 18,20.6 12,17 6,20.6 7.6,13.8 2.4,9.4 9.2,8.9"/>' },
  trofeu: { name: 'Troféu', svg: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a3 3 0 0 0 3 4.5M17 6h2.5a3 3 0 0 1-3 4.5M12 14v4M8 21h8M9.5 18h5"/>' },
  raio: { name: 'Raio', svg: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' },
  escudo: { name: 'Escudo', svg: '<path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.4 7.5 10 4.3-1.6 7.5-5.4 7.5-10v-6z"/>' },
  mira: { name: 'Mira', svg: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/>' },
  coroa: { name: 'Coroa', svg: '<path d="M3 18.5h18M4 18.5 2.5 7.5l5.5 4 4-7 4 7 5.5-4-1.5 11z"/>' },
  codigo: { name: 'Código', svg: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>' },
  engrenagem: { name: 'Engrenagem', svg: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5" stroke-dasharray="3 2.9" stroke-width="3.2"/>' },
  pessoas: { name: 'Pessoas', svg: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-4 2.7-6 6-6s6 2 6 6M15.5 14c3 0 5.5 1.8 5.5 5"/>' },
  mapa: { name: 'Mapa', svg: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>' },
  conversa: { name: 'Conversa', svg: '<path d="M4 4h16v12H9l-5 4z"/><path d="M9 10h.01M12 10h.01M15 10h.01" stroke-width="2.6"/>' },
  medalha: { name: 'Medalha', svg: '<circle cx="12" cy="15" r="6"/><path d="m8 2.5 4 6 4-6M12 12.5v5"/>' },
  olho: { name: 'Olho', svg: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' },
  infinito: { name: 'Infinito', svg: '<path d="M6.5 9a3 3 0 1 0 0 6c3.5 0 7.5-6 11-6a3 3 0 1 1 0 6c-3.5 0-7.5-6-11-6z"/>' },
  grafico: { name: 'Gráfico', svg: '<path d="M3 20.5h18M5.5 20V14M10 20V9.5M14.5 20V12M19 20V5"/>' },
  pulso: { name: 'Pulso', svg: '<path d="M2.5 12H7l2-5.5 3.5 11 2.5-6.5h6.5"/>' },
  espadas: { name: 'Espadas', svg: '<path d="m4 4 11 11M20 4 9 15M5.5 18.5l3-3M18.5 18.5l-3-3M3.5 20.5l2-2M20.5 20.5l-2-2"/>' },
  servidor: { name: 'Servidor', svg: '<rect x="4" y="3.5" width="16" height="7" rx="1.5"/><rect x="4" y="13.5" width="16" height="7" rx="1.5"/><path d="M8 7h.01M8 17h.01" stroke-width="2.6"/>' },
  camadas: { name: 'Camadas', svg: '<path d="m12 3 9.5 5-9.5 5-9.5-5z"/><path d="m2.5 13 9.5 5 9.5-5"/>' },
};

/** Cores do centro: as 32 pessoais do tema de fábrica (player01..16) e as extras (player17..32). */
export const CARD_CENTER_COLORS: readonly string[] = [
  '#00FF00', '#FFFF00', '#FFFFFF', '#FF08FF', '#00FFFF', '#FFA000', '#FF5544', '#4455FF',
  '#008000', '#A0A0A0', '#00A0A0', '#800080', '#A06000', '#000080', '#800000', '#666666',
  ...Array.from({ length: 16 }, (_, i) => EXTRA_COLOUR_DEFAULTS[`player${i + 17}`]!),
];
/** Cores do anel e do cano: as cores de clã (P12). */
export const CARD_RING_COLORS: readonly string[] = Object.values(CLAN_COLORS);

export const CARD_LIMITS = {
  nick: 16,
  epithet: 32,
  position: 32,
  bio: 3000,
  quote: 90,
  memory: 200,
  clans: 12,
  clan: 24,
  entries: 8,
  entryTitle: 28,
  entryText: 160,
  links: 12,
  sources: 500,
} as const;

export interface CardEntry {
  icon: string;
  title: string;
  text: string;
}
export interface CardLink {
  nick: string;
  /** Carta ligada, quando o nick já tem carta. */
  cardId?: number;
}

/** A ficha como o painel grava (RN-CRT-03). */
export interface LegendCardInput {
  nick: string;
  epithet: string;
  position: string;
  bio: string;
  class: CardClassId;
  generations: number[];
  clans: string[];
  achievements: CardEntry[];
  traits: CardEntry[];
  abilities: CardEntry[];
  quote: string;
  memory: string;
  ringColor: string;
  centerColor: string;
  linkedUserId: string | null;
  links: CardLink[];
  sources: string;
}

/** Nick normalizado: dois cadastros da mesma pessoa ("Ek-Frogue" e "EK FROGUE") colidem. */
export const cardNickKey = (nick: string) =>
  nick.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
/** Endereço da página: /cartas/<slug>. */
export const cardSlug = (nick: string) =>
  nick.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'carta';
/** Parágrafos da biografia: separados por linha em branco. */
export const cardParagraphs = (bio: string) => bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

export type LegendCardProblem =
  | 'nick' | 'epithet' | 'position' | 'bio' | 'class' | 'generations' | 'clans' | 'entries'
  | 'quote' | 'memory' | 'ringColor' | 'centerColor' | 'links' | 'sources';

/** Problemas da ficha (vazio = válida). Obrigatórios: nick, classe, cores, biografia e frase dourada. */
export function legendCardProblems(c: LegendCardInput): LegendCardProblem[] {
  const out: LegendCardProblem[] = [];
  const L = CARD_LIMITS;
  const txt = (v: unknown, max: number, required = false) => typeof v === 'string' && v.length <= max && (!required || v.trim().length > 0);
  if (!txt(c.nick, L.nick, true) || !cardNickKey(c.nick)) out.push('nick');
  if (!txt(c.epithet, L.epithet)) out.push('epithet');
  if (!txt(c.position, L.position)) out.push('position');
  if (!txt(c.bio, L.bio, true)) out.push('bio');
  if (!isCardClass(c.class)) out.push('class');
  if (!Array.isArray(c.generations) || !c.generations.every((g) => Number.isInteger(g) && g > 0)) out.push('generations');
  if (!Array.isArray(c.clans) || c.clans.length > L.clans || !c.clans.every((x) => txt(x, L.clan, true))) out.push('clans');
  const entriesOk = (list: unknown) =>
    Array.isArray(list) && list.length <= L.entries &&
    list.every((e: CardEntry) => e && typeof e.icon === 'string' && e.icon in CARD_ICONS && txt(e.title, L.entryTitle, true) && txt(e.text, L.entryText));
  if (!entriesOk(c.achievements) || !entriesOk(c.traits) || !entriesOk(c.abilities)) out.push('entries');
  if (!txt(c.quote, L.quote, true)) out.push('quote');
  if (!txt(c.memory, L.memory)) out.push('memory');
  if (!CARD_RING_COLORS.includes(c.ringColor)) out.push('ringColor');
  if (!CARD_CENTER_COLORS.includes(c.centerColor)) out.push('centerColor');
  if (!Array.isArray(c.links) || c.links.length > L.links || !c.links.every((l) => l && txt(l.nick, L.nick, true))) out.push('links');
  if (!txt(c.sources, L.sources)) out.push('sources');
  return out;
}

/** Campos preenchidos dos 11 da ficha (coluna "Ficha x/11" do painel). */
export function cardFilledFields(c: LegendCardInput): number {
  return [c.nick, c.position, c.bio, c.class, c.generations.length, c.clans.length, c.achievements.length, c.quote, c.traits.length, c.abilities.length, c.ringColor && c.centerColor].filter(Boolean).length;
}

/** Peso → chance de cada carta da classe num resgate (peso ÷ soma ÷ cartas da classe). */
export function cardChance(weights: Readonly<Record<string, number>>, counts: Readonly<Record<string, number>>, cls: CardClassId): number {
  const live = CARD_CLASS_IDS.filter((id) => (counts[id] ?? 0) > 0);
  const total = live.reduce((s, id) => s + (weights[id] ?? 0), 0);
  const n = counts[cls] ?? 0;
  if (!total || !n) return 0;
  return (weights[cls] ?? 0) / total / n;
}
