import { describe, expect, it } from 'vitest';
import { clampLane, laneAtX, laneX, stepLane } from '../src/game/Lanes';

describe('lanes', () => {
  it('maps lanes to x positions', () => {
    expect(laneX(-1, 2.5)).toBe(-2.5);
    expect(laneX(0, 2.5)).toBe(0);
    expect(laneX(1, 2.5)).toBe(2.5);
  });

  it('steps left and right within the three lanes', () => {
    expect(stepLane(0, -1)).toBe(-1);
    expect(stepLane(0, 1)).toBe(1);
    expect(stepLane(-1, 1)).toBe(0);
  });

  it('does not step past the edges', () => {
    expect(stepLane(-1, -1)).toBe(-1);
    expect(stepLane(1, 1)).toBe(1);
  });

  it('clamps and rounds arbitrary lane values', () => {
    expect(clampLane(5)).toBe(1);
    expect(clampLane(-3)).toBe(-1);
    expect(clampLane(0.4)).toBe(0);
  });

  it('finds the nearest lane for an x position', () => {
    expect(laneAtX(-2.4, 2.5)).toBe(-1);
    expect(laneAtX(1.0, 2.5)).toBe(0);
    expect(laneAtX(1.4, 2.5)).toBe(1);
  });
});
