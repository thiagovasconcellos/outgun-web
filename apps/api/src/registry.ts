// SPDX-License-Identifier: GPL-2.0-or-later
// Registro de salas e game servers (OG-086), no lugar do master server do original: os servidores
// mandam heartbeat (POST /internal/rooms/heartbeat) e a API decide onde cada sala roda. Uma sala
// que ainda não está no ar é aberta no servidor menos carregado pelo próprio ticket de entrada
// (claim `spawn`), sem chamada direta da API ao servidor.
import { isSeriesBestOf } from '@outgun/settings';
import type { RoomSpawn } from '@outgun/tickets';
import { eq, gt } from 'drizzle-orm';
import type { Db } from './db/client.js';
import { gameServers, rooms } from './db/schema.js';

/** Intervalo dos heartbeats dos game servers. */
export const HEARTBEAT_MS = 3_000;
/** Sala (ou servidor) sem heartbeat há mais disso sai do ar: some do lobby em ≤ 10 s. */
export const ONLINE_MS = 10_000;

export type RoomRow = typeof rooms.$inferSelect;
export type ServerRow = typeof gameServers.$inferSelect;

export function roomOnline(room: Pick<RoomRow, 'lastHeartbeatAt'>, now = Date.now()): boolean {
  return room.lastHeartbeatAt !== null && now - room.lastHeartbeatAt.getTime() < ONLINE_MS;
}

/** Humanos na sala: o roster do heartbeat marca os bots; sem roster (servidor antigo), conta o total. */
export function roomHumans(room: Pick<RoomRow, 'players' | 'roster'>): number {
  return room.roster.length > 0 ? room.roster.filter((p) => !p.bot).length : room.players;
}

export async function onlineServers(db: Db, now = Date.now()): Promise<ServerRow[]> {
  return db
    .select()
    .from(gameServers)
    .where(gt(gameServers.lastHeartbeatAt, new Date(now - ONLINE_MS)));
}

/**
 * Servidor menos carregado (menos jogadores por sala livre) com vaga para mais uma sala. Com região
 * pedida, só os dessa região; outra região só quando ela não tem servidor com vaga (RN-REG-02, OG-545;
 * quem chama registra o desvio com `regionFallback`).
 */
export function pickServer(servers: readonly ServerRow[], region?: string): ServerRow | undefined {
  const free = servers.filter((s) => s.rooms < s.maxRooms);
  const pool = region && free.some((s) => s.region === region) ? free.filter((s) => s.region === region) : free;
  return [...pool].sort((a, b) => a.players - b.players || a.rooms - b.rooms || a.id.localeCompare(b.id))[0];
}

/** Servidores que podem hospedar uma sala do modo: os só Casual ficam fora do Ranked e da OutCup (RN-REG-06, OG-597). */
export function serversForMode(servers: readonly ServerRow[], mode: string, casualOnly: ReadonlySet<string>): ServerRow[] {
  return mode === 'ranked' ? servers.filter((s) => !casualOnly.has(s.id)) : [...servers];
}

/** A região pedida tem servidor, mas todos só Casual: o Ranked ir para outra região é o esperado, não desvio. */
export function regionOnlyCasual(servers: readonly ServerRow[], region: string | undefined, casualOnly: ReadonlySet<string>): boolean {
  const here = servers.filter((s) => s.region === region);
  return here.length > 0 && here.every((s) => casualOnly.has(s.id));
}

/** O servidor escolhido é de outra região que a pedida (sem vaga na pedida): vai para o log. */
export function regionFallback(server: Pick<ServerRow, 'region'> | undefined, region: string | undefined): boolean {
  return region !== undefined && server !== undefined && server.region !== region;
}

export function roomSpawn(room: RoomRow): RoomSpawn {
  return {
    name: room.name,
    mode: room.mode,
    preset: room.preset,
    maxPlayers: room.maxPlayers,
    persistent: room.persistent,
    ...(room.maps && room.maps.length > 0 ? { maps: room.maps } : {}),
    ...(room.mode === 'ranked' && room.ownerId ? { ownerId: room.ownerId } : {}),
    ...(room.format && isSeriesBestOf(room.bestOf) ? { ranked: { format: room.format, bestOf: room.bestOf } } : {}),
    ...(room.mode === 'casual' && room.bots !== null && room.botLevel !== null ? { casualBots: { bots: room.bots, level: room.botLevel } } : {}),
    ...(room.mode === 'casual' && room.training ? { training: room.training } : {}),
    ...(room.cup ? { cup: { sides: room.cup.sides } } : {}),
  };
}

export type Placement = { ok: true; wsUrl: string; spawn?: RoomSpawn; /** região do servidor escolhido agora (sala que ainda não estava no ar) */ region?: string; /** Ranked pedido numa região só Casual: sair dela é o esperado (OG-597) */ expectedFallback?: boolean } | { ok: false };

/**
 * Onde o jogador conecta: no servidor que hospeda a sala; se ela não está no ar, no servidor ao
 * qual já foi atribuída (se ainda estiver no ar) ou no menos carregado, com o pedido de abertura.
 * Sem servidor algum, cai em `devRoomWsUrl` (desenvolvimento, servidor sem heartbeat).
 */
export async function placeRoom(db: Db, room: RoomRow, casualOnly: ReadonlySet<string>, devRoomWsUrl: string | undefined, region?: string, now = Date.now()): Promise<Placement> {
  if (roomOnline(room, now) && room.wsUrl) return { ok: true, wsUrl: room.wsUrl };
  // sala fixa com região só abre nela (RN-REG-03, OG-546)
  const online = await onlineServers(db, now);
  const all = serversForMode(online, room.mode, casualOnly);
  const servers = room.persistent && room.region ? all.filter((s) => s.region === room.region) : all;
  // volta ao servidor de antes se ele ainda aceita salas (maxRooms 0 = drenando, OG-103)
  const server = servers.find((s) => s.id === room.serverId && s.maxRooms > 0) ?? pickServer(servers, room.persistent && room.region ? room.region : region);
  if (server) {
    const wsUrl = `${server.wsBaseUrl.replace(/\/$/, '')}/rooms/${room.id}`;
    if (server.id !== room.serverId || wsUrl !== room.wsUrl) {
      await db.update(rooms).set({ serverId: server.id, wsUrl }).where(eq(rooms.id, room.id));
    }
    return { ok: true, wsUrl, spawn: roomSpawn(room), region: server.region, ...(room.mode === 'ranked' && regionOnlyCasual(online, region, casualOnly) ? { expectedFallback: true } : {}) };
  }
  const dev = devRoomWsUrl?.replace('{id}', room.id);
  return dev ? { ok: true, wsUrl: dev, spawn: roomSpawn(room) } : { ok: false };
}

/** Dá para abrir a sala agora: algum servidor no ar (na região dela, se for sala fixa com região). */
export function canSpawnRoom(room: Pick<RoomRow, 'persistent' | 'region'>, servers: readonly ServerRow[], dev: boolean): boolean {
  if (dev) return true;
  return room.persistent && room.region ? servers.some((s) => s.region === room.region && s.rooms < s.maxRooms) : servers.length > 0;
}

/** A sala pode ser listada no lobby: no ar, ou da plataforma e abrível agora. */
export function roomListed(room: RoomRow, canSpawn: boolean, now = Date.now()): boolean {
  return roomOnline(room, now) || (room.persistent && canSpawn);
}
