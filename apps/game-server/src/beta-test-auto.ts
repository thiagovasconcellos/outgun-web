// SPDX-License-Identifier: GPL-2.0-or-later
// Cliente de teste automatizado que busca ticket da API antes de conectar
// Uso: npx tsx apps/game-server/src/beta-test-auto.ts

import WebSocket from 'ws';
import { createCheatBot, type SuperBotConfig } from '@outgun/bots';
import { ClientSession } from '@outgun/netcode';
import { decodeFrame, encodeFrame, message, PROTOCOL_VERSION, type AnyMessage } from '@outgun/protocol';
import type { GameMap, Rng } from '@outgun/sim';
import { acquireAreaMap, BotView, releaseAreaMap, type BotFlagRules, type BotSkill } from '@outgun/bots';

const API_BASE = 'https://outgunweb.com.br/api';
const BETA_SERVER = 'wss://outgunweb.com.br/gs/rooms/main';
const ROOM = 'main';
const BOT_NAME = 'CheatBotTest';
const DEVICE_ID = 'test-device-1234567890123456';
const PASSWORD = '34626253';

const BOT_CONFIG: SuperBotConfig = {
  baseLevel: 5,
  aimPrecisionMultiplier: 0.0,
  reactionAdvanceFrames: -3,
  decideEvery: 1,
  perfectPrediction: true,
  perfectDodge: true,
  predictiveAim: true,
  optimalPathfinding: true,
  optimalPowerupManagement: true,
  teamCoordination: true,
  aggressionFactor: 2.0,
  antiFarmAwareness: false,
};

interface BotHost {
  frame: number;
  botPing(): number;
  mapByFile(file: string): GameMap | undefined;
  deliver(pid: number, messages: AnyMessage[]): void;
}

const DEFAULT_RULES: BotFlagRules = {
  carryOwnTeamFlag: false,
  captureAwayFromBase: false,
  lockTeamFlags: false,
  lockWildFlags: false,
  captureOnTeamFlags: true,
  captureOnWildFlags: false,
  seeMinimapPlayerProperties: 0,
};

function clientPhysics(p: any): any {
  return { ...p, maxRunSpeed: (p.runMul * p.acceleration - p.friction) / p.drag };
}

const decoded = new WeakMap<Uint8Array, AnyMessage[] | null>();

function decodeShared(data: Uint8Array): AnyMessage[] | null {
  let messages = decoded.get(data);
  if (messages === undefined) {
    const r = decodeFrame(data, 's2c');
    messages = r.ok ? r.messages : null;
    decoded.set(data, messages);
  }
  return messages;
}

function encodeMessage(msg: AnyMessage): Uint8Array {
  return encodeFrame(msg);
}

async function fetchTicket(): Promise<string> {
  const res = await fetch(`${API_BASE}/rooms/${ROOM}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: BOT_NAME, device: DEVICE_ID, password: PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.ticket;
}

class SuperBotClient {
  private pid = -1;
  private readonly session: ClientSession;
  private readonly inbox: { frame: number; data: Uint8Array }[] = [];
  private view: BotView | null = null;
  private superBot: any = null;
  private areaMap: any = null;
  private rules: BotFlagRules = { ...DEFAULT_RULES };
  private readonly removedFlags = [false, false, false];
  private worldFrame = -1;
  private reactedFrame = -1;
  private clFrameSent = 0;
  private clFrameWorld = 0;
  private readonly controlHistory = new Uint8Array(256);
  private fire = false;
  private gunDir = -1;
  private closed = false;
  private readonly rng: Rng;
  private readonly clock: () => number;
  private readonly host: BotHost;
  private readonly ws: WebSocket;
  private readonly config: SuperBotConfig;
  private decisionMs = 0;
  private decisions = 0;
  private stepMs = 0;
  private matchCount = 0;
  private maxMatches = 5;

  constructor(ws: WebSocket, rng: Rng, clock: () => number, config: SuperBotConfig) {
    this.ws = ws;
    this.rng = rng;
    this.clock = clock;
    this.config = config;
    
    this.host = {
      frame: 0,
      botPing: () => 100,
      mapByFile: (file: string) => undefined,
      deliver: (pid: number, messages: AnyMessage[]) => this.onDeliver(messages),
    };

    this.session = new ClientSession({
      send: (messages) => this.toServer(messages),
      onMapChange: (req) => {
        const map = this.host.mapByFile(req.file);
        if (map) this.session.setMap(map);
      },
      headless: true,
    });
    this.session.prediction = { enabled: false, amount: 0 };
  }

  async connect(): Promise<void> {
    // Busca ticket antes de conectar
    const ticket = await this.fetchTicket();
    console.log('[SuperBot] Ticket obtido da API');
    
    return new Promise((resolve, reject) => {
      // Usa a biblioteca ws explicitamente
      this.ws = new WebSocket(BETA_SERVER);
      this.ws.binaryType = 'arraybuffer';
      this.ws.onopen = () => {
        console.log('[SuperBot] Conectado ao servidor beta');
        this.sendHello(ticket);
      };
      
      this.ws.onmessage = (event) => {
        const data = Buffer.from(event.data);
        console.log('[SuperBot] Raw data recebido:', data.length, 'bytes');
        this.host.frame = Math.floor(Date.now() / 100);
        const messages = decodeShared(new Uint8Array(data));
        if (messages) this.onDeliver(messages);
      };
      
      this.ws.onclose = (ev) => {
        console.log('[SuperBot] Desconectado do servidor:', ev.code, ev.reason);
        this.closed = true;
      };
      
      this.ws.onerror = (err) => {
        console.error('[SuperBot] Erro de conexão:', err);
        reject(err);
      };
    });
  }
  
  private sendHello(ticket: string): void {
    const helloMsg = message('hello', {
      protocol: PROTOCOL_VERSION,
      ticket,
      client: 'outgun-web',
    });
    const data = encodeMessage(helloMsg);
    this.ws.send(data);
    console.log('[SuperBot] Hello enviado com ticket API');
  }

  private toServer(messages: AnyMessage[]): void {
    if (this.closed || this.pid < 0) return;
    for (const msg of messages) {
      try {
        const data = encodeMessage(msg);
        this.ws.send(data);
      } catch (e) {
        console.error('[SuperBot] Erro ao codificar mensagem:', msg.type, e);
      }
    }
  }

  private async fetchTicket(): Promise<string> {
    return fetchTicket();
  }

  private onDeliver(messages: AnyMessage[]): void {
    if (this.closed) return;
    const now = this.host.frame * 100;
    for (const m of messages) {
      console.log('[SuperBot] Mensagem recebida:', m.type);
      switch (m.type) {
        case 'mapChange':
          this.dropMap();
          this.removedFlags.fill(false);
          break;
        case 'flagUpdate': {
          const team = m.team === 'red' ? 0 : m.team === 'blue' ? 1 : 2;
          this.removedFlags[team] = m.flags.length === 0;
          break;
        }
        case 'flagModes':
          this.rules = {
            carryOwnTeamFlag: m.carryOwnTeamFlag,
            captureAwayFromBase: m.captureAwayFromBase,
            lockTeamFlags: m.lockTeamFlags,
            lockWildFlags: m.lockWildFlags,
            captureOnTeamFlags: m.captureOnTeamFlags,
            captureOnWildFlags: m.captureOnWildFlags,
            seeMinimapPlayerProperties: m.seeMinimapProperties,
          };
          break;
        case 'teamChange':
          this.forgetPlayers(m.from, m.to);
          break;
        case 'playerLeft':
          this.forgetPlayers(m.pid);
          break;
        case 'frame':
          if (m.frame > this.worldFrame) this.worldFrame = m.frame;
          this.clFrameWorld = m.lastClientFrame;
          break;
        case 'welcome':
          this.attach(m.pid);
          break;
        case 'reject':
          console.error('[SuperBot] Conexão rejeitada:', m.reason);
          break;
        case 'gameOver':
          this.matchCount++;
          console.log(`[SuperBot] Partida ${this.matchCount} terminada! Motivo: ${m.reason}`);
          if (this.matchCount >= this.maxMatches) {
            console.log('[SuperBot] 5 partidas completadas. Desconectando...');
            this.ws.close();
          }
          break;
        default:
          break;
      }
      this.session.handle([m], now);
    }
  }

  private forgetPlayers(...pids: number[]): void {
    for (const pid of pids) if (this.view) this.view.players[pid] = this.freshPlayer(pid);
  }

  private freshPlayer(pid: number): any {
    return { pid, used: false, team: 0, dead: false, pos: { roomX: 0, roomY: 0, x: 0, y: 0 }, vel: { x: 0, y: 0 } };
  }

  private dropMap(): void {
    if (this.areaMap) releaseAreaMap(this.areaMap);
    this.areaMap = null;
    this.view = null;
    this.superBot = null;
  }

  private syncView(): BotView | null {
    const s = this.session;
    const world = s.world;
    if (!world) return null;
    if (!this.view || this.view.world !== world) {
      this.dropMap();
      this.areaMap = acquireAreaMap(world.map);
      this.view = new BotView(world.map, s.maxPlayers, clientPhysics(s.settings.physics), this.rules, world);
      this.superBot = createCheatBot(this.view, this.areaMap, s.me, this.rng);
      this.superBot.botPrevFire = this.fire;
      this.superBot.gunDir = this.gunDir;
    }
    const view = this.view;
    view.frame = world.frame;
    view.physics = clientPhysics(s.settings.physics);
    view.rules = this.rules;
    const bases = (t: number): any[] => (this.removedFlags[t] ? [] : t === 2 ? [...world.map.wildFlags] : [...world.map.teams[t as 0 | 1].flags]);
    view.bases = [bases(0), bases(1), bases(2)];
    for (let pid = 0; pid < view.maxPlayers; ++pid) {
      const src = world.players[pid];
      const bp = view.players[pid]!;
      const present = s.present.has(pid) && src !== undefined;
      if (!present) {
        if (bp.used) view.players[pid] = this.freshPlayer(pid);
        continue;
      }
      bp.used = true;
      bp.name = s.names.get(pid) ?? '';
      bp.bot = s.bots.has(pid);
      bp.team = world.teamOf(pid);
      bp.dead = src.dead;
      bp.onscreen = s.onscreen.has(pid);
      const updated = s.posUpdated.get(pid);
      if (updated !== undefined && updated === world.frame && bp.posUpdated !== updated) {
        bp.setPosition(src.pos.roomX, src.pos.roomY, src.pos.x, src.pos.y, updated, pid !== s.me && !bp.onscreen);
        bp.vel = src.vel;
      }
      if (pid === s.me) {
        bp.vel = src.vel;
        bp.weapon = s.weapon;
        bp.shadowTime = s.powerupEnd.shadow;
      }
      bp.controls = src.controls;
      bp.gundir = src.gundir;
      bp.accelerationMode = src.accelerationMode;
      bp.deathbringer = src.deathbringer;
      bp.deathbringerAffected = src.deathbringerEnd === Infinity;
      bp.turbo = src.turbo;
    }
    return view;
  }

  attach(pid: number): void {
    this.pid = pid;
    console.log(`[SuperBot] Anexado como pid ${pid}`);
    this.sendControls(0);
  }

  step(): void {
    if (this.closed || this.pid < 0) return;
    const t0 = this.clock();
    const delayFrames = Math.max(0, Math.round(this.host.botPing() / 100) + this.config.reactionAdvanceFrames);
    
    while (this.inbox.length > 0 && this.inbox[0]!.frame + delayFrames <= this.host.frame) {
      const messages = decodeShared(this.inbox.shift()!.data);
      if (messages) this.onDeliver(messages);
    }
    
    const due = this.config.decideEvery <= 1 || this.reactedFrame < 0 || Math.abs(this.worldFrame - this.reactedFrame) >= this.config.decideEvery;
    if (this.worldFrame !== this.reactedFrame && this.worldFrame >= 0 && due) {
      this.reactedFrame = this.worldFrame;
      const t1 = this.clock();
      this.decide();
      this.decisionMs += this.clock() - t1;
      this.decisions++;
    }
    this.stepMs += this.clock() - t0;
  }

  private decide(): void {
    const s = this.session;
    const view = this.syncView();
    const robot = this.superBot;
    const hidden = !view || !robot || s.skipped || s.gameOver !== null || s.me < 0 || s.me >= s.maxPlayers;
    
    if (view && robot) {
      robot.me = s.me;
      robot.skill = { level: 5, aimSpread: 0, aimMiss: 0, reactionFrames: -3, decideEvery: 1 };
      const pending = (this.clFrameSent - this.clFrameWorld + 256) % 256;
      const history: number[] = [];
      if (pending === 0) history.push(this.controlHistory[this.clFrameSent]!);
      else for (let i = 1; i <= pending; ++i) history.push(this.controlHistory[(this.clFrameWorld + i) & 255]!);
      const d = robot.decideSuper(hidden, history, pending);
      this.fire = d.fire;
      this.gunDir = robot.gunDir;
      this.sendControls(d.controls);
    }
  }

  private sendControls(controls: number): void {
    this.clFrameSent = (this.clFrameSent + 1) & 255;
    this.controlHistory[this.clFrameSent] = controls;
    const freeTurning = this.session.settings.physics.allowFreeTurning && this.gunDir >= 0;
    const gundir = freeTurning ? Math.round(this.gunDir * 256) % 2048 : 0;
    this.toServer([message('input', { clientFrame: this.clFrameSent, controls, gundir })]);
    this.toServer([message('fire', { on: this.fire })]);
  }

  getMetrics() {
    return this.superBot?.metrics || {};
  }
}

class SimpleRng implements Rng {
  private seed: number;
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed;
  }
}

async function main() {
  console.log('[SuperBot] Iniciando teste automatizado no servidor beta...');
  console.log('[SuperBot] Configuração: CheatBot (aimbot/triggerbot perfeito)');
  console.log('[SuperBot] Jogará 5 partidas');
  
  while (true) {
    try {
      const ws = new WebSocket(BETA_SERVER);
      const rng = new SimpleRng();
      const clock = () => performance.now();
      
      const bot = new SuperBotClient(ws, rng, clock, BOT_CONFIG);
      
      await bot.connect();
      
      // Loop principal - 10 FPS
      const interval = setInterval(() => {
        if (bot.closed) {
          clearInterval(interval);
          return;
        }
        bot.step();
      }, 100);
      
      // Log periódico de métricas
      const metricsInterval = setInterval(() => {
        if (bot.closed) {
          clearInterval(metricsInterval);
          return;
        }
        const metrics = bot.getMetrics();
        console.log('[SuperBot] Métricas:', JSON.stringify(metrics, null, 2));
      }, 30000);
      
      // Aguarda fechar
      await new Promise<void>((resolve) => {
        const checkClosed = setInterval(() => {
          if (bot.closed) {
            clearInterval(checkClosed);
            clearInterval(interval);
            clearInterval(metricsInterval);
            resolve();
          }
        }, 1000);
      });
      
      console.log('[SuperBot] Sessão finalizada. Reiniciando para próxima partida...');
      await new Promise(r => setTimeout(r, 5000));
      
    } catch (err) {
      console.error('[SuperBot] Erro:', err);
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}

main().catch(console.error);