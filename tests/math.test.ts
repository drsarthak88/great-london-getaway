import { describe, expect, it } from 'vitest';
import { clamp, damp, lerp, remap } from '../src/utils/math';

describe('math utils', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it('lerps', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });

  it('damps toward target independent of frame splitting', () => {
    const oneStep = damp(0, 1, 5, 0.1);
    const twoSteps = damp(damp(0, 1, 5, 0.05), 1, 5, 0.05);
    expect(oneStep).toBeCloseTo(twoSteps, 10);
    expect(oneStep).toBeGreaterThan(0);
    expect(oneStep).toBeLessThan(1);
  });

  it('remaps with clamping and handles a zero-width input range', () => {
    expect(remap(5, 0, 10, 100, 200)).toBe(150);
    expect(remap(20, 0, 10, 100, 200)).toBe(200);
    expect(remap(3, 3, 3, 7, 9)).toBe(7);
  });
});
