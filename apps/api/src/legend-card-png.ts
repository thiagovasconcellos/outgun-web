// SPDX-License-Identifier: GPL-2.0-or-later
// Imagem PNG da Carta de Jogador (OG-583, D-95): a frente parada da carta, desenhada no servidor com
// o mesmo código do jogo (`@outgun/protocol`, legend-card-art) — fundo, boneco, moldura, rachaduras —
// e o mesmo layout do componente (`apps/web/src/ui/PlayerCard.tsx`, medidas em % da largura). Só
// boneco, nick, classe e estrelas: nada da ficha (vai para o inventário Steam). Sem animação e sem
// número da cópia (uma imagem por carta).
import { createRequire } from 'node:module';
import { createCanvas, GlobalFonts, Path2D, type SKRSContext2D } from '@napi-rs/canvas';
import { cardClass, cardCracksPaths, cardFrameShapes, drawCardArt, drawCardBackground, type CardCtx, type CardLook } from '@outgun/protocol';

const require = createRequire(import.meta.url);
let fontReady = false;
function ensureFont() {
  if (fontReady) return;
  // a fonte única do jogo (Inter, D-35), a mesma do cliente
  GlobalFonts.registerFromPath(require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'), 'Inter');
  fontReady = true;
}

export const CARD_PNG_WIDTH = 512;

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** PNG da frente da carta (largura `W`, proporção 3:4). */
export function renderCardPng(look: CardLook, W = CARD_PNG_WIDTH): Buffer {
  ensureFont();
  const H = Math.round((W * 4) / 3);
  const u = W / 100; // 1cqw
  const cls = cardClass(look.class);
  const t = cls.tier;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const shared = ctx as unknown as CardCtx;

  // cantos arredondados da carta
  roundRect(ctx, 0, 0, W, H, 1.2 * u);
  ctx.clip();
  drawCardBackground(shared, W, H, look, t, cls.c1);

  const sx = W / 300;
  const sy = H / 400;
  const strokePath = (d: string, color: string, width: number, alpha = 1, dash?: [number, number]) => {
    ctx.save();
    ctx.scale(sx, sy);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash ?? []);
    ctx.stroke(new Path2D(d));
    ctx.restore();
  };
  if (t === 4) for (const d of cardCracksPaths(look.nick)) strokePath(d, cls.c2, 1, 0.4);

  // moldura com o brilho da classe (drop-shadow do CSS)
  const glow = [0.3, 0.6, 1.6, 2.2, 2.2, 3][t]! * u;
  ctx.save();
  ctx.shadowColor = cls.c1;
  ctx.shadowBlur = glow;
  for (const f of cardFrameShapes(t)) {
    const color = (n?: 1 | 2) => (n === 2 ? cls.c2 : cls.c1);
    if (f.fill) {
      ctx.save();
      ctx.scale(sx, sy);
      ctx.fillStyle = color(f.fill);
      ctx.fill(new Path2D(f.d));
      ctx.restore();
    }
    if (f.light) strokePath(f.d, '#fff6c9', f.width ?? 1);
    else if (f.stroke) strokePath(f.d, color(f.stroke), f.width ?? 1, f.opacity ?? 1, f.dash);
  }
  ctx.restore();

  // grade do conteúdo: inset 6cqw 7cqw; linhas 16cqw, 1fr, 16cqw, 12cqw; gap 3cqw
  const x0 = 7 * u;
  const y0 = 6 * u;
  const iw = W - 14 * u;
  const ih = H - 12 * u;
  const gap = 3 * u;
  const headH = 16 * u;
  const nameH = 16 * u;
  const classH = 12 * u;
  const artY = y0 + headH + gap;
  const artH = ih - headH - nameH - classH - 3 * gap;
  const nameY = artY + artH + gap;
  const classY = nameY + nameH + gap;

  const box = (x: number, y: number, w: number, h: number) => {
    ctx.save();
    roundRect(ctx, x, y, w, h, 1.2 * u);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    if (t > 0) {
      ctx.shadowColor = cls.c1;
      ctx.shadowBlur = 1.2 * u;
    }
    ctx.strokeStyle = cls.c1;
    ctx.lineWidth = 0.3 * u;
    ctx.stroke();
    ctx.restore();
  };
  const spaced = (em: number, size: number) => {
    const c = ctx as unknown as { letterSpacing?: string };
    if ('letterSpacing' in c) c.letterSpacing = `${em * size}px`;
  };

  // cabeçalho: OUTGUN + "Carta de jogador"
  ctx.font = `italic 900 ${9 * u}px Inter`;
  spaced(0.01, 9 * u);
  const logoW = ctx.measureText('OUTGUN').width;
  ctx.font = `700 ${3.2 * u}px Inter`;
  spaced(0.08, 3.2 * u);
  const subW = ctx.measureText('CARTA DE JOGADOR').width;
  const headW = Math.max(logoW, subW) + 18 * u;
  const headX = x0 + (iw - headW) / 2;
  box(headX, y0, headW, headH);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const metal = ctx.createLinearGradient(0, y0 + 2 * u, 0, y0 + 10 * u);
  metal.addColorStop(0, '#ffffff');
  metal.addColorStop(0.45, '#c9ced6');
  metal.addColorStop(0.55, '#6c727c');
  metal.addColorStop(1, '#e9edf2');
  ctx.font = `italic 900 ${9 * u}px Inter`;
  spaced(0.01, 9 * u);
  ctx.fillStyle = metal;
  ctx.fillText('OUTGUN', W / 2, y0 + 9.4 * u);
  ctx.font = `700 ${3.2 * u}px Inter`;
  spaced(0.08, 3.2 * u);
  ctx.fillStyle = cls.c2;
  ctx.fillText('CARTA DE JOGADOR', W / 2, y0 + 13.4 * u);

  // boneco (num canvas à parte, como no componente)
  const art = createCanvas(Math.round(iw), Math.round(artH));
  drawCardArt(art.getContext('2d') as unknown as CardCtx, art.width, art.height, 1, look);
  ctx.drawImage(art, x0, artY);

  // nick ajustado à largura
  box(x0, nameY, iw, nameH);
  let size = 12 * u;
  const maxW = iw - 7 * u;
  ctx.font = `italic 900 ${size}px Inter`;
  spaced(-0.01, size);
  while (ctx.measureText(look.nick).width > maxW && size > 6) {
    size *= 0.94;
    ctx.font = `italic 900 ${size}px Inter`;
    spaced(-0.01, size);
  }
  const ny = nameY + nameH / 2 + size * 0.36;
  let nickFill: string | ReturnType<SKRSContext2D['createLinearGradient']> = cls.c2;
  if (t === 1) {
    const g = ctx.createLinearGradient(0, ny - size * 0.8, 0, ny);
    g.addColorStop(0, cls.c2);
    g.addColorStop(1, cls.c1);
    nickFill = g;
  } else if (t >= 2 && t <= 4) {
    const g = ctx.createLinearGradient(0, ny - size * 0.8, 0, ny + size * 0.1);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.38, cls.c2);
    g.addColorStop(0.72, cls.c1);
    g.addColorStop(1, '#333333');
    nickFill = g;
  } else if (t === 5) {
    const g = ctx.createLinearGradient(x0, 0, x0 + iw, 0);
    ['#ffffff', cls.c2, '#9dffe8', '#ffe58a', cls.c1, '#ffffff'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    nickFill = g;
  }
  ctx.save();
  if (t >= 2) {
    ctx.shadowColor = cls.c1;
    ctx.shadowBlur = (t === 5 ? 1.2 : 0.8) * u;
  }
  ctx.fillStyle = nickFill as string;
  ctx.fillText(look.nick.toUpperCase(), W / 2, ny);
  ctx.restore();

  // classe e estrelas
  ctx.save();
  ctx.shadowColor = cls.c1;
  ctx.shadowBlur = 1.2 * u;
  ctx.fillStyle = cls.c2;
  ctx.font = `800 ${5.4 * u}px Inter`;
  spaced(0.12, 5.4 * u);
  ctx.fillText(cls.name.toUpperCase(), W / 2, classY + 5.6 * u);
  // estrelas desenhadas (a Inter não tem o ★)
  const r = 1.6 * u;
  const step = 5.4 * u;
  const sy0 = classY + 9.4 * u;
  for (let k = 0; k <= t; k++) {
    const cx = W / 2 + (k - t / 2) * step;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(cx + Math.cos(a) * rr, sy0 + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // reflexo parado a partir do Lendário
  if (t >= 2) {
    const g = ctx.createRadialGradient(W * 0.3, H * 0.22, 0, W * 0.3, H * 0.22, W * 0.45);
    g.addColorStop(0, t === 5 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  return canvas.toBuffer('image/png');
}
