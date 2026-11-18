import { CONFIG } from '../config';
import { PATTERNS, type Pattern } from '../data/patterns';
import { OBSTACLES, Obstacle } from './ObstacleTypes';
import { laneX } from './Lanes';
import { mulberry32 } from '../utils/random';
import { pickPower, type PowerKind } from '../powerups/PowerUps';

/** Collectibles on the road. 'power' is a power-up pickup (see `power`). */
export type CoinKind = 'penny' | 'sovereign' | 'token' | 'power';

export class Coin {
  active = false;
  kind: CoinKind = 'penny';
  power: PowerKind = 'magnet';
  x = 0;
  y = 0;
  d = 0;
  lane = 0;
  /** Being pulled in by the Teacup Magnet. */
  pulled = false;
}

const LANES = [-1, 0, 1] as const;
const PERMS: ReadonlyArray<readonly [number, number, number]> = [
  [-1, 0, 1],
  [-1, 1, 0],
  [0, -1, 1],
  [0, 1, -1],
  [1, -1, 0],
  [1, 0, -1],
];

/**
 * Everything on the road ahead: pooled obstacles and coins, spawned from patterns.
 * Pure logic (no Three.js) so the rules are unit-tested; views mirror these pools.
 */
export class Track {
  readonly obstacles: Obstacle[] = [];
  readonly coins: Coin[] = [];
  /** Track distance where the next pattern will start. */
  nextD = 0;
  level = 0;
  /** Lanes kept clear (track distance) while an oncoming vehicle drives through. */
  readonly reserved = [-Infinity, -Infinity, -Infinity];
  private rng = mulberry32(1);
  private nextTokenAt = 0;
  private nextPowerAt = 0;
  /** Helicopter Tail coin trail in the sky: laid down until `skyUntil`. */
  private skyUntil = -Infinity;
  private skyNextD = 0;
  private skyLane = 0;
  private skyY = 0;
  private lastPattern = '';
  private readonly order = [0, 1, 2, 3, 4, 5];

  constructor(obstacleCap = 56, coinCap = 240) {
    for (let i = 0; i < obstacleCap; i++) this.obstacles.push(new Obstacle());
    for (let i = 0; i < coinCap; i++) this.coins.push(new Coin());
  }

  reset(seed: number): void {
    this.rng = mulberry32(seed);
    for (const o of this.obstacles) o.active = false;
    for (const c of this.coins) c.active = false;
    this.nextD = CONFIG.obstacles.firstAt;
    this.level = 0;
    this.reserved[0] = this.reserved[1] = this.reserved[2] = -Infinity;
    this.nextTokenAt = this.randRange(CONFIG.coins.tokenEvery[0], CONFIG.coins.tokenEvery[1]);
    this.nextPowerAt = CONFIG.obstacles.firstAt + this.randRange(CONFIG.powerups.spawnEvery[0] * 0.4, CONFIG.powerups.spawnEvery[1] * 0.6);
    this.skyUntil = -Infinity;
    this.lastPattern = '';
  }

  /** Move vehicles, recycle what is behind, spawn ahead. */
  update(dt: number, distance: number, speed: number): void {
    const behind = distance - CONFIG.obstacles.recycleBehind;
    for (const o of this.obstacles) {
      if (!o.active) continue;
      o.prevD = o.d;
      o.d += o.vel * dt;
      if (o.far < behind) o.active = false;
    }
    for (const c of this.coins) {
      if (c.active && c.d < distance - 4) c.active = false;
    }
    this.level = Math.min(CONFIG.obstacles.maxLevel, Math.floor(distance / CONFIG.obstacles.levelEvery));
    while (this.nextD < distance + CONFIG.obstacles.spawnAhead) {
      this.spawnNext(distance, speed);
    }
    this.layDownSkyTrail(distance);
  }

  /**
   * Helicopter Tail: lay a weaving trail of coins at flying height from just ahead of
   * the player up to `until`, a little at a time as the player advances.
   */
  startSkyTrail(fromD: number, until: number, y: number, lane: number): void {
    this.skyNextD = fromD;
    this.skyUntil = until;
    this.skyY = y;
    this.skyLane = lane;
  }

  stopSkyTrail(): void {
    this.skyUntil = -Infinity;
  }

  private layDownSkyTrail(distance: number): void {
    const limit = Math.min(this.skyUntil, distance + 60);
    const spacing = CONFIG.coins.spacing * 1.4;
    while (this.skyNextD < limit) {
      // Drift to a neighbouring lane now and then so the trail weaves.
      if (this.rng() < 0.08) this.skyLane = Math.max(-1, Math.min(1, this.skyLane + (this.rng() < 0.5 ? -1 : 1)));
      const c = this.allocCoin();
      if (!c) return;
      c.active = true;
      c.pulled = false;
      c.kind = this.rng() < CONFIG.coins.sovereignChance * 2 ? 'sovereign' : 'penny';
      c.lane = this.skyLane;
      c.x = laneX(this.skyLane);
      c.y = this.skyY + 0.3;
      c.d = this.skyNextD;
      this.skyNextD += spacing;
    }
  }

  /** Clear road between patterns grows with speed so reaction time stays fair. */
  gapFor(speed: number): number {
    return CONFIG.obstacles.gapBase + CONFIG.obstacles.gapPerSpeed * speed;
  }

  private spawnNext(distance: number, speed: number): void {
    const D = this.nextD;
    const pattern = this.pickPattern();
    const lanes = this.pickLanes(pattern, D);
    const gap = this.gapFor(speed);
    if (lanes) {
      this.place(pattern, lanes, D, distance, speed);
      this.lastPattern = pattern.id;
      this.nextD = D + pattern.length + gap;
    } else {
      // Every layout clashes with an oncoming vehicle's lane: leave some open road.
      this.nextD = D + 8;
    }
    if (D >= this.nextTokenAt) {
      this.spawnToken(D - gap / 2);
      this.nextTokenAt += this.randRange(CONFIG.coins.tokenEvery[0], CONFIG.coins.tokenEvery[1]);
    } else if (D >= this.nextPowerAt) {
      this.spawnPower(D - gap / 2);
      this.nextPowerAt = D + this.randRange(CONFIG.powerups.spawnEvery[0], CONFIG.powerups.spawnEvery[1]);
    }
  }

  private pickPattern(): Pattern {
    let total = 0;
    for (const p of PATTERNS) if (p.minLevel <= this.level && p.id !== this.lastPattern) total += p.weight;
    let r = this.rng() * total;
    for (const p of PATTERNS) {
      if (p.minLevel > this.level || p.id === this.lastPattern) continue;
      r -= p.weight;
      if (r <= 0) return p;
    }
    return PATTERNS[0];
  }

  /** Choose a slot→lane mapping that keeps clear of reserved (oncoming) lanes. */
  private pickLanes(p: Pattern, D: number): readonly [number, number, number] | null {
    // Shuffle the six permutations (Fisher-Yates on a reused array).
    const ord = this.order;
    for (let i = ord.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const t = ord[i];
      ord[i] = ord[j];
      ord[j] = t;
    }
    for (const k of ord) {
      const perm = PERMS[k];
      if (this.fits(p, perm, D)) return perm;
    }
    return null;
  }

  private fits(p: Pattern, perm: readonly [number, number, number], D: number): boolean {
    for (const it of p.items) if (D + it.at - 2 < this.reserved[perm[it.slot] + 1]) return false;
    for (const c of p.coins) if (D + c.at - 2 < this.reserved[perm[c.slot] + 1]) return false;
    return true;
  }

  private place(p: Pattern, perm: readonly [number, number, number], D: number, distance: number, speed: number): void {
    for (const it of p.items) {
      const lane = perm[it.slot];
      const o = this.allocObstacle();
      if (!o) return;
      const meet = D + it.at;
      if (it.oncoming) {
        const v = it.kind === 'bus' ? CONFIG.obstacles.oncomingBusSpeed : CONFIG.obstacles.oncomingCabSpeed;
        // Start far enough ahead that it reaches `meet` just as the player does.
        const s = Math.max(1, speed);
        const start = distance + (meet - distance) * ((s + v) / s);
        o.set(it.kind, lane, laneX(lane), start, -v);
        this.reserved[lane + 1] = Math.max(this.reserved[lane + 1], start + OBSTACLES[it.kind].length + 4);
      } else {
        o.set(it.kind, lane, laneX(lane), meet);
      }
    }
    const spacing = CONFIG.coins.spacing;
    for (const run of p.coins) {
      const lane = perm[run.slot];
      for (let i = 0; i < run.count; i++) {
        const at = run.at + i * spacing;
        const c = this.allocCoin();
        if (!c) return;
        const t = run.count > 1 ? i / (run.count - 1) : 0.5;
        const surface = surfaceInPattern(p, run.slot, at);
        const lift = run.low ? 0.4 : CONFIG.coins.hover + (run.arc ? run.arc * Math.sin(Math.PI * t) : 0);
        c.active = true;
        c.pulled = false;
        c.kind = this.rng() < CONFIG.coins.sovereignChance ? 'sovereign' : 'penny';
        c.lane = lane;
        c.x = laneX(lane);
        c.y = surface + lift;
        c.d = D + at;
      }
    }
  }

  private spawnToken(d: number): void {
    const lane = LANES[Math.floor(this.rng() * 3)];
    if (d < this.reserved[lane + 1]) return;
    const c = this.allocCoin();
    if (!c) return;
    c.active = true;
    c.pulled = false;
    c.kind = 'token';
    c.lane = lane;
    c.x = laneX(lane);
    c.y = 1.1;
    c.d = d;
  }

  /** Place a floating power-up pickup in the clear road between patterns. */
  private spawnPower(d: number): void {
    const lane = LANES[Math.floor(this.rng() * 3)];
    if (d < this.reserved[lane + 1]) return;
    const c = this.allocCoin();
    if (!c) return;
    c.active = true;
    c.pulled = false;
    c.kind = 'power';
    c.power = pickPower(this.rng());
    c.lane = lane;
    c.x = laneX(lane);
    c.y = 1.15;
    c.d = d;
  }

  private allocObstacle(): Obstacle | null {
    for (const o of this.obstacles) if (!o.active) return o;
    return null;
  }

  private allocCoin(): Coin | null {
    for (const c of this.coins) if (!c.active) return c;
    return null;
  }

  private randRange(a: number, b: number): number {
    return a + (b - a) * this.rng();
  }
}

/** Height of the walkable surface (ramp / roof) at `at` in a pattern slot, else 0. */
export function surfaceInPattern(p: Pattern, slot: number, at: number): number {
  let h = 0;
  for (const it of p.items) {
    if (it.slot !== slot || it.oncoming) continue;
    const s = OBSTACLES[it.kind];
    if (!s.platform || at < it.at || at > it.at + s.length) continue;
    const top = s.ramp ? s.height * ((at - it.at) / s.length) : s.height;
    if (top > h) h = top;
  }
  return h;
}
