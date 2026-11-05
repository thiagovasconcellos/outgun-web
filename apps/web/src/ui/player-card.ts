// SPDX-License-Identifier: GPL-2.0-or-later
// Desenho da Carta de Jogador (OG-572, D-94, RN-CRT-01): fundo, boneco em pixels, moldura e
// rachaduras por degrau da escada de exclusividade. Mesma lógica da proposta aprovada
// (`plan/specs/cartas-de-jogador/proposta.html`); aleatoriedade com semente no nick (mesma carta,
// mesmo desenho em qualquer tela).
import { cardClass, type CardClassId } from '@outgun/protocol';

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

function fitCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  return canvas.getContext('2d');
}

/** Fundo da carta: escuro → grade → mais estrelas; Nefasto mais quente e sem grade. */
export function drawCardBackground(canvas: HTMLCanvasElement, look: Pick<CardLook, 'nick' | 'class'> | null, tier: number, c1: string) {
  const ctx = fitCanvas(canvas);
  if (!ctx) return;
  const { width: W, height: H } = canvas;
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
export function drawCardArt(canvas: HTMLCanvasElement, look: CardLook, silhouette = false) {
  const ctx = fitCanvas(canvas);
  if (!ctx) return;
  const cls = cardClass(look.class);
  const t = cls.tier;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const { width: W, height: H } = canvas;
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

/** Moldura por degrau (viewBox 300 × 400, a proporção da carta). Cores por `var(--c1)`/`var(--c2)`. */
const poly = (i: number, cut: number) =>
  `${cut + i},${4 + i} ${296 - cut - i},${4 + i} ${296 - i},${cut + 4 + i} ${296 - i},${396 - cut - i} ${296 - cut - i},${396 - i} ${cut + i},${396 - i} ${4 + i},${396 - cut - i} ${4 + i},${cut + 4 + i}`;
export function cardFrameSvg(t: number): string {
  const cut = 18;
  let s = `<polygon points="${poly(0, cut)}" fill="none" stroke="var(--c1)" stroke-width="2.4"/>`;
  if (t >= 1) s += `<polygon points="${poly(6, cut)}" fill="none" stroke="var(--c2)" stroke-opacity=".55" stroke-width="1"/>`;
  if (t >= 3) s += `<polygon points="${poly(11, cut)}" fill="none" stroke="var(--c1)" stroke-opacity=".45" stroke-width="1" stroke-dasharray="6 4"/>`;
  if (t >= 2) {
    const d = (x: number, y: number, r: number, f: string) => `<polygon points="${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}" fill="${f}" stroke="var(--c2)" stroke-width="1"/>`;
    const f = t === 5 ? 'var(--c2)' : 'var(--c1)';
    s += d(14, 14, 6, f) + d(286, 14, 6, f) + d(14, 386, 6, f) + d(286, 386, 6, f);
    s += '<path d="M24 4h28M248 4h28M24 396h28M248 396h28" stroke="var(--c2)" stroke-width="3"/>';
  }
  if (t >= 3) s += '<path d="M2 170v60M298 170v60" stroke="var(--c2)" stroke-width="4"/><path d="M8 186v28M292 186v28" stroke="var(--c1)" stroke-width="2"/>';
  if (t === 5) {
    const gem = (x: number, y: number) => `<polygon points="${x},${y - 9} ${x + 7},${y} ${x},${y + 9} ${x - 7},${y}" fill="var(--c2)" stroke="#fff6c9" stroke-width="1"/><circle cx="${x}" cy="${y}" r="2.4" fill="var(--c1)"/>`;
    s += gem(150, 4) + gem(150, 396) + gem(4, 200) + gem(296, 200);
  }
  return s;
}

/** Rachaduras do Nefasto, a partir das bordas. */
export function cardCracksSvg(nick: string): string {
  const r = seeded(hashText(nick + 'cracks'));
  let s = '';
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
    s += `<path d="${d}" fill="none" stroke="var(--c2)" stroke-opacity=".4" stroke-width="1"/>`;
  }
  return s;
}

/** Número da cópia: 4 dígitos (Nº 0042); a Mítica tem 3 (Nº 001); a lenda, Nº 0. */
export const cardSerialText = (serial: number, cls: CardClassId) => (serial === 0 ? '0' : String(serial).padStart(cls === 'mitica' ? 3 : 4, '0'));
