// SPDX-License-Identifier: GPL-2.0-or-later
// Cliente de teste para rodar SuperBot/CheatBot no servidor beta
// Uso: npx tsx packages/bots/test-super-bot.ts

import { createCheatBot, createFarmBot, createSuperBot, type SuperBotConfig } from './src/super-bot.js';
import { ClientSession } from '@outgun/netcode';
import { decodeFrame, message, type AnyMessage } from '@outgun/protocol';
import type { GameMap, Rng } from '@outgun/sim';
import { acquireAreaMap, BotView, releaseAreaMap, Robot, type BotFlagRules, type BotSkill } from './src/index.js';

// Configuração do servidor beta
const BETA_SERVER = 'wss://outgunweb.com.br/rooms/main';
const USERNAME = 'ozzylords';
const PASSWORD = '34626253';

// Configuração do bot
const BOT_CONFIG: SuperBotConfig = {
  baseLevel: 5,
  aimPrecisionMultiplier: 0.0, // Mira perfeita
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

class SuperBotClient {
  private pid = -1;
  private readonly session: ClientSession;
  private readonly inbox: { frame: number; data: Uint8Array }[] = [];
  private view: BotView | null = null;
  private robot: Robot | null = null;
  private superBot: any = null; // SuperBot instance
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

  constructor(ws: WebSocket, rng: Rng, clock: () => number, config: SuperBotConfig) {
    this.ws = ws;
    this.rng = rng;
    this.clock = clock;
    this.config = config;
    
    this.host = {
      frame: 0,
      botPing: () => 100,
      mapByFile: (file: string) => undefined,
      deliver: (pid: number, messages: AnyMessage[]) => this.sendToServer(messages),
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
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        console.log('[SuperBot] Conectado ao servidor');
        this.sendHello();
      };
      
      this.ws.onmessage = (event) => {
        const data = new Uint8Array(event.data);
        this.host.frame = Math.floor(Date.now() / 100); // Aproximação
        this.host.deliver(this.pid, decodeShared(data) || []);
      };
      
      this.ws.onclose = () => {
        console.log('[SuperBot] Desconectado');
        this.closed = true;
      };
      
      this.ws.onerror = (err) => {
        console.error('[SuperBot] Erro:', err);
        reject(err);
      };
    });
  }

  private sendHello(): void {
    const hello = message('hello', {
      name: `${USERNAME}_SuperBot`,
      password: PASSWORD,
      version: '2.59.1',
      language: 'pt-BR',
    });
    this.ws.send(new Uint8Array([...new TextEncoder().encode(JSON.stringify(hello))]));
  }

  private toServer(messages: AnyMessage[]): void {
    if (this.closed || this.pid < 0) return;
    // Encode messages to binary protocol
    // For now, we'll use the protocol encoder
    for (const m of messages) {
      // This is simplified - in reality you'd use the protocol encoder
      console.log('[SuperBot] Enviando:', m.type);
    }
  }

  private sendToServer(messages: AnyMessage[]): void {
    // Use protocol encoder to send binary messages
    // This is a placeholder - need to implement proper encoding
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
      if (messages) this.receive(messages);
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

  private receive(messages: AnyMessage[]): void {
    const now = this.host.frame * 100;
    for (const m of messages) {
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
    this.robot = null;
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

  private decide(): void {
    const s = this.session;
    const view = this.syncView();
    const robot = this.superBot;
    const hidden = !view || !robot || s.skipped || s.gameOver !== null || s.me < 0 || s.me >= s.maxPlayers;
    
    if (view && robot) {
      robot.me = s.me;
      robot.skill = this.config.baseLevel === 5 ? { level: 5, aimSpread: 0, aimMiss: 0, reactionFrames: -3, decideEvery: 1 } : robot.skill;
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
    if (this.fire !== this.fire) {
      this.toServer([message('fire', { on: this.fire })]);
    }
  }

  getMetrics() {
    return this.superBot?.metrics || {};
  }
}

// RNG simples para teste
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

// Main
async function main() {
  console.log('[SuperBot] Iniciando conexão com servidor beta...');
  console.log('[SuperBot] Configuração: CheatBot (aimbot/triggerbot perfeito)');
  
  const ws = new WebSocket(BETA_SERVER);
  const rng = new SimpleRng();
  const clock = () => performance.now();
  
  const bot = new SuperBotClient(ws, rng, clock, BOT_CONFIG);
  
  try {
    await bot.connect();
    
    // Loop principal
    setInterval(() => {
      bot.step();
    }, 100); // 10 FPS
    
    // Log periódico de métricas
    setInterval(() => {
      const metrics = bot.getMetrics();
      console.log('[SuperBot] Métricas:', metrics);
    }, 5000);
    
  } catch (err) {
    console.error('[SuperBot] Falha ao conectar:', err);
  }
}

main().catch(console.error);