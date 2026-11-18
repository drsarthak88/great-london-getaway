import { describe, expect, it } from 'vitest';
import { PATTERNS, type Pattern } from '../src/data/patterns';
import { OBSTACLES, passMove } from '../src/game/ObstacleTypes';
import { CONFIG } from '../src/config';

/**
 * Is there a route through the pattern? Walk forward in small steps; in each lane a
 * position is passable unless something that can only be gone round covers it.
 * Buses count as passable when reached by a ramp or another roof directly before them.
 * Changing lane needs the destination clear for a lane-change distance.
 */
function blockedMap(p: Pattern, step: number): boolean[][] {
  const n = Math.ceil((p.length + 12) / step);
  const blocked = [0, 1, 2].map(() => new Array<boolean>(n).fill(false));
  for (let slot = 0; slot < 3; slot++) {
    const items = p.items.filter((i) => i.slot === slot).sort((a, b) => a.at - b.at);
    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      const spec = OBSTACLES[it.kind];
      let passable = passMove(it.kind) !== 'none';
      if (it.kind === 'bus' && !it.oncoming && k > 0) {
        const before = items[k - 1];
        const end = before.at + OBSTACLES[before.kind].length;
        if ((before.kind === 'ramp' || (before.kind === 'bus' && !before.oncoming)) && it.at - end <= 1 && it.at >= end - 0.01) {
          passable = before.kind === 'ramp' || !blockedAt(blocked[slot], before.at, step);
        }
      }
      if (it.oncoming) passable = false;
      if (passable) continue;
      for (let d = it.at; d <= it.at + spec.length; d += step / 2) {
        const i = Math.floor(d / step);
        if (i >= 0 && i < n) blocked[slot][i] = true;
      }
    }
  }
  return blocked;
}

function blockedAt(row: boolean[], at: number, step: number): boolean {
  return row[Math.floor(at / step)] ?? false;
}

function solvable(p: Pattern): boolean {
  const step = 0.5;
  const laneChange = 5; // ~0.14 s per lane at top speed
  const blocked = blockedMap(p, step);
  const n = blocked[0].length;
  let reach = [true, true, true];
  for (let i = 0; i < n - 1; i++) {
    const next = [false, false, false];
    for (let l = 0; l < 3; l++) {
      if (!reach[l]) continue;
      if (!blocked[l][i + 1]) next[l] = true;
      for (const nl of [l - 1, l + 1]) {
        if (nl < 0 || nl > 2) continue;
        let clear = true;
        for (let k = i; k < Math.min(n, i + laneChange / step); k++) if (blocked[nl][k]) clear = false;
        if (clear) next[nl] = true;
      }
    }
    reach = next;
    if (!reach.some(Boolean)) return false;
  }
  return true;
}

describe('obstacle patterns', () => {
  it('have unique ids and sensible weights', () => {
    const ids = new Set(PATTERNS.map((p) => p.id));
    expect(ids.size).toBe(PATTERNS.length);
    for (const p of PATTERNS) expect(p.weight).toBeGreaterThan(0);
    expect(PATTERNS.some((p) => p.minLevel === 0)).toBe(true);
  });

  for (const p of PATTERNS) {
    it(`"${p.id}" always leaves a way through`, () => {
      expect(solvable(p)).toBe(true);
    });
  }

  it('never asks for two jumps in one lane closer than a top-speed jump is long', () => {
    // Airtime x top speed: closer than this, there are speeds where Jack is still in the
    // air from the first jump when he must jump the second, yet can't clear both at once.
    const longest = CONFIG.player.jumpDuration * CONFIG.speed.max + 1;
    for (const p of PATTERNS) {
      for (let slot = 0; slot < 3; slot++) {
        const jumps = p.items.filter((i) => i.slot === slot && passMove(i.kind) === 'jump' && !i.oncoming).map((i) => i.at).sort((a, b) => a - b);
        for (let k = 1; k < jumps.length; k++) expect(jumps[k] - jumps[k - 1], `${p.id} slot ${slot}`).toBeGreaterThanOrEqual(longest);
      }
    }
  });

  it('the solver does catch an impossible wall', () => {
    const wall: Pattern = {
      id: 'wall',
      length: 10,
      minLevel: 0,
      weight: 1,
      items: [
        { kind: 'bus', slot: 0, at: 0 },
        { kind: 'guard', slot: 1, at: 2 },
        { kind: 'phoneBox', slot: 2, at: 2 },
      ],
      coins: [],
    };
    expect(solvable(wall)).toBe(false);
  });
});
