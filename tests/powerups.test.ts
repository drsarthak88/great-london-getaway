import { describe, expect, it } from 'vitest';
import { PowerUps, POWER_KINDS, pickPower, powerDuration, type PowerKind } from '../src/powerups/PowerUps';
import { magnetPull } from '../src/powerups/Magnet';
import { PlayerController } from '../src/entities/PlayerController';
import { Coin, Track } from '../src/game/Track';
import { collectCoins } from '../src/game/Coins';
import { CONFIG } from '../src/config';

const P = CONFIG.powerups;
const tick = (p: PowerUps, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) p.update(1 / 60);
};

describe('power-up timers', () => {
  it('every power-up lasts 8-15 seconds at base level', () => {
    for (const k of POWER_KINDS) {
      expect(powerDuration(k)).toBeGreaterThanOrEqual(8);
      expect(powerDuration(k)).toBeLessThanOrEqual(15);
    }
  });

  it('runs down and fires onEnd once when it expires', () => {
    const p = new PowerUps();
    const ended: PowerKind[] = [];
    p.onEnd = (k) => ended.push(k);
    p.activate('magnet');
    expect(p.isActive('magnet')).toBe(true);
    expect(p.fraction('magnet')).toBe(1);
    tick(p, P.duration.magnet / 2);
    expect(p.fraction('magnet')).toBeCloseTo(0.5, 1);
    tick(p, P.duration.magnet);
    expect(p.isActive('magnet')).toBe(false);
    expect(ended).toEqual(['magnet']);
  });

  it('shop upgrades lengthen the duration, capped at the max level', () => {
    expect(powerDuration('spring', 2)).toBeCloseTo(P.duration.spring * (1 + 2 * P.upgradeStep), 6);
    expect(powerDuration('spring', 99)).toBe(powerDuration('spring', P.maxLevel));
    const p = new PowerUps();
    p.levels = { spring: 3 };
    p.activate('spring');
    expect(p.timeLeft('spring')).toBeCloseTo(powerDuration('spring', 3), 6);
  });

  it('picking up the same power-up again refills it', () => {
    const p = new PowerUps();
    p.activate('teaTime');
    tick(p, 5);
    p.activate('teaTime');
    expect(p.fraction('teaTime')).toBe(1);
  });

  it('movement power-ups replace each other; the others stack', () => {
    const p = new PowerUps();
    const ended: PowerKind[] = [];
    p.onEnd = (k) => ended.push(k);
    p.activate('helicopter');
    p.activate('magnet');
    p.activate('helmet');
    p.activate('spring');
    expect(p.isActive('helicopter')).toBe(false);
    expect(ended).toEqual(['helicopter']);
    expect(p.isActive('spring')).toBe(true);
    expect(p.isActive('magnet')).toBe(true);
    expect(p.isActive('helmet')).toBe(true);
  });

  it("Bobby's Helmet absorbs exactly one hit", () => {
    const p = new PowerUps();
    expect(p.consumeShield()).toBe(false);
    p.activate('helmet');
    expect(p.consumeShield()).toBe(true);
    expect(p.consumeShield()).toBe(false);
  });

  it('weighted picks cover every power-up, with the corgi rare', () => {
    const counts = Object.fromEntries(POWER_KINDS.map((k) => [k, 0])) as Record<PowerKind, number>;
    for (let i = 0; i < 2000; i++) counts[pickPower((i + 0.5) / 2000)]++;
    for (const k of POWER_KINDS) expect(counts[k]).toBeGreaterThan(0);
    expect(counts.corgi).toBeLessThan(counts.magnet / 2);
  });
});

describe('movement modes', () => {
  it('Spring Tail jumps 3x higher, high enough to clear a bus', () => {
    const c = new PlayerController();
    c.jumpMultiplier = P.springJump;
    c.jump();
    let apex = 0;
    for (let i = 0; i < 240 && (c.airborne || i === 0); i++) {
      c.update(1 / 60);
      apex = Math.max(apex, c.y);
    }
    expect(apex).toBeGreaterThan(4.5);
  });

  it('Brolly Glide floats: lower gravity means a much longer airtime', () => {
    const normal = new PlayerController();
    const brolly = new PlayerController();
    brolly.jumpMultiplier = P.brollyJump;
    brolly.gravityMultiplier = P.brollyGravity;
    const air = (c: PlayerController) => {
      c.jump();
      let t = 0;
      while (c.airborne && t < 10) {
        c.update(1 / 60);
        t += 1 / 60;
      }
      return t;
    };
    expect(air(brolly)).toBeGreaterThan(air(normal) * 1.8);
  });

  it('Helicopter Tail rises to cruising height, can change lanes, cannot jump or roll', () => {
    const c = new PlayerController();
    c.flying = true;
    c.flyHeight = P.flyHeight;
    for (let i = 0; i < 180; i++) c.update(1 / 60);
    expect(c.y).toBeCloseTo(P.flyHeight, 1);
    expect(c.jump()).toBe(false);
    c.roll();
    expect(c.rolling).toBe(false);
    expect(c.move(1)).toBe(true);
    for (let i = 0; i < 30; i++) c.update(1 / 60);
    expect(c.x).toBeCloseTo(CONFIG.lanes.width, 3);
    // Landing: gravity takes over again when the flight ends.
    c.flying = false;
    for (let i = 0; i < 240; i++) c.update(1 / 60);
    expect(c.grounded).toBe(true);
    expect(c.y).toBe(0);
  });

  it('Black Cab Dash keeps the wheels on the road', () => {
    const c = new PlayerController();
    c.driving = true;
    expect(c.jump()).toBe(false);
    c.roll();
    expect(c.rolling).toBe(false);
  });
});

describe('Teacup Magnet', () => {
  const coin = (x: number, y: number, d: number, kind: Coin['kind'] = 'penny') => Object.assign(new Coin(), { active: true, kind, x, y, d });

  it('pulls nearby coins from other lanes into reach, but not far-off ones', () => {
    const near = coin(2.5, 0.65, 106);
    const far = coin(0, 0.65, 160);
    const coins = [near, far];
    let got = 0;
    for (let i = 0; i < 60; i++) {
      magnetPull(coins, 0, 0, 100 + i * 0.25, 1 / 60);
      got += collectCoins(coins, 0, 0, 1.5, 100 + i * 0.25, () => {});
    }
    expect(got).toBe(1);
    expect(near.active).toBe(false);
    expect(far.active).toBe(true);
  });

  it('leaves power-up pickups and Teapot Tokens alone', () => {
    const p = coin(2.5, 1, 104, 'power');
    const t = coin(2.5, 1, 104, 'token');
    magnetPull([p, t], 0, 0, 100, 0.5);
    expect(p.x).toBe(2.5);
    expect(t.x).toBe(2.5);
  });
});

describe('power-up spawning', () => {
  it('places power-up pickups on the road regularly', () => {
    const t = new Track();
    t.reset(12);
    let d = 0;
    const seen = new Set<string>();
    for (let s = 0; s < 120; s += 1 / 30) {
      d += 25 / 30;
      t.update(1 / 30, d, 25);
      for (const c of t.coins) if (c.active && c.kind === 'power') seen.add(`${Math.round(c.d)}`);
    }
    // ~3000 units travelled, one pickup every ~230-380 units.
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });

  it('lays a sky coin trail at flying height while the helicopter is up', () => {
    const t = new Track();
    t.reset(4);
    t.update(0, 0, 20);
    t.startSkyTrail(10, 200, P.flyHeight, 0);
    t.update(1 / 30, 1, 20);
    const sky = t.coins.filter((c) => c.active && c.y > P.flyHeight);
    expect(sky.length).toBeGreaterThan(5);
    for (const c of sky) expect(c.d).toBeLessThanOrEqual(200);
  });
});
