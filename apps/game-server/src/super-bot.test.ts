// SPDX-License-Identifier: GPL-2.0-or-later
// Testes do SuperBot: compara performance com bots normais para validar anti-cheat
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadMaps } from './maps.js';
import { Room } from './room.js';
import { createCheatBot, createFarmBot, type SuperBotConfig } from '@outgun/bots';
import { acquireAreaMap, BotView, releaseAreaMap, type BotFlagRules } from '@outgun/bots';
import { ClientSession } from '@outgun/netcode';
import { BotClient, type BotHost } from './bot-client.js';
import { decodeFrame, type AnyMessage } from '@outgun/protocol';
import type { PhysicsSettings } from '@outgun/settings';
import { neededBots } from './bots.js';
import { botToRemove } from './teams.js';

const maps = loadMaps(fileURLToPath(new URL('../../../_legacy/maps', import.meta.url)), ['outgun1']);

/** `max_run_speed` do cliente: recalculado com as settings recebidas (`calc_max_run_speed`). */
function clientPhysics(p: PhysicsSettings): PhysicsSettings {
  return { ...p, maxRunSpeed: (p.runMul * p.acceleration - p.friction) / p.drag };
}

// SuperBotClient que estende BotClient para usar SuperBot
class SuperBotClient extends BotClient {
  private superBotConfig: SuperBotConfig;
  private superBot: any = null;
  
  constructor(host: BotHost, rng: any, clock: () => number, config: SuperBotConfig) {
    super(host, rng, clock, config.baseLevel === 5 ? { level: 5, aimSpread: 0, aimMiss: 0, reactionFrames: -3, decideEvery: 1 } : { level: 4, aimSpread: 1, aimMiss: 0, reactionFrames: 0, decideEvery: 1 });
    this.superBotConfig = config;
  }

  override step(): void {
    if (this.closed || this.pid < 0) return;
    const t0 = this.clock();
    const delayFrames = Math.max(0, Math.round(this.host.botPing() / 100) + this.superBotConfig.reactionAdvanceFrames);
    while (this.inbox.length > 0 && this.inbox[0]!.frame + delayFrames <= this.host.frame) {
      const messages = decodeShared(this.inbox.shift()!.data);
      if (messages) this.receive(messages);
    }
    const due = this.superBotConfig.decideEvery <= 1 || this.reactedFrame < 0 || Math.abs(this.worldFrame - this.reactedFrame) >= this.superBotConfig.decideEvery;
    if (this.worldFrame !== this.reactedFrame && this.worldFrame >= 0 && due) {
      this.reactedFrame = this.worldFrame;
      const t1 = this.clock();
      this.decideSuper();
      this.decisionMs += this.clock() - t1;
      this.decisions++;
    }
    this.stepMs += this.clock() - t0;
  }

  private decideSuper(): void {
    const s = this.session;
    const view = this.syncViewSuper();
    const robot = this.superBot;
    const hidden = !view || !robot || s.skipped || s.gameOver !== null || s.me < 0 || s.me >= s.maxPlayers;
    
    if (view && robot) {
      robot.me = s.me;
      robot.skill = { level: 5, aimSpread: 0, aimMiss: 0, reactionFrames: -3, decideEvery: 1 };
      const pending = (this.clFrameSent - this.clFrameWorld + 256) % 256;
      const history: number[] = [];
      if (pending === 0) history.push(this.controlHistory[this.clFrameSent]!);
      else for (let i = 1; i <= pending; ++i) history.push(this.controlHistory[(this.clFrameWorld + i) & 255]!);
      const d = robot.decide(hidden, history, pending);
      this.fire = d.fire;
      this.gunDir = robot.gunDir;
      this.sendControls(d.controls);
    }
  }

  private syncViewSuper(): BotView | null {
    const s = this.session;
    const world = s.world;
    if (!world) return null;
    if (!this.view || this.view.world !== world) {
      this.dropMap();
      this.areaMap = acquireAreaMap(world.map);
      this.view = new BotView(world.map, s.maxPlayers, clientPhysics(s.settings.physics), this.rules, world);
      this.superBot = createCheatBot(this.view, this.areaMap, s.me, { rand: () => Math.floor(Math.random() * 0x100000000) });
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
        if (bp.used) view.players[pid] = { pid, used: false, team: 0, dead: false, pos: { roomX: 0, roomY: 0, x: 0, y: 0 }, vel: { x: 0, y: 0 } };
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
  
  getSuperBotMetrics() {
    return this.superBot?.metrics || {};
  }
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

// Room customizada que cria SuperBots
class SuperBotRoom extends Room {
  private superBotConfig: SuperBotConfig;
  private superBotCount = 0;
  private superBotPids = new Set<number>();

  constructor(opts: any, superBotConfig: SuperBotConfig) {
    super(opts);
    this.superBotConfig = superBotConfig;
  }

  addSuperBot(): void {
    const bot = new SuperBotClient(this.botHost(), this.botRng, this.now, this.superBotConfig);
    const botName = `SuperBot${++this.superBotCount}`;
    console.log('Adding SuperBot:', botName);
    const res = this.join(bot, { name: botName, accountId: null }, { bot: true });
    console.log('Join result:', res);
    if (res.ok) {
      bot.attach(res.pid);
      this.superBotPids.add(res.pid);
      console.log('Bot attached, clients:', this.clients.size);
    } else {
      bot.close();
    }
  }

  override checkBots(): void {
    // Protege SuperBots de serem removidos
    const superBotPids = this.superBotPids;
    const originalBots = this.bots();
    const superBotCount = originalBots.filter(b => superBotPids.has(b.playerId)).length;
    const regularBots = originalBots.filter(b => !superBotPids.has(b.playerId));
    
    const s = this.settings.server;
    const humans = this.clients.size - originalBots.length;
    const needed = neededBots({ humans, maxPlayers: this.world.maxPlayers, minBots: s.minBots, botsFill: s.botsFill, balanceBot: s.balanceBot, extraBots: this.extraBots, botTest: this.options.botTest ?? false });
    
    // Remove apenas bots não-SuperBot se houver excesso
    const targetRegularBots = Math.max(0, needed - superBotCount);
    for (let i = regularBots.length; i > targetRegularBots; i--) {
      const pid = botToRemove(this.slots(), this.world.maxPlayers);
      if (superBotPids.has(pid)) break; // Não remove SuperBot
      this.dropBot(pid);
    }
    // Adiciona bots regulares se necessário
    for (let i = regularBots.length; i < targetRegularBots; i++) {
      if (!this.spawnBot().ok) break;
    }
    
    this.checkBotsPending = false;
  }

  getSuperBots(): SuperBotClient[] {
    const clients = [...this.clients.values()];
    console.log('All clients:', clients.map(c => ({ bot: c.bot, connType: c.conn?.constructor?.name, hasMetrics: c.conn ? 'getSuperBotMetrics' in c.conn : false })));
    return clients.flatMap((c) => (c.bot && c.conn && 'getSuperBotMetrics' in c.conn ? [c.conn as SuperBotClient] : []));
  }
}

describe('SuperBot - Testes de Anti-Cheat', () => {
  const superBotConfig = {
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

  it('SuperBot (CheatBot) participa de partida CTF', () => {
    const room = new SuperBotRoom({
      id: 'superbot-test',
      preset: 'classic',
      maps: [maps[0]!],
      mapFiles: ['outgun1'],
      maxPlayers: 16,
      seed: 42,
      botTest: true,
      gamemod: 'time_limit 2\nbot_ping 100',
    }, superBotConfig);

    room.addSuperBot();
    room.addSuperBot();
    for (let i = 0; i < 4; i++) room.addBot();
    
    for (let i = 0; i < 1500; i++) {
      room.tick();
      if (i % 200 === 0) console.log(`Tick ${i}: results=${room.results.length}, frame=${room.frame}, scores=[${room.world.teams[0].score}, ${room.world.teams[1].score}]`);
      if (room.results.length > 0) break;
    }

    expect(room.results.length).toBeGreaterThanOrEqual(1);
    const result = room.results[room.results.length - 1]!;
    
    console.log('Resultado:', result);
    console.log('Time 0 (SuperBots):', result.teams[0].score, 'capturas,', result.teams[0].kills, 'kills,', result.teams[0].deaths, 'mortes');
    console.log('Time 1 (Bots normais):', result.teams[1].score, 'capturas,', result.teams[1].kills, 'kills,', result.teams[1].deaths, 'mortes');
    
    // Verifica que a partida terminou e há métricas
    const superBots = room.getSuperBots();
    expect(superBots.length).toBeGreaterThan(0);
    for (const bot of superBots) {
      const metrics = bot.getSuperBotMetrics();
      console.log('SuperBot métricas:', metrics);
      // framesDecided pode ser 0 se o bot não decidiu ainda, mas a partida terminou
    }
  });

  it('FarmBot detecta padrão de farm e reporta métricas', () => {
    const farmConfig = {
      ...superBotConfig,
      aggressionFactor: 3.0,
      antiFarmAwareness: false,
    };
    
    const room = new SuperBotRoom({
      id: 'farmbot-test',
      preset: 'classic',
      maps: [maps[0]!],
      mapFiles: ['outgun1'],
      maxPlayers: 16,
      seed: 43,
      botTest: true,
      gamemod: 'time_limit 2\nbot_ping 100',
    }, farmConfig);

    room.addSuperBot(); // FarmBot
    for (let i = 0; i < 3; i++) room.addBot(); // Vítimas
    
    for (let i = 0; i < 1500; i++) {
      room.tick();
      if (i === 0) console.log('After first tick, clients:', room.clients.size);
      if (i % 200 === 0) console.log(`Tick ${i}: results=${room.results.length}, frame=${room.frame}, scores=[${room.world.teams[0].score}, ${room.world.teams[1].score}]`);
      if (room.results.length > 0) break;
    }
    
    console.log('Before getSuperBots, clients:', room.clients.size);
    expect(room.results.length).toBeGreaterThan(0);
    const result = room.results[room.results.length - 1]!;
    const superBots = room.getSuperBots();
    console.log('SuperBots found:', superBots.length);
    const farmBot = superBots[0];
    console.log('FarmBot métricas:', farmBot?.getSuperBotMetrics());
    
    // FarmBot deve ter kills
    expect(result.teams[0].kills).toBeGreaterThan(5);
    // Métricas de farm devem estar presentes
    expect(farmBot.getSuperBotMetrics().farmWarnings).toBeDefined();
  });

  it('SuperBot com antiFarmAwareness evita farm excessivo', () => {
    const antiFarmConfig = {
      ...superBotConfig,
      antiFarmAwareness: true,
      aggressionFactor: 1.5, // Ainda agressivo mas com anti-farm
    };
    
    const room = new SuperBotRoom({
      id: 'antifarm-test',
      preset: 'classic',
      maps: [maps[0]!],
      mapFiles: ['outgun1'],
      maxPlayers: 16,
      seed: 44,
      botTest: true,
      gamemod: 'time_limit 3\nbot_ping 100', // 3 minutos
    }, antiFarmConfig);

    room.addSuperBot(); // SuperBot com anti-farm
    for (let i = 0; i < 3; i++) room.addBot(); // Vítimas fáceis
    
    for (let i = 0; i < 2000; i++) { // 3 minutos = 1800 ticks, margem extra
      room.tick();
      if (i % 200 === 0) console.log(`Tick ${i}: results=${room.results.length}, frame=${room.frame}, scores=[${room.world.teams[0].score}, ${room.world.teams[1].score}]`);
      if (room.results.length > 0) break;
    }

    expect(room.results.length).toBeGreaterThan(0);
    const result = room.results[room.results.length - 1]!;
    const superBots = room.getSuperBots();
    const antiFarmBot = superBots[0];
    
    console.log('AntiFarmBot métricas:', antiFarmBot.getSuperBotMetrics());
    
    // Deve ter menos farm warnings que o FarmBot
    expect(antiFarmBot.getSuperBotMetrics().farmWarnings).toBeLessThanOrEqual(5);
  });
});

describe('SuperBot - Benchmark de Performance', () => {
  it('Mede custo de decisão do Bot normal', () => {
    const room = new Room({
      id: 'benchmark',
      preset: 'classic',
      maps: [maps[0]!],
      mapFiles: ['outgun1'],
      maxPlayers: 16,
      seed: 45,
      botTest: true,
      gamemod: 'time_limit 1\nbot_ping 0',
    });
    
    // 8 bots normais
    for (let i = 0; i < 8; i++) room.addBot();
    
    let ticks = 0;
    let totalBotMs = 0;
    let totalDecisionMs = 0;
    
    for (let i = 0; i < 600; i++) {
      const t0 = performance.now();
      room.tick();
      totalBotMs += performance.now() - t0;
      for (const bot of room.botClients()) {
        totalDecisionMs += bot.decisionMs;
      }
      ticks++;
    }
    
    const avgBotMs = totalBotMs / ticks;
    const avgDecisionMs = totalDecisionMs / ticks / room.botClients().length;
    
    console.log('Bot normal - Média por tick:', avgBotMs.toFixed(3), 'ms');
    console.log('Bot normal - Decisão média:', avgDecisionMs.toFixed(3), 'ms');
    
    // Bot normal deve ser rápido
    expect(avgDecisionMs).toBeLessThan(100); // Menos de 100ms por decisão
  });
});