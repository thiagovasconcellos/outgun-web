// SPDX-License-Identifier: GPL-2.0-or-later
// Desenho da Carta de Jogador (OG-572, OG-583, D-94): fundo, boneco em pixels, moldura e rachaduras
// por degrau da escada de exclusividade, num contexto 2D qualquer (o canvas do navegador ou o
// `@napi-rs/canvas` da API, que gera o PNG para a Steam). Mesma lógica da proposta aprovada
// (`plan/specs/cartas-de-jogador/proposta.html`); aleatoriedade com semente no nick (mesma carta,
// mesmo desenho em qualquer tela).
import { cardClass, type CardClassId } from './legend-cards.js';

/** O que o desenho usa do contexto 2D (o do navegador e o do `@napi-rs/canvas` servem). */
export interface CardCtx {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  stroke(): void;
  save(): void;
  restore(): void;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): { addColorStop(o: number, c: string): void };
}

export interface CardLook {
  readonly nick: string;
  readonly class: CardClassId;
  readonly ringColor: string;
  readonly centerColor: string;
}

export const hashText = (s: string) => {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
/** mulberry32 */
export const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};

type Cell = readonly [number, number, 'c' | 'g' | 'r' | 'o'];
/** Boneco 30 × 22: centro (cor pessoal), vão, anel e cano (cor de clã), contorno. */
export const SPRITE_CELLS: readonly Cell[] = (() => {
  const cells: Cell[] = [];
  const cx = 11;
  const cy = 11;
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 30; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      let k: Cell[2] | null = null;
      if (d < 6.1) k = 'c';
      else if (d < 7.1) k = 'g';
      else if (d < 10.4) k = 'r';
      if (!k && x >= 20 && x <= 28 && y >= 9 && y <= 12) k = y === 9 || y === 12 || x === 28 ? 'o' : 'r';
      if (!k && d < 11.3) k = 'o';
      if (k) cells.push([x, y, k]);
    }
  return cells;
})();

/** Fundo da carta: escuro → grade → mais estrelas; Nefasto mais quente e sem grade. */
export function drawCardBackground(ctx: CardCtx, W: number, H: number, look: Pick<CardLook, 'nick' | 'class'> | null, tier: number, c1: string) {
  const rand = seeded(hashText(look?.nick ?? 'back'));
  ctx.fillStyle = tier === 4 ? '#070504' : '#030405';
  ctx.fillRect(0, 0, W, H);
  if (tier >= 1 && tier !== 4) {
    ctx.strokeStyle = c1 + (tier >= 3 ? '1c' : '12');
    ctx.lineWidth = 1;
    const step = Math.max(8, Math.round(W / 22));
    for (let x = 0; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  const stars = [25, 60, 90, 120, 50, 180][tier] ?? 25;
  const s = Math.max(1, W / 230);
  for (let i = 0; i < stars; i++) {
    ctx.fillStyle = rand() < 0.3 ? c1 + 'cc' : '#ffffff55';
    ctx.fillRect(rand() * W, rand() * H, s, s);
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.9);
  v.addColorStop(0, 'transparent');
  v.addColorStop(1, 'rgba(0,0,0,.7)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/** Arte do meio: brilho, fumaça (Nefasto), raios, anéis, poeira e o boneco. `silhouette`: só a sombra. */
export function drawCardArt(ctx: CardCtx, W: number, H: number, dpr: number, look: CardLook, silhouette = false) {
  const cls = cardClass(look.class);
  const t = cls.tier;
  ctx.clearRect(0, 0, W, H);
  const rand = seeded(hashText(look.nick + look.class));
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2;
  if (!silhouette) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
    g.addColorStop(0, cls.c1 + (['22', '33', '55', '66', '33', '77'][t] ?? '22'));
    g.addColorStop(0.45, cls.c1 + '14');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (t === 4)
      for (let i = 0; i < 14; i++) {
        const x = rand() * W;
        const y = rand() * H;
        const sz = R * (0.3 + rand() * 0.5);
        const sg = ctx.createRadialGradient(x, y, 0, x, y, sz);
        sg.addColorStop(0, 'rgba(150,140,135,.16)');
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, W, H);
      }
    const rays = [0, 0, 18, 30, 0, 48][t] ?? 0;
    ctx.strokeStyle = cls.c1 + (t >= 5 ? '66' : '44');
    ctx.lineWidth = Math.max(1, dpr * 0.8);
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + rand() * 0.05;
      const l = R * (0.9 + rand() * 0.9);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5);
      ctx.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
      ctx.stroke();
    }
    if (t === 3 || t === 5)
      for (const k of [0.62, 0.8, 0.98]) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
        ctx.strokeStyle = cls.c1 + '33';
        ctx.stroke();
      }
    const dust = [30, 70, 140, 200, 60, 320][t] ?? 30;
    for (let i = 0; i < dust; i++) {
      const a = rand() * Math.PI * 2;
      const d = R * (0.3 + rand() * 1.1);
      ctx.fillStyle = rand() < 0.5 ? cls.c2 + 'aa' : '#ffffff88';
      const sz = (rand() * 1.6 + 0.4) * dpr;
      ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, sz, sz);
    }
  }
  const cell = Math.max(1, Math.floor(Math.min(W / 31, H / 23) * 0.86));
  const ox = Math.round(cx - 13 * cell);
  const oy = Math.round(cy - 11 * cell);
  if (silhouette) {
    ctx.fillStyle = '#000';
    ctx.shadowColor = cls.c1;
    ctx.shadowBlur = cell * 1.5;
    for (const [x, y] of SPRITE_CELLS) ctx.fillRect(ox + x * cell, oy + y * cell, cell + 1, cell + 1);
    return;
  }
  const col = { r: look.ringColor, c: look.centerColor, g: '#050505', o: '#050505' };
  ctx.save();
  ctx.shadowColor = look.ringColor;
  ctx.shadowBlur = cell * (1.2 + t * 0.4);
  ctx.fillStyle = look.ringColor + 'cc';
  for (const [x, y, k] of SPRITE_CELLS) if (k === 'o') ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
  ctx.restore();
  // em tamanho pequeno, sem vão nem relevo (o pixel vira ponto)
  const gap = cell >= 6 ? Math.round(cell * 0.1) : 0;
  const bevel = cell >= 5;
  for (const [x, y, k] of SPRITE_CELLS) {
    if (k === 'o') continue;
    const X = ox + x * cell;
    const Y = oy + y * cell;
    const base = col[k];
    ctx.fillStyle = base;
    ctx.fillRect(X + gap, Y + gap, cell - gap * 2, cell - gap * 2);
    if (k === 'g' || !bevel) continue;
    const b = Math.max(1, Math.round(cell * 0.18));
    ctx.fillStyle = shade(base, 0.45);
    ctx.fillRect(X + gap, Y + gap, cell - gap * 2, b);
    ctx.fillRect(X + gap, Y + gap, b, cell - gap * 2);
    ctx.fillStyle = shade(base, -0.38);
    ctx.fillRect(X + gap, Y + cell - gap - b, cell - gap * 2, b);
    ctx.fillRect(X + cell - gap - b, Y + gap, b, cell - gap * 2);
  }
}

/** Moldura por degrau (300 × 400, a proporção da carta): formas em SVG path; cor 1/2 = var(--c1)/(--c2). */
export interface FrameShape {
  d: string;
  stroke?: 1 | 2;
  width?: number;
  opacity?: number;
  dash?: [number, number];
  fill?: 1 | 2;
  /** Contorno claro das joias da Mítica. */
  light?: boolean;
}
const poly = (i: number, cut: number) =>
  `M${cut + i},${4 + i} L${296 - cut - i},${4 + i} L${296 - i},${cut + 4 + i} L${296 - i},${396 - cut - i} L${296 - cut - i},${396 - i} L${cut + i},${396 - i} L${4 + i},${396 - cut - i} L${4 + i},${cut + 4 + i} Z`;
const diamond = (x: number, y: number, rx: number, ry = rx) => `M${x},${y - ry} L${x + rx},${y} L${x},${y + ry} L${x - rx},${y} Z`;
export function cardFrameShapes(t: number): FrameShape[] {
  const cut = 18;
  const out: FrameShape[] = [{ d: poly(0, cut), stroke: 1, width: 2.4 }];
  if (t >= 1) out.push({ d: poly(6, cut), stroke: 2, opacity: 0.55, width: 1 });
  if (t >= 3) out.push({ d: poly(11, cut), stroke: 1, opacity: 0.45, width: 1, dash: [6, 4] });
  if (t >= 2) {
    for (const [x, y] of [[14, 14], [286, 14], [14, 386], [286, 386]] as const) out.push({ d: diamond(x, y, 6), fill: t === 5 ? 2 : 1, stroke: 2, width: 1 });
    out.push({ d: 'M24 4h28M248 4h28M24 396h28M248 396h28', stroke: 2, width: 3 });
  }
  if (t >= 3) out.push({ d: 'M2 170v60M298 170v60', stroke: 2, width: 4 }, { d: 'M8 186v28M292 186v28', stroke: 1, width: 2 });
  if (t === 5)
    for (const [x, y] of [[150, 4], [150, 396], [4, 200], [296, 200]] as const)
      out.push({ d: diamond(x, y, 7, 9), fill: 2, light: true, width: 1 }, { d: `M${x - 2.4},${y} a2.4,2.4 0 1,0 4.8,0 a2.4,2.4 0 1,0 -4.8,0`, fill: 1 });
  return out;
}
export function cardFrameSvg(t: number): string {
  return cardFrameShapes(t)
    .map((f) => {
      const a = [`d="${f.d}"`, `fill="${f.fill ? `var(--c${f.fill})` : 'none'}"`];
      if (f.light) a.push('stroke="#fff6c9"');
      else if (f.stroke) a.push(`stroke="var(--c${f.stroke})"`);
      if (f.width) a.push(`stroke-width="${f.width}"`);
      if (f.opacity != null) a.push(`stroke-opacity="${f.opacity}"`);
      if (f.dash) a.push(`stroke-dasharray="${f.dash.join(' ')}"`);
      return `<path ${a.join(' ')}/>`;
    })
    .join('');
}

/** Rachaduras do Nefasto, a partir das bordas (paths em 300 × 400). */
export function cardCracksPaths(nick: string): string[] {
  const r = seeded(hashText(nick + 'cracks'));
  const out: string[] = [];
  const starts: [number, number][] = [[0, 60], [300, 120], [0, 300], [300, 340], [80, 400], [220, 0]];
  for (const [sx, sy] of starts) {
    let x = sx;
    let y = sy;
    let d = `M${x} ${y}`;
    const dx = sx === 0 ? 1 : sx === 300 ? -1 : r() - 0.5;
    const dy = sy === 0 ? 1 : sy === 400 ? -1 : r() - 0.5;
    for (let i = 0; i < 6; i++) {
      x += dx * (8 + r() * 14) + (r() - 0.5) * 12;
      y += dy * (8 + r() * 14) + (r() - 0.5) * 12;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    out.push(d);
  }
  return out;
}
export const cardCracksSvg = (nick: string) => cardCracksPaths(nick).map((d) => `<path d="${d}" fill="none" stroke="var(--c2)" stroke-opacity=".4" stroke-width="1"/>`).join('');

/** Número da cópia: 4 dígitos (Nº 0042); a Mítica tem 3 (Nº 001); a lenda, Nº 0. */
export const cardSerialText = (serial: number, cls: CardClassId) => (serial === 0 ? '0' : String(serial).padStart(cls === 'mitica' ? 3 : 4, '0'));
