// SPDX-License-Identifier: GPL-2.0-or-later
// Estatísticas para as telas F3/F4 (OG-066, spec plan/specs/telas-estatisticas.md). O original manda
// um retrato ao entrar (`send_stats`, `send_team_stats`) e o cliente segue contando pelos eventos;
// aqui o servidor manda o retrato do jogador (e do time) sempre que um contador muda — os mesmos
// valores, sem refazer a contagem no cliente. Movimento e tiros: no original só no fim da partida; na v2
// também durante, a cada `MOVEMENT_SHOTS_PERIOD` segundos (OG-543, issue #32: F4 zerada no meio do jogo).
import { message, type AnyMessage } from '@outgun/protocol';
import { CarriedFlag, flagCarryingTime, lifetime, playtime, type PlayerState, type TeamState } from '@outgun/sim';

const FLAG = { [CarriedFlag.None]: 'none', [CarriedFlag.Own]: 'own', [CarriedFlag.Enemy]: 'enemy', [CarriedFlag.Wild]: 'wild' } as const;

/** Contadores que, mudando, pedem um novo `stats` (os tempos o cliente extrapola). */
export function statsKey(p: PlayerState): string {
  const s = p.stats;
  return [s.frags, s.kills, s.deaths, s.consKills, s.curConsKills, s.consDeaths, s.curConsDeaths, s.suicides, s.captures, s.assists, s.flagsTaken, s.flagsDropped, s.flagsReturned, s.carriersKilled, s.carriedFlag, s.dead ? 1 : 0, s.startTime].join(',');
}

/** `data_stats` (`send_stats`): tempos em segundos inteiros, como no original. */
export function statsMessage(p: PlayerState, time: number): AnyMessage {
  const s = p.stats;
  const secs = (v: number) => Math.max(0, Math.trunc(v));
  return message('stats', {
    stats: {
      pid: p.pid,
      carriedFlag: FLAG[s.carriedFlag],
      dead: s.dead,
      frags: s.frags,
      kills: s.kills,
      deaths: s.deaths,
      consKills: s.consKills,
      curConsKills: s.curConsKills,
      consDeaths: s.consDeaths,
      curConsDeaths: s.curConsDeaths,
      suicides: s.suicides,
      captures: s.captures,
      assists: s.assists,
      flagsTaken: s.flagsTaken,
      flagsDropped: s.flagsDropped,
      flagsReturned: s.flagsReturned,
      carriersKilled: s.carriersKilled,
      playtime: secs(playtime(s, time)),
      lifetime: secs(lifetime(s, time)),
      flagCarryingTime: secs(flagCarryingTime(s, time)),
    },
  });
}

export function teamStatsKey(t: TeamState): string {
  return [t.kills, t.deaths, t.suicides, t.flagsTaken, t.flagsDropped, t.flagsReturned, t.captures.length].join(',');
}

/** `data_team_stats` + capturas (o original as manda nos eventos `data_capture`). */
export function teamStatsMessage(team: 0 | 1, t: TeamState): AnyMessage {
  return message('teamStats', {
    team: team === 0 ? 'red' : 'blue',
    kills: t.kills,
    deaths: t.deaths,
    suicides: t.suicides,
    flagsTaken: t.flagsTaken,
    flagsDropped: t.flagsDropped,
    flagsReturned: t.flagsReturned,
    captures: t.captures.slice(-1024).map((c) => ({ time: Math.max(0, Math.trunc(c.time)), pid: c.pid, assistant: c.assistPid < 0 ? 255 : c.assistPid })),
  });
}

type MovementShots = { movement: number; shots: number; hits: number; shotsTaken: number };
const ms = (x: MovementShots) => ({
  movement: Math.max(0, Math.trunc(x.movement)),
  shots: x.shots,
  hits: x.hits,
  shotsTaken: x.shotsTaken,
});

/** De quantos em quantos segundos (do jogo) tiros e movimento saem durante a partida (OG-543). */
export const MOVEMENT_SHOTS_PERIOD = 2;

/** Valores de `movementShots` como enviados; mudando, pedem uma nova mensagem. */
export function movementShotsKey(x: MovementShots): string {
  const v = ms(x);
  return `${v.movement},${v.shots},${v.hits},${v.shotsTaken}`;
}

export function movementShotsMessage(pid: number, x: MovementShots): AnyMessage {
  return message('movementShots', { pid, data: ms(x) });
}

export function teamMovementShotsMessage(teams: readonly [TeamState, TeamState]): AnyMessage {
  return message('teamMovementShots', { red: ms(teams[0]), blue: ms(teams[1]) });
}

/** Fim de partida (`server_next_map`): movimento e tiros de cada um e dos times, e `stats_ready`. */
export function endOfGameMessages(players: readonly PlayerState[], teams: readonly [TeamState, TeamState]): AnyMessage[] {
  return [
    ...players.map((p) => movementShotsMessage(p.pid, p.stats)),
    teamMovementShotsMessage(teams),
    message('statsReady', {}),
  ];
}
