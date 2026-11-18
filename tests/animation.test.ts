import { describe, expect, it } from 'vitest';
import { CharacterAnimator, selectMode, strideRate, type AnimInput } from '../src/entities/CharacterAnimator';
import { CAT_STYLE, blendPoses, holdMagnifier, runPose } from '../src/entities/Poses';
import { J, makePose } from '../src/models/Biped';

const base: AnimInput = { running: true, grounded: true, rolling: false, rollProgress: 0, vy: 0, speed: 15 };

describe('selectMode', () => {
  it('picks the dominant pose from movement state', () => {
    expect(selectMode({ running: false, grounded: true, rolling: false })).toBe('idle');
    expect(selectMode({ running: true, grounded: true, rolling: false })).toBe('run');
    expect(selectMode({ running: true, grounded: false, rolling: false })).toBe('air');
    expect(selectMode({ running: true, grounded: true, rolling: true })).toBe('roll');
  });
});

describe('run cycle', () => {
  it('legs pump faster at higher speed', () => {
    expect(strideRate(30)).toBeGreaterThan(strideRate(15));
  });

  it('swings legs and arms in opposition', () => {
    const p = makePose();
    runPose(p, Math.PI / 2, CAT_STYLE);
    expect(p[J.thL]).toBeGreaterThan(0);
    expect(p[J.thR]).toBeLessThan(0);
    // Left leg forward goes with left arm back.
    expect(p[J.shLPitch]).toBeLessThan(0);
  });
});

describe('CharacterAnimator', () => {
  it('blends smoothly: a single frame after take-off is still mostly the run pose', () => {
    const a = new CharacterAnimator(CAT_STYLE, 0.5);
    for (let i = 0; i < 120; i++) a.update(1 / 60, base);
    const runThigh = a.pose[J.thL];
    a.update(1 / 60, { ...base, grounded: false, vy: 8 });
    expect(a.mode).toBe('air');
    // Jump pose tucks the left thigh to 1.25; one frame in we should be well short of it.
    expect(Math.abs(a.pose[J.thL] - runThigh)).toBeLessThan(0.5);
    for (let i = 0; i < 60; i++) a.update(1 / 60, { ...base, grounded: false, vy: 8 });
    expect(a.pose[J.thL]).toBeCloseTo(1.25, 1);
  });

  it('somersaults once per roll and is upright before and after', () => {
    const a = new CharacterAnimator(CAT_STYLE, 0.5);
    a.update(1 / 60, { ...base, rolling: true, rollProgress: 0 });
    expect(a.spin).toBeCloseTo(0, 6);
    a.update(1 / 60, { ...base, rolling: true, rollProgress: 0.5 });
    expect(a.spin).toBeCloseTo(-Math.PI, 6);
    a.update(1 / 60, base);
    expect(a.spin).toBe(0);
  });

  it('does not advance the run cycle while paused (dt = 0)', () => {
    const a = new CharacterAnimator(CAT_STYLE, 0.5);
    a.update(1 / 60, base);
    const phase = a.phase;
    a.update(0, base);
    expect(a.phase).toBe(phase);
  });
});

describe('pose helpers', () => {
  it('blends with weights', () => {
    const p1 = makePose();
    const p2 = makePose();
    p1[J.thL] = 1;
    p2[J.thL] = 3;
    const out = makePose();
    blendPoses(out, [p1, p2], new Float32Array([0.25, 0.75]));
    expect(out[J.thL]).toBeCloseTo(2.5, 6);
  });

  it('holdMagnifier raises the right arm without touching the left', () => {
    const p = makePose();
    runPose(p, 1, CAT_STYLE);
    const left = p[J.shLPitch];
    holdMagnifier(p, 1);
    expect(p[J.shRPitch]).toBeCloseTo(1.75, 6);
    expect(p[J.shLPitch]).toBe(left);
  });
});
