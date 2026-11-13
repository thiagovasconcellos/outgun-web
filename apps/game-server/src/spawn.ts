// SPDX-License-Identifier: GPL-2.0-or-later
// Salas abertas sob demanda (OG-086): a API escolhe este servidor e manda a configuração da sala
// no ticket (claim `spawn`); aqui ela é conferida e a sala é criada com os mapas da pasta.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GameMap } from '@outgun/sim';
import { clampTraining, type RankedRoomFormat, formatPlayers, isRankedFormat, isSeriesBestOf, TRAINING_MAX_PLAYERS, trainingMapsFor } from '@outgun/settings';
import type { RoomSpawn } from '@outgun/tickets';
import { casualChoices, loadMaps, panelRotationKeys, resolveRotation, rotationFor, withinRotation, type Rotations } from './maps.js';
import type { GeneratedMaps } from './generated-maps.js';
import { findPreset } from './presets.js';
import type { Room } from './room.js';
import type { RoomManager } from './rooms.js';

export interface SpawnerOptions {
  mapsDir: string;
  /**
   * Rotação oficial de cada modo (a do Ranked é a única que salas Ranked usam, RN-MOD-04). O objeto
   * é lido a cada sala aberta: o painel admin (OG-087) pode trocá-lo.
   */
  rotations: Rotations;
  log?: (line: string) => void;
  /** Mapas gerados para as entradas `random_map` (OG-015). */
  generatedMaps?: GeneratedMaps;
  /** Busca de mapas por nome; padrão: só a pasta (a do `main` inclui os da moderação, OG-367). */
  map?: (name: string) => GameMap | undefined;
  /** Registra na API o novo formato/série do lobby (OG-612); ausente = sem API, vale direto. */
  reconfigureApi?: (roomId: string, next: { format: string; bestOf: number }) => Promise<boolean>;
}

/** Mapas da pasta por nome, com cache (nomes com barra ou inexistentes dão undefined). */
export function mapLoader(mapsDir: string): (name: string) => GameMap | undefined {
  const cache = new Map<string, GameMap>();
  return (name) => {
    if (!cache.has(name)) {
      if (!/^[^/\\]+$/.test(name) || !existsSync(join(mapsDir, `${name}.txt`))) return undefined;
      try {
        cache.set(name, loadMaps(mapsDir, [name])[0]!);
      } catch {
        return undefined;
      }
    }
    return cache.get(name);
  };
}

export function makeSpawner(manager: RoomManager, options: SpawnerOptions): (id: string, spec: RoomSpawn) => Room | undefined {
  const map = options.map ?? mapLoader(options.mapsDir);

  const spawn = (id: string, spec: RoomSpawn): Room | undefined => {
    const preset = findPreset(spec.preset);
    if (!preset || preset.mode !== spec.mode) return undefined;
    // formato e série só no Ranked, e a sala tem exatamente 2 × N vagas (OG-250)
    const ranked = spec.ranked;
    if (ranked && (spec.mode !== 'ranked' || !isRankedFormat(ranked.format) || !isSeriesBestOf(ranked.bestOf))) return undefined;
    if (!manager.hasCapacity) {
      options.log?.(`sala ${id} recusada: limite de ${manager.maxRooms} salas`);
      return undefined;
    }
    // Ranked sempre com a rotação oficial; Casual pode trazer a sua (mapas desconhecidos saem), só
    // entre os da rotação do painel quando há uma (D-69); as duas aceitam `random_map L A ...` (OG-015)
    // sala de treino (OG-492, D-87): um dos mapas de treino, fora da rotação do painel
    const training = spec.mode === 'casual' && spec.training ? clampTraining(spec.training) : undefined;
    const chosen = training
      ? (spec.maps ?? []).filter((m) => trainingMapsFor(training.mode).includes(m)).slice(0, 1)
      : spec.mode === 'casual' && spec.maps
        ? panelRotationKeys.has('casual')
          ? withinRotation(spec.maps, casualChoices(options.rotations, spec.maxPlayers))
          : spec.maps
        : [];
    if (training && chosen.length === 0) return undefined;
    const wanted = resolveRotation(chosen, map, options.generatedMaps);
    const slots = wanted.length > 0 ? wanted : resolveRotation(rotationFor(options.rotations, spec.mode, ranked?.format), map, options.generatedMaps);
    if (slots.length === 0) return undefined;
    const files = slots.map((s) => s.file);
    const room = manager.create({
      id,
      name: spec.name,
      preset: preset.id,
      maps: slots.map((s) => s.map),
      mapFiles: files,
      ...(slots.some((s) => s.random) ? { randomSlots: slots.map((s) => s.random ?? null) } : {}),
      maxPlayers: ranked ? formatPlayers(ranked.format) : training ? TRAINING_MAX_PLAYERS : spec.maxPlayers,
      persistent: spec.persistent,
      ...(ranked ? { ranked: { format: ranked.format, bestOf: ranked.bestOf } } : {}),
      ...(ranked && spec.ownerId ? { ownerId: spec.ownerId } : {}),
      ...(ranked && spec.ownerId && !spec.cup
        ? {
            reconfigure: (next) => {
              void reconfigure(id, spec, next);
            },
          }
        : {}),
      ...(training ? { training } : {}),
      ...(ranked && spec.cup ? { cup: { sides: spec.cup.sides } } : {}),
      ...(spec.mode === 'casual' && !training && spec.casualBots ? { casualBots: { bots: spec.casualBots.bots, level: spec.casualBots.level } } : {}),
      ...(wanted.length > 0 ? { chosenMaps: chosen } : {}),
    });
    options.log?.(`sala ${id} aberta (${spec.mode}, ${preset.id}, ${files.length} mapas${ranked ? `, ${ranked.format} md${ranked.bestOf}` : ''})`);
    return room;
  };

  /** Recria o lobby com o novo formato (OG-612): API primeiro; depois a sala velha fecha e a nova abre com o mesmo id. */
  const reconfigure = async (id: string, spec: RoomSpawn, next: RankedRoomFormat): Promise<void> => {
    const room = manager.get(id);
    if (!room?.reconfigurable) return;
    const ok = options.reconfigureApi ? await options.reconfigureApi(id, next) : true;
    const revert = () => (spec.ranked && options.reconfigureApi ? options.reconfigureApi(id, spec.ranked) : Promise.resolve(true));
    if (!ok) return;
    // a fase pode ter mudado durante a chamada: desfaz na API e deixa a sala como está
    if (manager.get(id) !== room || !room.reconfigurable) {
      await revert();
      return;
    }
    manager.close(id, 'reconfigured');
    const fresh = spawn(id, { ...spec, ranked: next, maxPlayers: formatPlayers(next.format) });
    options.log?.(`sala ${id} recriada: ${next.format} md${next.bestOf}${fresh ? '' : ' (FALHOU)'}`);
  };
  return spawn;
}
