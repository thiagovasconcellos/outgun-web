// SPDX-License-Identifier: GPL-2.0-or-later
// Perda do contexto WebGL (OG-539): a GPU falhou, o driver reiniciou ou o processo da GPU do
// navegador/app caiu. Sem tratar, o canvas fica preto até recarregar (o incidente da semifinal da
// OutCup, no app da Steam). Aqui: o aviso na tela, a volta sozinha quando o navegador devolve o
// contexto (o PixiJS refaz texturas e buffers no `contextChange`) e, se não voltar no prazo, a opção
// de recarregar a página (a conta volta para a mesma vaga, OG-262).

/** `null`: vídeo normal; `lost`: esperando o contexto voltar; `stuck`: não voltou no prazo. */
export type VideoState = 'lost' | 'stuck' | null;

export interface ContextLossOptions {
  readonly onChange: (state: VideoState) => void;
  /** Contexto devolvido: quem tem cache de desenho na GPU o refaz. */
  readonly onRestored?: () => void;
  /** Para a telemetria (uma vez por evento). */
  readonly onEvent?: (event: 'lost' | 'restored' | 'stuck') => void;
  /** Quanto esperar o navegador devolver o contexto antes de oferecer recarregar. */
  readonly timeoutMs?: number;
  /**
   * Extensão `WEBGL_lose_context` do próprio contexto: pede a volta se o navegador não a fizer sozinho
   * (só funciona quando a perda não veio da GPU de verdade).
   */
  readonly loseContext?: () => { restoreContext(): void } | null;
}

export const CONTEXT_RESTORE_TIMEOUT_MS = 8000;
/** Depois do evento de perda, quando tentar a volta pela extensão. */
const RESTORE_NUDGE_MS = 1000;

export function watchContextLoss(canvas: HTMLCanvasElement, opts: ContextLossOptions): () => void {
  let stuckTimer: ReturnType<typeof setTimeout> | undefined;
  let nudgeTimer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    clearTimeout(stuckTimer);
    clearTimeout(nudgeTimer);
  };
  const lost = (ev: Event) => {
    // sem o preventDefault o navegador nunca devolve o contexto
    ev.preventDefault();
    clear();
    opts.onEvent?.('lost');
    opts.onChange('lost');
    nudgeTimer = setTimeout(() => {
      try {
        opts.loseContext?.()?.restoreContext();
      } catch {
        // a perda veio da GPU: só o navegador devolve
      }
    }, RESTORE_NUDGE_MS);
    stuckTimer = setTimeout(() => {
      opts.onEvent?.('stuck');
      opts.onChange('stuck');
    }, opts.timeoutMs ?? CONTEXT_RESTORE_TIMEOUT_MS);
  };
  const restored = () => {
    clear();
    opts.onEvent?.('restored');
    opts.onRestored?.();
    opts.onChange(null);
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  return () => {
    clear();
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
  };
}
