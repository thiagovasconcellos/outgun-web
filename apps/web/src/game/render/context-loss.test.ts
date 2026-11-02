// SPDX-License-Identifier: GPL-2.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTEXT_RESTORE_TIMEOUT_MS, watchContextLoss, type VideoState } from './context-loss.js';

// o canvas só precisa dos eventos; `WEBGL_lose_context` é simulado como a extensão faz
const setup = () => {
  const canvas = new EventTarget() as HTMLCanvasElement;
  const states: VideoState[] = [];
  const events: string[] = [];
  const onRestored = vi.fn();
  const ext = {
    loseContext: () => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    restoreContext: vi.fn(() => canvas.dispatchEvent(new Event('webglcontextrestored'))),
  };
  const stop = watchContextLoss(canvas, { onChange: (s) => states.push(s), onRestored, onEvent: (e) => events.push(e), loseContext: () => ext });
  return { canvas, states, events, onRestored, ext, stop };
};

describe('perda do contexto WebGL (OG-539)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mostra o aviso, pede o contexto de volta e volta a desenhar sem recarregar', () => {
    const { canvas, states, events, onRestored, ext } = setup();
    const ev = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true); // sem isso o navegador não devolve o contexto
    expect(states).toEqual(['lost']);
    vi.advanceTimersByTime(1000);
    expect(ext.restoreContext).toHaveBeenCalledOnce();
    expect(onRestored).toHaveBeenCalledOnce();
    expect(states).toEqual(['lost', null]);
    vi.advanceTimersByTime(CONTEXT_RESTORE_TIMEOUT_MS);
    expect(states).toEqual(['lost', null]); // voltou: o prazo não dispara
    expect(events).toEqual(['lost', 'restored']);
  });

  it('sem volta no prazo, oferece recarregar', () => {
    const { ext, states, events } = setup();
    ext.restoreContext.mockImplementation(() => {
      throw new Error('INVALID_OPERATION'); // perda vinda da GPU: só o navegador devolve
    });
    ext.loseContext();
    vi.advanceTimersByTime(CONTEXT_RESTORE_TIMEOUT_MS);
    expect(states).toEqual(['lost', 'stuck']);
    expect(events).toEqual(['lost', 'stuck']);
  });

  it('desligado, não ouve mais o canvas', () => {
    const { ext, states, stop } = setup();
    stop();
    ext.loseContext();
    vi.advanceTimersByTime(CONTEXT_RESTORE_TIMEOUT_MS);
    expect(states).toEqual([]);
  });
});
