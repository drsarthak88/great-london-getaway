import { describe, expect, it } from 'vitest';
import { TrackLayout } from '../src/game/TrackLayout';
import { speedAt, jumpPhysics } from '../src/game/Difficulty';
import { CONFIG } from '../src/config';

describe('TrackLayout', () => {
  it('lays chunks end to end from the origin', () => {
    const t = new TrackLayout(4, 10, 5, 0);
    expect(t.starts).toEqual([0, 10, 20, 30]);
    expect(t.end).toBe(40);
  });

  it('recycles chunks that fall behind to the front, keeping the road continuous', () => {
    const t = new TrackLayout(4, 10, 5, 0);
    const moved: number[] = [];
    t.update(16, (i, start) => moved.push(i, start));
    expect(moved).toEqual([0, 40]);
    const sorted = [...t.starts].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBe(10);
  });

  it('keeps road ahead of the player over a long run, even with big jumps in distance', () => {
    const t = new TrackLayout(6, 40, 14, -20);
    for (let d = 0; d < 50_000; d += 333) {
      t.update(d, () => {});
      expect(Math.min(...t.starts)).toBeLessThanOrEqual(d);
      expect(t.end).toBeGreaterThan(d + 150);
    }
  });
});

describe('Difficulty', () => {
  it('ramps speed up from the start speed and caps it', () => {
    expect(speedAt(0)).toBe(CONFIG.speed.start);
    expect(speedAt(10)).toBeGreaterThan(speedAt(5));
    expect(speedAt(1e6)).toBe(CONFIG.speed.max);
  });

  it('derives gravity and launch speed that hit the requested apex and airtime', () => {
    const { gravity, velocity } = jumpPhysics(2, 0.6);
    expect((velocity * velocity) / (2 * gravity)).toBeCloseTo(2, 6);
    expect((2 * velocity) / gravity).toBeCloseTo(0.6, 6);
  });
});
