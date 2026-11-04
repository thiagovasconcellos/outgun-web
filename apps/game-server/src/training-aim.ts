// SPDX-License-Identifier: GPL-2.0-or-later
// Treino de mira (OG-568, D-93, RN-TRN-09): 1 minuto atirando no bot preso na gaiola do centro do T4.
// O alvo é imortal e não atira; quem treina começa de um lado da gaiola (esquerda ou direita, num ponto
// sorteado). Aos 60 s: sucesso com no mínimo 70 tiros e 90 % de precisão; o sucesso troca o lado.
import { AIM_TRAINING } from '@outgun/settings';
import { Position, ROOM_HEIGHT, ROOM_WIDTH } from '@outgun/sim';
import { OPPONENT_TEAM, type TrainingModeDef, type TrainingOutcome } from './training.js';

/** Centro da gaiola: o centro da sala (`spawn 1 0 0 8 6` do T4). */
const CX = ROOM_WIDTH / 2;
const CY = ROOM_HEIGHT / 2;

/** Resultado de uma tentativa pelos tiros e acertos (RN-TRN-09). */
export function aimOutcome(shots: number, hits: number): TrainingOutcome {
  if (shots < AIM_TRAINING.shots) return { success: false, reason: 'aimShots' };
  if (hits * 100 < AIM_TRAINING.accuracy * shots) return { success: false, reason: 'aimAccuracy' };
  return { success: true, reason: 'aimGoal' };
}

export const aimMode: TrainingModeDef = {
  roster: () => [{ team: OPPONENT_TEAM, role: 'target' }],
  place: (ctx, players) => {
    const out = new Map<number, Position>();
    const dir = ctx.side === 0 ? -1 : 1;
    for (const p of players) {
      if (p.bot || p.team === OPPONENT_TEAM) {
        out.set(p.pid, new Position(0, 0, CX, CY));
        continue;
      }
      // dentro do chão (círculo de raio ~133 px), do lado da vez, fora da linha do alvo às vezes
      let pos = new Position(0, 0, CX + dir * 90, CY);
      for (let i = 0; i < 20; i++) {
        const x = CX + dir * (60 + (ctx.rng.rand() % 50));
        const y = CY - 50 + (ctx.rng.rand() % 101);
        if (Math.hypot(x - CX, y - CY) > 115 || ctx.map.fallOnWallCirc({ room: { x: 0, y: 0 }, x, y }, 17)) continue;
        pos = new Position(0, 0, x, y);
        break;
      }
      out.set(p.pid, pos);
    }
    return out;
  },
  judge: (_world, ev, ctx) => {
    if (ev.kind !== 'frame' || ctx.attempt.frames < AIM_TRAINING.seconds * 10) return null;
    return aimOutcome(ctx.attempt.shots, ctx.attempt.hits);
  },
  switchSideOnSuccess: true,
  tallyShots: true,
};
