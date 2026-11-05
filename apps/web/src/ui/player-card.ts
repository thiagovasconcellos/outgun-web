// SPDX-License-Identifier: GPL-2.0-or-later
// Carta de Jogador no navegador (OG-572): o desenho mora em `@outgun/protocol` (OG-583, o mesmo da
// imagem PNG da API); aqui só ajustamos o canvas ao tamanho na tela.
import { drawCardArt as drawArt, drawCardBackground as drawBackground, type CardCtx, type CardLook } from '@outgun/protocol';

export { cardCracksSvg, cardFrameSvg, cardSerialText, hashText, seeded, SPRITE_CELLS, type CardLook } from '@outgun/protocol';

function fitCanvas(canvas: HTMLCanvasElement): { ctx: CardCtx; dpr: number } | null {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  const ctx = canvas.getContext('2d');
  return ctx ? { ctx: ctx as unknown as CardCtx, dpr } : null;
}

export function drawCardBackground(canvas: HTMLCanvasElement, look: Pick<CardLook, 'nick' | 'class'> | null, tier: number, c1: string) {
  const f = fitCanvas(canvas);
  if (f) drawBackground(f.ctx, canvas.width, canvas.height, look, tier, c1);
}
export function drawCardArt(canvas: HTMLCanvasElement, look: CardLook, silhouette = false) {
  const f = fitCanvas(canvas);
  if (f) drawArt(f.ctx, canvas.width, canvas.height, f.dpr, look, silhouette);
}
