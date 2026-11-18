import { describe, expect, it } from 'vitest';
import { classifyHit, groundHeight, surfaceTop, type PlayerBox } from '../src/game/Collision';
import { Obstacle, type ObstacleKind } from '../src/game/ObstacleTypes';
import { CONFIG } from '../src/config';

const P = CONFIG.player;
const box = (x: number, y: number, d: number, rolling = false): PlayerBox => ({
  x,
  y,
  d,
  halfW: P.halfWidth,
  halfD: P.halfDepth,
  height: rolling ? P.rollHeight : P.standHeight,
});
const obs = (kind: ObstacleKind, x: number, d: number): Obstacle => new Obstacle().set(kind, Math.round(x / 2.5), x, d);

describe('head-on hits', () => {
  it('running straight into a bus is a crash', () => {
    const o = obs('bus', 0, 10);
    expect(classifyHit(o, box(0, 0, 9.5), box(0, 0, 9.8))).toBe('crash');
  });

  it('running into pigeons is only a stumble (they are soft)', () => {
    const o = obs('pigeons', 0, 10);
    expect(classifyHit(o, box(0, 0, 9.5), box(0, 0, 9.8))).toBe('stumble');
  });

  it('clipping the corner of something while sliding past is a bounce, not a crash', () => {
    const o = obs('phoneBox', 0, 10);
    // Player mostly in the next lane: only a sliver overlaps the box.
    expect(classifyHit(o, box(0.95, 0, 9.5), box(0.95, 0, 9.8))).toBe('bounce');
  });

  it('a Royal Guard cannot be jumped (too tall)', () => {
    const o = obs('guard', 0, 10);
    expect(classifyHit(o, box(0, 2.0, 9.5), box(0, 2.0, 9.8))).toBe('crash');
  });
});

describe('getting past things', () => {
  it('jumping clears a barrier', () => {
    const o = obs('barrier', 0, 10);
    expect(classifyHit(o, box(0, 1.2, 9.6), box(0, 1.2, 10.1))).toBe('none');
  });

  it('rolling passes under a Mind the Gap sign but standing crashes into it', () => {
    const o = obs('sign', 0, 10);
    expect(classifyHit(o, box(0, 0, 9.5, true), box(0, 0, 9.8, true))).toBe('none');
    expect(classifyHit(o, box(0, 0, 9.5), box(0, 0, 9.8))).toBe('crash');
  });

  it('a mid-jump landing on a cab roof steps up instead of crashing', () => {
    const o = obs('cab', 0, 10);
    expect(classifyHit(o, box(0, 1.5, 9.5), box(0, 1.5, 9.8))).toBe('none');
  });

  it('walking up a ramp never counts as a hit', () => {
    const o = obs('ramp', 0, 10);
    for (let d = 9.5; d < 15; d += 0.25) {
      const top = surfaceTop(o, d);
      expect(classifyHit(o, box(0, top, d - 0.25), box(0, top, d))).toBe('none');
    }
  });

  it('a different lane is never hit', () => {
    const o = obs('bus', 2.5, 10);
    expect(classifyHit(o, box(0, 0, 9.5), box(0, 0, 12))).toBe('none');
  });
});

describe('side hits', () => {
  it('changing lane into the side of a bus is a bounce', () => {
    const o = obs('bus', 2.5, 10);
    expect(classifyHit(o, box(0.8, 0, 14), box(1.8, 0, 14.2))).toBe('bounce');
  });
});

describe('puddles', () => {
  it('splash when run through on the ground, not when jumped', () => {
    const o = obs('puddle', 0, 10);
    expect(classifyHit(o, box(0, 0, 9.5), box(0, 0, 10))).toBe('puddle');
    expect(classifyHit(o, box(0, 1, 9.5), box(0, 1, 10))).toBe('none');
  });

  it('ignores obstacles already hit', () => {
    const o = obs('puddle', 0, 10);
    o.hit = true;
    expect(classifyHit(o, box(0, 0, 9.5), box(0, 0, 10))).toBe('none');
  });
});

describe('groundHeight', () => {
  it('is the road away from platforms', () => {
    expect(groundHeight([obs('bus', 2.5, 10)], 0, 12, 0)).toBe(0);
  });

  it('rises up a ramp and continues onto the bus roof', () => {
    const list = [obs('ramp', 0, 10), obs('bus', 0, 15)];
    expect(groundHeight(list, 0, 12.5, 1.8)).toBeCloseTo(1.875, 3);
    expect(groundHeight(list, 0, 16, 3.75)).toBe(3.75);
  });

  it('climbs a ramp even with big per-frame steps (low frame rate, top speed)', () => {
    const list = [obs('ramp', 0, 10), obs('bus', 0, 15)];
    let y = 0;
    let d = 9;
    // Run from before the ramp to the middle of the bus roof (d = 20.2).
    for (let i = 0; i < 8; i++) {
      const prev = d;
      d += 1.4; // 34 units/s at ~24 fps
      y = groundHeight(list, 0, d, y, prev);
    }
    expect(y).toBe(3.75);
  });

  it('does not teleport you onto a roof from the road', () => {
    expect(groundHeight([obs('bus', 0, 10)], 0, 12, 0)).toBe(0);
  });

  it('drops back to the road past the end of the bus', () => {
    expect(groundHeight([obs('bus', 0, 10)], 0, 20, 3.75)).toBe(0);
  });
});
