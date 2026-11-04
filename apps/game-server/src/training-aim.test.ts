// SPDX-License-Identifier: GPL-2.0-or-later
// Treino de mira (OG-568, RN-TRN-09): meta de 70 tiros e 90 % em 60 s; o sucesso troca o lado da gaiola.
import { fileURLToPath } from 'node:url';
import { Position, ROOM_WIDTH } from '@outgun/sim';
import { describe, expect, it } from 'vitest';
import { loadMaps } from './maps.js';
import { aimMode, aimOutcome } from './training-aim.js';
import { COUNTDOWN_FRAMES, RESULT_FRAMES, TrainingSession, type AimAnnouncement, type TrainingAnnouncement, type TrainingPlayer, type TrainingWorld } from './training.js';

const t4 = loadMaps(fileURLToPath(new URL('../training-maps', import.meta.url)), ['t4'])[0]!;

describe('meta do Treino de mira', () => {
  it('70 tiros e 90 % ou mais: sucesso; senão o motivo', () => {
    expect(aimOutcome(70, 63)).toEqual({ success: true, reason: 'aimGoal' });
    expect(aimOutcome(69, 69)).toEqual({ success: false, reason: 'aimShots' });
    expect(aimOutcome(100, 89)).toEqual({ success: false, reason: 'aimAccuracy' });
  });
});

describe('tentativa do Treino de mira no T4', () => {
  function run(hitsPerShot: number) {
    let frame = 0;
    const me: TrainingPlayer = { pid: 0, team: 0, bot: false, role: null, dead: false, ready: true, pos: new Position(0, 0, 50, 50), carrying: null };
    const bot: TrainingPlayer = { pid: 1, team: 1, bot: true, role: 'target', dead: false, ready: true, pos: new Position(0, 0, 10, 10), carrying: null };
    const stats = { shots: 0, hits: 0 };
    const world: TrainingWorld = {
      map: t4,
      get frame() {
        return frame;
      },
      players: () => [me, bot],
      flag: () => null,
      shotStats: (pid) => (pid === 0 ? { ...stats } : { shots: 0, hits: 0 }),
    };
    const log: TrainingAnnouncement[] = [];
    const aim: AimAnnouncement[] = [];
    const session = new TrainingSession({ mode: 'aim', bots: 1, allies: 0, level: 3, powerups: false, sameStart: false }, aimMode, world, {
      setBots: () => {},
      place: (pid, pos) => {
        const p = pid === 0 ? me : bot;
        p.pos = pos;
      },
      resetFlags: () => {},
      announce: (s) => log.push(s),
      announceAim: (s) => aim.push(s),
      holdRespawn: () => {},
    }, 7);
    const step = (n: number) => {
      for (let i = 0; i < n; i++) {
        frame++;
        if (session.phase === 'playing' && frame % 5 === 0) {
          stats.shots++; // um tiro a cada 0,5 s = 120 por minuto
          stats.hits += hitsPerShot;
        }
        session.tick();
      }
    };
    return { session, step, me, bot, log, aim };
  }

  it('sucesso aos 60 s e a próxima tentativa começa do outro lado', () => {
    const r = run(1);
    r.step(1);
    expect(r.bot.pos.x).toBe(ROOM_WIDTH / 2);
    expect(r.me.pos.x).toBeLessThan(ROOM_WIDTH / 2); // começa pela esquerda
    r.step(COUNTDOWN_FRAMES + 600);
    expect(r.log.at(-1)).toMatchObject({ phase: 'result', result: 'success', reason: 'aimGoal' });
    expect(r.aim.at(-1)).toMatchObject({ tenthsLeft: 0, side: 0 });
    expect(r.aim.at(-1)!.shots).toBeGreaterThanOrEqual(70);
    r.step(RESULT_FRAMES + 1);
    expect(r.me.pos.x).toBeGreaterThan(ROOM_WIDTH / 2); // trocou de lado
  });

  it('precisão baixa: falha e repete o lado', () => {
    const r = run(0);
    r.step(1 + COUNTDOWN_FRAMES + 600);
    expect(r.log.at(-1)).toMatchObject({ result: 'fail', reason: 'aimAccuracy' });
    r.step(RESULT_FRAMES + 1);
    expect(r.me.pos.x).toBeLessThan(ROOM_WIDTH / 2);
  });
});
