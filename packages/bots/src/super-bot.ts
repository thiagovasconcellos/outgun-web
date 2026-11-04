// SPDX-License-Identifier: GPL-2.0-or-later
// SuperBot: IA avançada para testes de anti-cheat e anti-farm
// Estende Robot com capacidades sobre-humanas
import {
  FLAG_RADIUS,
  N_PI,
  N_PI_2,
  N_PI_4,
  PLAYER_RADIUS,
  POWERUP_RADIUS,
  ROCKET_RADIUS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  Vec,
  adjustGunDirection,
  controlDirection,
  dot,
  positiveFmod,
  type FlagState,
  type Position,
  type Rng,
  type WorldCoords,
} from '@outgun/sim';
import type { Area, AreaMap, Neighbor } from './areamap.js';
import { Direction } from './areamap.js';
import {
  DistanceTableId,
  ROOM_TO_ROOM_BASE_DISTANCE,
} from './distance.js';
import {
  freeWalk,
  moveTo,
  moveToDestination,
  moveToDoor,
  moveToNoAggregate,
  setDestination,
  moveDirNoAggregate,
  freeDir,
} from './navigation.js';
import {
  AlreadyInRoom,
  Ctl,
  DestinationType,
  FADEOUT,
  RobotCore,
  S_H,
  S_W,
  controlsFromDirection,
  to8way,
} from './robot-core.js';
import {
  amILast,
  basesOf,
  dangerousExplosionInNeighbor,
  enemyHasUnseenFlags,
  getPlayers,
  isAnyFlagAtBase,
  isFlagAtBase,
  isHome,
  moreDefensive,
  teamHasFlags,
  teams,
} from './situation.js';
import type { BotPlayer, BotView } from './view.js';
import { botSkill, type BotSkill } from './skill.js';
import {
  aim,
  escapeExplosion,
  escapeRocket,
  getDangerousEnemy,
  getDangerousRocket,
  getEasyEnemy,
  getNearestEnemy,
  isMassive,
  needShootFreeTurning,
  needShootTradTurning,
  predictDistanceFromRocket,
  tryAimFreeTurning,
  tryAimTradTurning,
  AimLevel,
} from './combat.js';
import { Robot } from './brain.js';

const R2R = ROOM_TO_ROOM_BASE_DISTANCE;
const other = (team: number): 0 | 1 => (team === 0 ? 1 : 0);
const POSITIVE_INFINITY = 1e100;

// Helper para clonar Vec
function cloneVec(v: Vec): Vec {
  return new Vec(v.x, v.y);
}

export interface SuperBotConfig {
  baseLevel: number;
  aimPrecisionMultiplier: number;
  reactionAdvanceFrames: number;
  decideEvery: number;
  perfectPrediction: boolean;
  perfectDodge: boolean;
  predictiveAim: boolean;
  optimalPathfinding: boolean;
  optimalPowerupManagement: boolean;
  teamCoordination: boolean;
  aggressionFactor: number;
  antiFarmAwareness: boolean;
}

export const DEFAULT_SUPER_BOT_CONFIG: SuperBotConfig = {
  baseLevel: 5,
  aimPrecisionMultiplier: 0.1,
  reactionAdvanceFrames: -2,
  decideEvery: 1,
  perfectPrediction: true,
  perfectDodge: true,
  predictiveAim: true,
  optimalPathfinding: true,
  optimalPowerupManagement: true,
  teamCoordination: true,
  aggressionFactor: 1.5,
  antiFarmAwareness: true,
};

export const CHEAT_BOT_CONFIG: SuperBotConfig = {
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

export const FARM_BOT_CONFIG: SuperBotConfig = {
  baseLevel: 5,
  aimPrecisionMultiplier: 0.05,
  reactionAdvanceFrames: -2,
  decideEvery: 1,
  perfectPrediction: true,
  perfectDodge: true,
  predictiveAim: true,
  optimalPathfinding: true,
  optimalPowerupManagement: true,
  teamCoordination: false,
  aggressionFactor: 3.0,
  antiFarmAwareness: false,
};

/**
 * SuperBot: Estende Robot com capacidades sobre-humanas
 */
export class SuperBot extends Robot {
  config: SuperBotConfig;
  
  // Estado avançado
  private enemyPredictions!: Map<number, Vec[]>;
  private lastEnemyPositions!: Map<number, { pos: Vec; frame: number }>;
  private powerupTimers!: Map<number, number>;
  private dangerMap!: Map<string, number>;
  private farmDetection!: Map<number, { kills: number; lastKillFrame: number }>;
  
  // Métricas para análise
  public metrics = {
    framesDecided: 0,
    shotsFired: 0,
    hits: 0,
    kills: 0,
    deaths: 0,
    flagsCaptured: 0,
    flagsReturned: 0,
    powerupsCollected: 0,
    rocketsDodged: 0,
    farmWarnings: 0,
  };

  constructor(view: BotView, areaMap: AreaMap, me: number, rng: Rng, config: SuperBotConfig = DEFAULT_SUPER_BOT_CONFIG) {
    super(view, areaMap, me, rng);
    this.config = config;
    this.enemyPredictions = new Map();
    this.lastEnemyPositions = new Map();
    this.powerupTimers = new Map();
    this.dangerMap = new Map();
    this.farmDetection = new Map();
    this.skill = botSkill(config.baseLevel);
    this.skill.aimSpread *= config.aimPrecisionMultiplier;
    this.skill.aimMiss = 0;
    this.skill.reactionFrames = config.reactionAdvanceFrames;
    this.skill.decideEvery = config.decideEvery;
  }

  override buildMap(): void {
    super.buildMap();
    this.enemyPredictions?.clear();
    this.lastEnemyPositions?.clear();
    this.powerupTimers?.clear();
    this.dangerMap?.clear();
    this.farmDetection?.clear();
  }

  // ============================================================================
  // PREVISÃO AVANÇADA DE INIMIGOS
  // ============================================================================

  updateEnemyPredictions(): void {
    if (!this.config.perfectPrediction) return;
    
    const fx = this.fx;
    const maxPredictionFrames = 30;
    
    for (const pl of fx.players) {
      if (!pl.used || this.isMyTeam(pl) || pl.dead || !this.here(pl, true)) continue;
      
      const predictions: Vec[] = [];
      let predPos = cloneVec(pl.pos.local());
      let predVel = cloneVec(pl.vel);
      
      for (let frame = 0; frame < maxPredictionFrames; frame++) {
        predPos = predPos.add(predVel);
        
        const room = fx.map.room({ x: pl.pos.roomX, y: pl.pos.roomY });
        const wallResult = room.timeTillWall(predPos, predVel, PLAYER_RADIUS, 1);
        if (wallResult.time < 1) {
          // Calcula normal da parede a partir do ponto de contato
          const contact = wallResult.contact;
          const normal = new Vec(contact.x, contact.y).mul(1 / PLAYER_RADIUS);
          predVel = predVel.sub(normal.mul(2 * dot(predVel, normal)));
          predPos = predPos.add(predVel);
        }
        
        predictions.push(cloneVec(predPos));
      }
      
      this.enemyPredictions.set(pl.pid, predictions);
      this.lastEnemyPositions.set(pl.pid, { pos: cloneVec(pl.pos.local()), frame: fx.frame });
    }
  }

  getPredictedEnemyPosition(pid: number, framesAhead: number): Vec | null {
    const predictions = this.enemyPredictions.get(pid);
    if (!predictions || framesAhead >= predictions.length) return null;
    return predictions[framesAhead]!;
  }

  // ============================================================================
  // MIRA PREDITIVA PERFEITA
  // ============================================================================

  calculatePerfectAim(targetPid: number): number | null {
    const target = this.player(targetPid);
    if (target.dead || !this.here(target, true)) return null;
    
    const myPos = this.myPos.local();
    const rocketSpeed = this.fx.physics.rocketSpeed;
    
    if (this.config.predictiveAim && this.config.perfectPrediction) {
      const predictionFrames = Math.ceil(myPos.sub(target.pos.local()).mag() / rocketSpeed);
      const predictedPos = this.getPredictedEnemyPosition(targetPid, predictionFrames);
      
      if (predictedPos) {
        const delta = predictedPos.sub(myPos);
        if (!this.isBehindWall(delta, ROCKET_RADIUS, PLAYER_RADIUS + ROCKET_RADIUS)) {
          return this.getDir(delta);
        }
      }
    }
    
    const [canShoot, dir] = this.fx.physics.allowFreeTurning 
      ? tryAimFreeTurning(this, targetPid)
      : tryAimTradTurning(this, targetPid);
    
    return canShoot ? dir : null;
  }

  canHitTargetPerfectly(targetPid: number): boolean {
    const aimDir = this.calculatePerfectAim(targetPid);
    if (aimDir === null) return false;
    
    const hitTime = this.getHitTime(aimDir, targetPid);
    const teammateHitTime = this.getHitTeammateTime(aimDir);
    
    return hitTime < POSITIVE_INFINITY && hitTime <= teammateHitTime;
  }

  // ============================================================================
  // DESVIO PERFEITO DE FOGUETES
  // ============================================================================

  perfectDodgeRocket(rocketIndex: number): number {
    const rocket = this.fx.world.rockets[rocketIndex]!;
    let bestDistance = 0;
    let bestCtrl = 0;
    
    const directions = [0, 1, 2, 3, 4, 5, 6, 7];
    
    for (const dir of directions) {
      for (const useStrafe of [false, true]) {
        let ctrl = controlsFromDirection(dir) | Ctl.run;
        if (useStrafe) ctrl |= Ctl.strafe;
        
        const dist = predictDistanceFromRocket(this, rocket, ctrl);
        if (dist > bestDistance) {
          bestDistance = dist;
          bestCtrl = ctrl;
        }
      }
    }
    
    const stationaryDist = predictDistanceFromRocket(this, rocket, 0);
    if (stationaryDist > bestDistance) {
      bestDistance = stationaryDist;
      bestCtrl = 0;
    }
    
    this.metrics.rocketsDodged++;
    return bestCtrl;
  }

  // ============================================================================
  // MAPA DE PERIGO E PATHFINDING ÓTIMO
  // ============================================================================

  updateDangerMap(): void {
    this.dangerMap.clear();
    const fx = this.fx;
    
    for (const pl of fx.players) {
      if (!pl.used || this.isMyTeam(pl) || pl.dead) continue;
      const area = this.areaOf(pl.pos);
      const key = `${area.room.x},${area.room.y}`;
      const current = this.dangerMap.get(key) || 0;
      this.dangerMap.set(key, current + 10);
      
      for (const ni of area.neighbors) {
        const nkey = `${ni.area.room.x},${ni.area.room.y}`;
        const ncurrent = this.dangerMap.get(nkey) || 0;
        this.dangerMap.set(nkey, ncurrent + 5);
      }
    }
    
    for (const rocket of fx.world.rockets) {
      if (rocket.owner === -1) continue;
      const area = this.areaOf(rocket.pos);
      const key = `${area.room.x},${area.room.y}`;
      const current = this.dangerMap.get(key) || 0;
      this.dangerMap.set(key, current + 20);
    }
    
    for (const explosion of fx.world.explosions) {
      const area = this.areaOf(explosion.pos);
      const key = `${area.room.x},${area.room.y}`;
      const current = this.dangerMap.get(key) || 0;
      this.dangerMap.set(key, current + 50);
      
      for (const ni of area.neighbors) {
        const nkey = `${ni.area.room.x},${ni.area.room.y}`;
        const ncurrent = this.dangerMap.get(nkey) || 0;
        this.dangerMap.set(nkey, ncurrent + 25);
      }
    }
  }

  getDangerLevel(area: Area): number {
    const key = `${area.room.x},${area.room.y}`;
    return this.dangerMap.get(key) || 0;
  }

  findSafestPath(targetArea: Area): Area | null {
    if (!this.config.optimalPathfinding) return targetArea;
    
    const startArea = this.myArea();
    if (startArea === targetArea) return targetArea;
    
    this.buildDistanceTable(startArea, this.myRespawnWeight(), DistanceTableId.Main);
    
    const visited = new Set<Area>();
    const queue: { area: Area; cost: number; path: Area[] }[] = [
      { area: startArea, cost: 0, path: [startArea] }
    ];
    
    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      
      if (current.area === targetArea) {
        return current.path[1] || targetArea;
      }
      
      if (visited.has(current.area)) continue;
      visited.add(current.area);
      
      for (const ni of current.area.neighbors) {
        if (visited.has(ni.area)) continue;
        const distance = this.distance(DistanceTableId.Main, ni.area);
        if (distance === -1) continue;
        
        const danger = this.getDangerLevel(ni.area);
        const cost = current.cost + distance + danger * 0.5;
        queue.push({ area: ni.area, cost, path: [...current.path, ni.area] });
      }
    }
    
    return targetArea;
  }

  // ============================================================================
  // GERENCIAMENTO ÓTIMO DE POWER-UPS
  // ============================================================================

  updatePowerupTimers(): void {
    if (!this.config.optimalPowerupManagement) return;
    
    const fx = this.fx;
    // pupsRespawnTime está em PowerupSettings (seconds), default 25s = 250 frames
    const respawnTime = 250;
    
    for (let i = 0; i < fx.world.items.length; i++) {
      const item = fx.world.items[i];
      if (!item || !item.isReal()) {
        if (!this.powerupTimers.has(i)) {
          this.powerupTimers.set(i, respawnTime);
        } else {
          const remaining = this.powerupTimers.get(i)! - 1;
          this.powerupTimers.set(i, Math.max(0, remaining));
        }
      } else {
        this.powerupTimers.delete(i);
      }
    }
  }

  getOptimalPowerup(onImportantMission: boolean): number {
    const me = this.player(this.me);
    let bestValue = -1;
    let bestCtrl = 0;
    
    for (const item of this.fx.world.items) {
      if (!item || !item.isReal() || this.areaOf(item.pos) !== this.myArea()) continue;
      
      const d = item.pos.local().sub(this.myPos.local());
      if (onImportantMission) {
        if (this.isBehindWall(d, PLAYER_RADIUS, PLAYER_RADIUS + POWERUP_RADIUS)) continue;
        if (dot(d, me.vel) < 0 && d.mag2() > (5 * PLAYER_RADIUS) ** 2) continue;
      }
      
      let value = 0;
      // PowerupKind enum: 0=shield, 1=turbo, 2=shadow, 3=power, 4=weapon, 5=megahealth, 6=deathbringer
      switch (item.kind) {
        case 0: value = 100; break; // shield
        case 3: value = 90; break;  // power
        case 1: value = 80; break;  // turbo
        case 4: value = 70; break;  // weapon
        case 2: value = 60; break;  // shadow
        case 5: value = 50; break;  // megahealth
        case 6: value = 120; break; // deathbringer
      }
      
      const dist = d.mag();
      value -= dist * 0.1;
      
      const timer = this.powerupTimers.get(this.fx.world.items.indexOf(item));
      if (timer !== undefined && timer > 0) {
        value -= timer * 0.05;
      }
      
      if (value > bestValue) {
        bestValue = value;
        bestCtrl = moveTo(this, d, PLAYER_RADIUS + POWERUP_RADIUS);
      }
    }
    
    if (bestCtrl !== 0) this.metrics.powerupsCollected++;
    return bestCtrl;
  }

  // ============================================================================
  // DETECÇÃO DE FARM (ANTI-FARM)
  // ============================================================================

  checkFarmPattern(victimPid: number): boolean {
    if (!this.config.antiFarmAwareness) return false;
    
    const now = this.fx.frame;
    const record = this.farmDetection.get(victimPid) || { kills: 0, lastKillFrame: -1000 };
    
    if (now - record.lastKillFrame < 500) {
      record.kills++;
    } else {
      record.kills = 1;
    }
    record.lastKillFrame = now;
    this.farmDetection.set(victimPid, record);
    
    if (record.kills >= 5) {
      this.metrics.farmWarnings++;
      return true;
    }
    return false;
  }

  adjustForAntiFarm(ctrl: number): number {
    if (!this.config.antiFarmAwareness) return ctrl;
    return ctrl;
  }

  // ============================================================================
  // COORDENAÇÃO DE TIME
  // ============================================================================

  analyzeTeamRole(): 'attacker' | 'defender' | 'support' | 'flag_runner' {
    const myTeam = this.myTeam();
    let attackers = 0;
    let defenders = 0;
    let flagCarriers = 0;
    
    for (const pl of this.fx.players) {
      if (!pl.used || !this.isMyTeam(pl) || pl.dead) continue;
      if (this.haveFlag(pl.pid)) flagCarriers++;
      const area = this.areaOf(pl.pos);
      const enemyBases = basesOf(this, other(myTeam));
      const myBases = basesOf(this, myTeam);
      
      let nearEnemyBase = false;
      let nearMyBase = false;
      for (const base of enemyBases) {
        if (this.areaMap.identifyArea(base) === area) nearEnemyBase = true;
      }
      for (const base of myBases) {
        if (this.areaMap.identifyArea(base) === area) nearMyBase = true;
      }
      
      if (nearEnemyBase) attackers++;
      if (nearMyBase) defenders++;
    }
    
    if (this.haveFlag(this.me)) return 'flag_runner';
    if (attackers < Math.max(1, getPlayers(this, myTeam) / 3)) return 'attacker';
    if (defenders < Math.max(1, getPlayers(this, myTeam) / 3)) return 'defender';
    return 'support';
  }

  // ============================================================================
  // REPLICAÇÃO DE targetNearestBase (privado no Robot)
  // ============================================================================

  private targetNearestBaseSuper(best: { distance: number; area: Area | null }, team: number): void {
    for (const base of basesOf(this, team)) {
      const a = this.areaMap.identifyArea(base);
      const distance = this.distance(DistanceTableId.Main, a);
      if (distance === -1) continue;
      if (distance < best.distance || best.distance === -1) {
        best.distance = distance;
        best.area = a;
        this.destinationType = DestinationType.Base;
      }
    }
  }

  // ============================================================================
  // OVERRIDE DO getRobotControls
  // ============================================================================

  override getRobotControls(): number {
    const fx = this.fx;
    const me = this.player(this.me);
    
    this.updateEnemyPredictions();
    this.updateDangerMap();
    this.updatePowerupTimers();
    
    fx.setEnemiesSeen(me.pos.roomX, me.pos.roomY, fx.frame);
    
    for (const p of fx.players) {
      if (!p.used || p.dead || !this.isMyTeam(p)) continue;
      if (
        p.posUpdated === fx.frame &&
        p.fromMinimapUpdate &&
        p.prevMapPosUpdateFrame >= p.posUpdated - 20 &&
        p.prevMapUpdateRoom.x === p.pos.roomX &&
        p.prevMapUpdateRoom.y === p.pos.roomY
      ) {
        fx.setEnemiesSeen(p.pos.roomX, p.pos.roomY, Math.max(fx.enemiesSeen(p.pos.roomX, p.pos.roomY), p.prevMapPosUpdateFrame));
      }
    }
    
    let enemiesInRoomNow = false;
    for (const p of fx.players) {
      if (p.used && !p.dead && !this.isMyTeam(p)) {
        if (this.here(p, true)) enemiesInRoomNow = true;
        else this.updateUnknownPosition(p);
      }
    }
    if (!enemiesInRoomNow && this.enemiesInRoom) {
      this.freeWalkTarget.x = -1;
      this.immediateDestination = null;
    }
    this.enemiesInRoom = enemiesInRoomNow;

    for (let team = 0; team <= 2; ++team) {
      const bases = basesOf(this, team);
      this.flagsIgnored[team] = fx.world.flagsOf(team).map((f, i) => this.flagIgnored(f, bases[i], team));
    }

    // Prioridade 1: Foguete perigoso
    if (!isMassive(this)) {
      const dangerousRocket = getDangerousRocket(this);
      if (dangerousRocket !== -1) {
        if (this.lastSeen === -1) this.lastSeen = getDangerousEnemy(this);
        if (this.config.perfectDodge) {
          return this.perfectDodgeRocket(dangerousRocket);
        }
        return escapeRocket(this, dangerousRocket);
      }
    }
    
    // Prioridade 2: Explosão
    let ctrl = escapeExplosion(this);
    if (ctrl !== 0) return ctrl;
    
    // Prioridade 3: Bandeiras
    ctrl = this.getFlag();
    if (ctrl !== 0) {
      if (this.config.optimalPathfinding && this.destination) {
        const nextArea = this.findSafestPath(this.destination);
        if (nextArea && nextArea !== this.myArea()) {
          setDestination(this, nextArea);
        }
      }
      return ctrl;
    }

    this.chooseDestination();
    
    if (this.config.teamCoordination) {
      const role = this.analyzeTeamRole();
      this.adjustDestinationForRole(role);
    }

    if (this.isMission()) this.lastSeen = getDangerousEnemy(this);
    else if (this.lastSeen !== -1) {
      const easy = getEasyEnemy(this);
      if (easy !== -1) this.lastSeen = easy;
    } else this.lastSeen = getNearestEnemy(this);

    const importantMission = !!this.haveFlag(this.me) && this.isMission();
    
    if (!importantMission && this.lastSeen !== -1 && !fx.physics.allowFreeTurning) {
      return this.perfectAimControl(this.lastSeen);
    }

    ctrl = this.getOptimalPowerup(importantMission);
    if (ctrl !== 0) return ctrl;
    
    ctrl = this.escape();
    if (ctrl !== 0) return ctrl;
    
    ctrl = this.moveToDestinationOptimal();
    if (ctrl !== 0) return ctrl;
    
    ctrl = this.followFlag();
    if (ctrl !== 0) return ctrl;
    
    ctrl = this.improvedFreeWalk();
    if (this.lastSeen === -1) ctrl &= ~Ctl.run;
    return ctrl;
  }

  perfectAimControl(targetPid: number): number {
    const perfectAim = this.calculatePerfectAim(targetPid);
    if (perfectAim !== null) {
      const currentGundir = this.myGundir;
      const aim8 = to8way(perfectAim);
      if (aim8 !== currentGundir) {
        this.myGundir = aim8;
        return controlsFromDirection(aim8);
      }
    }
    return aim(this, targetPid);
  }

  moveToDestinationOptimal(): number {
    if (this.destinationType === DestinationType.None) return 0;
    const here = this.myArea();
    const hereDistance = this.distance(DistanceTableId.Destination, here);
    if (hereDistance === -1 || this.destination === here) return 0;

    const nextArea = this.findSafestPath(this.destination!);
    if (nextArea && nextArea !== here) {
      for (const ni of here.neighbors) {
        if (ni.area === nextArea) {
          this.immediateDestination = ni;
          return moveToDoor(this, ni);
        }
      }
    }
    
    return moveToDestination(this);
  }

  adjustDestinationForRole(role: string): void {
    if (!this.destination) return;
    
    const myTeam = this.myTeam();
    const enemyTeam = other(myTeam);
    
    switch (role) {
      case 'attacker':
        if (this.destinationType === DestinationType.Base || this.destinationType === DestinationType.Flag) {
        } else if (!this.isMission()) {
          const best = { distance: -1, area: null as Area | null };
          this.targetNearestBaseSuper(best, enemyTeam);
        }
        break;
      case 'defender':
        if (this.destinationType === DestinationType.Fog || this.destinationType === DestinationType.Team) {
          const best = { distance: -1, area: null as Area | null };
          this.targetNearestBaseSuper(best, myTeam);
        }
        break;
    }
  }

  improvedFreeWalk(): number {
    const me = this.myPos.local();
    const t = this.freeWalkTarget;
    
    for (let tries = 0; tries < 20; ++tries) {
      if (t.x >= 0) {
        const delta = new Vec(t.x - me.x, t.y - me.y);
        const targetArea = this.areaMap.identifyAreaAt(this.myPos.roomX, this.myPos.roomY, t.x, t.y);
        const danger = this.getDangerLevel(targetArea);
        
        if (!this.isBehindWall(delta, PLAYER_RADIUS, PLAYER_RADIUS) && 
            delta.mag() > 3 * PLAYER_RADIUS &&
            danger < 15) {
          return moveToNoAggregate(this, delta, PLAYER_RADIUS);
        }
      }
      const safeAreas = this.getSafeAreasForWander();
      if (safeAreas.length > 0) {
        const targetArea = safeAreas[this.rand() % safeAreas.length]!;
        const room = this.fx.map.room(targetArea.room);
        const x = PLAYER_RADIUS + (this.rand() % (ROOM_WIDTH - 2 * PLAYER_RADIUS));
        const y = PLAYER_RADIUS + (this.rand() % (ROOM_HEIGHT - 2 * PLAYER_RADIUS));
        t.x = x;
        t.y = y;
        continue;
      }
      const y = this.rand() % S_H;
      const x = this.rand() % S_W;
      t.x = x;
      t.y = y;
    }
    t.x = -1;
    return moveDirNoAggregate(this, freeDir(this));
  }

  getSafeAreasForWander(): Area[] {
    const safe: Area[] = [];
    const here = this.myArea();
    
    for (const ni of here.neighbors) {
      const danger = this.getDangerLevel(ni.area);
      if (danger < 10) safe.push(ni.area);
    }
    
    if (safe.length === 0) {
      for (const ni of here.neighbors) {
        for (const nni of ni.area.neighbors) {
          const danger = this.getDangerLevel(nni.area);
          if (danger < 15) safe.push(nni.area);
        }
      }
    }
    
    return safe;
  }

  // ============================================================================
  // OVERRIDE DO decide
  // ============================================================================

  override decide(hidden: boolean, controls: readonly number[], pending: number): { controls: number; fire: boolean } {
    const fx = this.fx;
    for (const p of fx.players) if (p.dead) p.defending = p.defendingAfterDeath;
    const me = this.player(this.me);
    
    if (hidden || !me.used || me.dead || (me.team !== 0 && me.team !== 1) || me.pos.roomX >= fx.map.width || me.pos.roomY >= fx.map.height) {
      this.myGundir = -1;
      this.freeWalkTarget.x = -1;
      this.botPrevFire = false;
      return { controls: 0, fire: false };
    }

    this.futureMe = me.cloneBot();
    this.averageLag = pending + 0.5;
    this.extrapolate(this.futureMe, controls, pending ? 1.5 : 0.5);

    if (this.myGundir === -1) this.myGundir = to8way(me.gundir);
    let ctrl = this.getRobotControls(); // Usa o override getRobotControls
    const currentGundir = this.myGundir;
    if (!(ctrl & Ctl.strafe) && controlDirection(ctrl) !== -1) this.myGundir = controlDirection(ctrl);

    let shoot: boolean;
    if (fx.physics.allowFreeTurning) {
      const [s, dir] = this.perfectNeedShootFreeTurning();
      shoot = s;
      const turnCeilingPerFrame = N_PI_2;
      const displacementMul = 0.7 * this.skill.aimSpread;
      const shootThreshold = N_PI / 8;
      const targetDiff = positiveFmod(dir * N_PI_4 - this.gunDir * N_PI_4 + N_PI, 2 * N_PI) - N_PI;
      let actualDiff = targetDiff;
      if (Math.abs(actualDiff) > turnCeilingPerFrame) actualDiff = turnCeilingPerFrame * (actualDiff > 0 ? 1 : -1);
      const modifier = ((this.rand() % 10001) - 5000) / 5000;
      actualDiff *= 1 + displacementMul * modifier * modifier * modifier;
      this.gunDir = adjustGunDirection(this.gunDir, actualDiff);
      if (Math.abs(actualDiff - targetDiff) > shootThreshold) shoot = false;
    } else {
      const [s, aimed] = this.perfectNeedShootTradTurning();
      shoot = s;
      let dir = aimed;
      if (shoot && dir !== this.myGundir) {
        if (dir === currentGundir) {
          ctrl |= Ctl.strafe;
          this.myGundir = currentGundir;
        } else {
          ctrl = controlsFromDirection(dir);
          this.myGundir = dir;
        }
      }
    }
    this.botPrevFire = shoot;
    
    const upDown = !!(ctrl & Ctl.up) !== !!(ctrl & Ctl.down);
    const leftRight = !!(ctrl & Ctl.left) !== !!(ctrl & Ctl.right);
    if (!upDown && !leftRight) ctrl &= ~(Ctl.run | Ctl.strafe);
    
    this.metrics.framesDecided++;
    if (shoot) this.metrics.shotsFired++;
    
    return { controls: ctrl, fire: shoot };
  }

  perfectNeedShootFreeTurning(): [boolean, number] {
    const tryOrder: number[] = [];
    for (const pl of this.fx.players) {
      if (!pl.used || this.isMyTeam(pl) || pl.dead || !this.here(pl, true)) continue;
      if (pl.pid !== this.lastSeen) tryOrder.push(pl.pid);
    }
    
    if (this.lastSeen !== -1) {
      const aim = tryAimFreeTurning(this, this.lastSeen);
      if (aim[0] && this.canHitTargetPerfectly(this.lastSeen)) {
        return aim;
      }
    }
    
    for (const t of tryOrder) {
      const aim = tryAimFreeTurning(this, t);
      if (aim[0] && this.canHitTargetPerfectly(t)) {
        this.lastSeen = t;
        return aim;
      }
    }
    
    if (this.lastSeen !== -1) {
      const aim = tryAimFreeTurning(this, this.lastSeen);
      return [false, aim[1]];
    }
    
    return [false, this.gunDir >= 0 ? this.gunDir : 0];
  }

  perfectNeedShootTradTurning(): [boolean, number] {
    const dirDistances: [boolean, number][] = Array.from({ length: 8 }, () => [false, 0]);
    let anyInRoom = false;
    
    for (const pl of this.fx.players) {
      if (!pl.used || this.isMyTeam(pl) || pl.dead || !this.here(pl, true)) continue;
      anyInRoom = true;
      const [level, dir] = tryAimTradTurning(this, pl.pid);
      if (level !== AimLevel.Full) continue;
      const hitTime = this.getHitTime(dir, pl.pid);
      if (hitTime > 1e10) continue;
      const entry = dirDistances[dir]!;
      if (!entry[0] || hitTime < entry[1]) dirDistances[dir] = [true, hitTime];
    }
    
    if (!anyInRoom) return this.shootAtDoorTradTurning();
    
    let bestDir = -1;
    let bestValue = 1e99;
    for (let dir = 0; dir < 8; ++dir) {
      const [has, time] = dirDistances[dir]!;
      if (!has || time > this.getHitTeammateTime(dir)) continue;
      let dirDiff = Math.abs(dir - this.myGundir);
      if (dirDiff > 4) dirDiff = 8 - dirDiff;
      const value = time * dirDiff;
      if (value < bestValue) {
        bestValue = value;
        bestDir = dir;
      }
    }
    return [bestDir !== -1, bestDir];
  }

  private shootAtDoorTradTurning(): [boolean, number] {
    const fx = this.fx;
    const me = this.player(this.me);
    const myPos = this.myPos;
    if (myPos.roomX !== me.pos.roomX || myPos.roomY !== me.pos.roomY) return [false, -1];
    const futurePos = myPos.local().add(me.vel.mul(5));
    if (futurePos.x < 0 || futurePos.x > S_W || futurePos.y < 0 || futurePos.y > S_H) return [false, -1];

    const enemyAreas = new Set<Area>();
    for (const pl of fx.players) {
      if (!pl.used || this.isMyTeam(pl) || pl.dead || pl.posUpdated < fx.frame - FADEOUT) continue;
      enemyAreas.add(this.areaOf(pl.pos));
    }
    const here = this.myArea();
    const halfH = Math.trunc(S_H / 2);
    for (const ni of here.neighbors) {
      if (fx.enemiesSeen(ni.area.room.x, ni.area.room.y) >= fx.frame - 5 && !enemyAreas.has(ni.area)) continue;
      if (this.distanceFromDoor(ni, myPos.local()) < halfH) return [false, -1];
    }
    const hitPos = Array.from({ length: 8 }, (_, dir) => this.wallHitPosition(dir, ROCKET_RADIUS));
    let bestDist = 1e99;
    let bestDir = -1;
    let knownEnemyTargeted = false;
    for (const ni of here.neighbors) {
      const roomSeen = fx.enemiesSeen(ni.area.room.x, ni.area.room.y) >= fx.frame - 5;
      const knownEnemy = enemyAreas.has(ni.area);
      const nearRespawn = ni.area.respawnValue[this.myTeam() === 0 ? 1 : 0] >= 0.25;
      if (!knownEnemy && (roomSeen || !nearRespawn)) continue;
      for (let dir = 0; dir < 8; ++dir) {
        const [len, point] = hitPos[dir]!;
        if (len < halfH) continue;
        const dist = this.distanceFromDoor(ni, point);
        if ((dist < bestDist && knownEnemy === knownEnemyTargeted) || (knownEnemy && !knownEnemyTargeted)) {
          bestDist = dist;
          bestDir = dir;
          knownEnemyTargeted = knownEnemy;
          if (dist < 1 && knownEnemy) return [true, dir];
        }
      }
    }
    return bestDist > 4 * PLAYER_RADIUS ? [false, -1] : [true, bestDir];
  }

  private getHitTime(dir: number, iTarget: number): number {
    const target = this.player(iTarget);
    if (target.dead || !this.here(target, true)) return POSITIVE_INFINITY;
    const d = this.predictPlayer(target).sub(this.myPos.local());
    const dist = d.mag();
    if (dist <= PLAYER_RADIUS) return 0;
    const rad = dir * N_PI_4;
    const rs = new Vec(Math.cos(rad), Math.sin(rad)).mul(this.fx.physics.rocketSpeed);
    const ts = rs.sub(target.vel);
    const ts2 = ts.mag2();
    if (ts2 === 0) return POSITIVE_INFINITY;
    const mul = dot(d, ts) / ts2;
    const par = ts.mul(mul);
    const perp = d.sub(par);
    const hitTime = Math.sqrt(par.mag2() / ts2);
    return perp.mag() < 3 * PLAYER_RADIUS ? hitTime : POSITIVE_INFINITY;
  }

  private getHitTeammateTime(dir: number): number {
    let hitTime = POSITIVE_INFINITY;
    if (this.fx.physics.friendlyFire === 0) return hitTime;
    for (let i = 0; i < this.fx.maxPlayers; ++i) {
      const p = this.player(i);
      if (p.used && this.isMyTeam(p) && i !== this.me) hitTime = Math.min(hitTime, this.getHitTime(dir, i));
    }
    return hitTime;
  }
}

export function createSuperBot(view: BotView, areaMap: AreaMap, me: number, rng: Rng): SuperBot {
  return new SuperBot(view, areaMap, me, rng, DEFAULT_SUPER_BOT_CONFIG);
}

export function createCheatBot(view: BotView, areaMap: AreaMap, me: number, rng: Rng): SuperBot {
  return new SuperBot(view, areaMap, me, rng, CHEAT_BOT_CONFIG);
}

export function createFarmBot(view: BotView, areaMap: AreaMap, me: number, rng: Rng): SuperBot {
  return new SuperBot(view, areaMap, me, rng, FARM_BOT_CONFIG);
}