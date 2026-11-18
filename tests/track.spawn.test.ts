import { describe, expect, it } from 'vitest';
import { Track } from '../src/game/Track';
import { OBSTACLES } from '../src/game/ObstacleTypes';
import { CONFIG } from '../src/config';

function simulate(seed: number, seconds: number, speed = 20, onStep?: (t: Track, d: number) => void): Track {
  const t = new Track();
  t.reset(seed);
  let d = 0;
  const dt = 1 / 30;
  for (let s = 0; s < seconds; s += dt) {
    d += speed * dt;
    t.update(dt, d, speed);
    onStep?.(t, d);
  }
  return t;
}

describe('Track spawning', () => {
  it('keeps obstacles and coins spawned ahead of the player, with a clear runway at the start', () => {
    const t = new Track();
    t.reset(7);
    t.update(0, 0, CONFIG.speed.start);
    const active = t.obstacles.filter((o) => o.active);
    expect(active.length).toBeGreaterThan(0);
    for (const o of active) expect(o.d).toBeGreaterThanOrEqual(CONFIG.obstacles.firstAt - 1);
    expect(t.nextD).toBeGreaterThanOrEqual(CONFIG.obstacles.spawnAhead);
  });

  it('never runs out of pool space over a long run', () => {
    simulate(3, 240, 30, (t, d) => {
      expect(t.nextD).toBeGreaterThan(d + CONFIG.obstacles.spawnAhead - 30);
    });
  });

  it('recycles everything well behind the player', () => {
    simulate(11, 60, 25, (t, d) => {
      for (const o of t.obstacles) if (o.active) expect(o.far).toBeGreaterThan(d - CONFIG.obstacles.recycleBehind - 1);
    });
  });

  it('never parks two obstacles overlapping in the same lane', () => {
    simulate(5, 120, 24, (t) => {
      const parked = t.obstacles.filter((o) => o.active && o.vel === 0);
      for (let i = 0; i < parked.length; i++) {
        for (let j = i + 1; j < parked.length; j++) {
          const a = parked[i];
          const b = parked[j];
          if (a.lane !== b.lane) continue;
          const overlap = Math.min(a.far, b.far) - Math.max(a.d, b.d);
          expect(overlap).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  it('oncoming vehicles never drive through parked ones in their lane', () => {
    simulate(9, 200, 26, (t) => {
      const moving = t.obstacles.filter((o) => o.active && o.vel < 0);
      const parked = t.obstacles.filter((o) => o.active && o.vel === 0 && !o.spec.trigger);
      for (const m of moving) {
        for (const p of parked) {
          if (p.lane !== m.lane) continue;
          const overlap = Math.min(m.far, p.far) - Math.max(m.d, p.d);
          expect(overlap).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  it('places coins on top of ramps and bus roofs in the bus-train pattern', () => {
    let maxY = 0;
    simulate(21, 300, 22, (t) => {
      for (const c of t.coins) if (c.active) maxY = Math.max(maxY, c.y);
    });
    expect(maxY).toBeGreaterThan(OBSTACLES.bus.height);
  });

  it('spawns the occasional Teapot Token and sovereign', () => {
    let tokens = 0;
    let sovs = 0;
    const seen = new Set<object>();
    simulate(4, 200, 30, (t) => {
      for (const c of t.coins) {
        if (!c.active || seen.has(c)) continue;
        if (c.kind === 'token') tokens++;
        if (c.kind === 'sovereign') sovs++;
      }
      // Count each live coin object once per activation.
      seen.clear();
      for (const c of t.coins) if (c.active) seen.add(c);
    });
    expect(tokens).toBeGreaterThan(0);
    expect(sovs).toBeGreaterThan(0);
  });

  it('raises the difficulty level with distance', () => {
    const t = simulate(2, 100, 30);
    expect(t.level).toBeGreaterThan(0);
  });
});
