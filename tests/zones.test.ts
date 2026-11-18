import { describe, expect, it } from 'vitest';
import { ZONES } from '../src/data/zones';
import { POSTCARDS, GENERAL_FACTS } from '../src/data/facts';
import { ZONE_LENGTH, bridgeAt, clearance, forLandmarks, nextBridgeGap, riverAt, zoneAt, zoneBlend, zoneEntered, zoneIndexAt } from '../src/game/Zones';
import { Weather } from '../src/game/Weather';
import { Track } from '../src/game/Track';
import { classifyHit } from '../src/game/Collision';
import { Obstacle } from '../src/game/ObstacleTypes';
import { CONFIG } from '../src/config';

describe('zones', () => {
  it('has the eight London zones in order, starting at Westminster', () => {
    expect(ZONES.map((z) => z.id)).toEqual(['westminster', 'southBank', 'towerBridge', 'buckingham', 'trafalgar', 'bakerStreet', 'stPauls', 'camden']);
    expect(zoneAt(0).id).toBe('westminster');
  });

  it('cycles back to Westminster after Camden', () => {
    expect(zoneIndexAt(ZONE_LENGTH * 7.5)).toBe(7);
    expect(zoneIndexAt(ZONE_LENGTH * 8.1)).toBe(0);
  });

  it('blends colours into the next zone only near the end', () => {
    const b = { a: 0, b: 0, t: 0 };
    zoneBlend(10, b);
    expect(b).toEqual({ a: 0, b: 1, t: 0 });
    zoneBlend(ZONE_LENGTH - 1, b);
    expect(b.t).toBeGreaterThan(0.95);
    zoneBlend(ZONE_LENGTH * 8 - 1, b);
    expect(b.b).toBe(0);
  });

  it('reports entering a new zone exactly once', () => {
    expect(zoneEntered(ZONE_LENGTH - 1, ZONE_LENGTH + 1)).toBe(1);
    expect(zoneEntered(ZONE_LENGTH + 1, ZONE_LENGTH + 2)).toBe(-1);
  });

  it('finds landmarks on every pass through the cycle', () => {
    const seen: string[] = [];
    forLandmarks(0, ZONE_LENGTH, (id) => seen.push(id));
    expect(seen).toContain('bigBen');
    const later: number[] = [];
    forLandmarks(ZONE_LENGTH * 8, ZONE_LENGTH * 9, (id, _d, _s, _l, cycle) => {
      if (id === 'bigBen') later.push(cycle);
    });
    expect(later).toEqual([8]);
  });

  it('every landmark has a postcard with 2-3 short facts', () => {
    for (const z of ZONES) {
      for (const lm of z.landmarks) {
        const card = POSTCARDS[lm.id];
        expect(card, lm.id).toBeDefined();
        expect(card.facts.length).toBeGreaterThanOrEqual(2);
        expect(card.facts.length).toBeLessThanOrEqual(3);
        for (const f of card.facts) expect(f.length).toBeLessThan(140);
      }
    }
    expect(GENERAL_FACTS.length).toBeGreaterThan(4);
  });

  it('clears terraces for landmarks and rivers, but not elsewhere', () => {
    // Big Ben is on the left in Westminster.
    expect(clearance(-1, 160, 170)).toBe(true);
    expect(clearance(1, 160, 170)).toBe(false);
    // South Bank: the Thames runs along the right.
    expect(riverAt(1, ZONE_LENGTH + 50)).toBe(true);
    expect(clearance(1, ZONE_LENGTH + 40, ZONE_LENGTH + 80)).toBe(true);
    expect(clearance(-1, ZONE_LENGTH + 40, ZONE_LENGTH + 80)).toBe(false);
  });

  it('puts the road on Tower Bridge with bascule gaps', () => {
    const tb = ZONE_LENGTH * 2;
    expect(bridgeAt(tb + 250)).toBe(true);
    expect(bridgeAt(tb + 20)).toBe(false);
    expect(nextBridgeGap(tb)).toBe(tb + 255);
    expect(nextBridgeGap(tb + 256)).toBe(tb + 298);
    expect(nextBridgeGap(tb + 300)).toBe(tb + ZONE_LENGTH * 8 + 255);
  });
});

describe('Tower Bridge gaps', () => {
  it('spawns a gap across all three lanes at each bascule, with nothing else overlapping it', () => {
    const t = new Track();
    t.reset(5);
    const tb = ZONE_LENGTH * 2;
    let d = tb - 200;
    const gapsSeen = new Set<number>();
    for (let s = 0; s < 40; s += 1 / 30) {
      d += 20 / 30;
      t.update(1 / 30, d, 20);
      const gaps = t.obstacles.filter((o) => o.active && o.kind === 'gap');
      for (const g of gaps) gapsSeen.add(Math.round(g.d));
      for (const g of gaps) {
        for (const o of t.obstacles) {
          if (!o.active || o.kind === 'gap' || o.lane !== g.lane) continue;
          expect(Math.min(o.far, g.far) - Math.max(o.d, g.d)).toBeLessThanOrEqual(0);
        }
      }
    }
    expect([...gapsSeen].sort()).toEqual([tb + 255, tb + 298]);
  });

  it('running into a gap is a fall; jumping over it is fine', () => {
    const o = new Obstacle().set('gap', 0, 0, 10);
    const P = CONFIG.player;
    const box = (y: number, d: number) => ({ x: 0, y, d, halfW: P.halfWidth, halfD: P.halfDepth, height: P.standHeight });
    expect(classifyHit(o, box(0, 10.5), box(0, 11))).toBe('fall');
    expect(classifyHit(o, box(1.2, 10.5), box(1.2, 11))).toBe('none');
    // Just touching the lip isn't enough to fall in.
    expect(classifyHit(o, box(0, 9.6), box(0, 10.2))).toBe('none');
  });

  it('there are no oncoming vehicles on the bridge', () => {
    const t = new Track();
    t.reset(9);
    const tb = ZONE_LENGTH * 2;
    let d = tb + 100;
    for (let s = 0; s < 20; s += 1 / 30) {
      d += 18 / 30;
      t.update(1 / 30, d, 18);
    }
    expect(t.obstacles.some((o) => o.active && o.vel < 0 && o.d > tb + 160 && o.d < tb + 390)).toBe(false);
  });
});

describe('weather', () => {
  it('schedules fog and drizzle with clear stretches between, fading in and out', () => {
    const w = new Weather();
    w.reset(3);
    const kinds = new Set<string>();
    let clear = 0;
    for (let d = 0; d < 20000; d += 5) {
      w.update(d);
      const k = w.current(d);
      kinds.add(k);
      if (k === 'clear') clear++;
      const a = w.amount(k as 'fog', d);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
    expect(kinds).toEqual(new Set(['clear', 'fog', 'drizzle']));
    expect(clear / 4000).toBeGreaterThan(0.55);
  });

  it('is deterministic for a seed', () => {
    const a = new Weather();
    const b = new Weather();
    a.reset(42);
    b.reset(42);
    a.update(5000);
    b.update(5000);
    expect([a.start, a.end, a.kind]).toEqual([b.start, b.end, b.kind]);
  });

  it('drizzle makes puddle patterns more likely', () => {
    const count = (withRain: boolean) => {
      const t = new Track();
      t.reset(8);
      const w = new Weather();
      w.reset(1);
      if (withRain) {
        w.start = -1;
        w.end = 1e9;
        w.kind = 'drizzle';
      } else {
        w.start = w.end = 1e9;
      }
      t.weather = w;
      let d = 0;
      let puddles = 0;
      const seen = new Set<object>();
      for (let s = 0; s < 120; s += 1 / 15) {
        d += 22 / 15;
        t.update(1 / 15, d, 22);
        for (const o of t.obstacles) if (o.active && o.kind === 'puddle' && !seen.has(o)) {
          seen.add(o);
          puddles++;
        }
        for (const o of [...seen]) if (!(o as { active: boolean }).active) seen.delete(o);
      }
      return puddles;
    };
    expect(count(true)).toBeGreaterThan(count(false) * 1.5);
  });
});
