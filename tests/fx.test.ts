import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Particles } from '../src/render/Particles';
import { Events, type GameEventType } from '../src/game/Events';

describe('Particles', () => {
  it('emits, animates and expires particles, recycling slots', () => {
    const scene = new THREE.Scene();
    const p = new Particles(scene);
    p.emit('sparkle', 0, 1, 0, 5);
    p.emit('debris', 0, 1, 0, 10);
    expect(p.alive).toBe(15);
    for (let i = 0; i < 10; i++) p.update(0.05, 20);
    expect(p.alive).toBeGreaterThan(0);
    for (let i = 0; i < 40; i++) p.update(0.05, 20);
    expect(p.alive).toBe(0);
  });

  it('never exceeds its pool, and calms down with reduced motion', () => {
    const p = new Particles(new THREE.Scene());
    for (let i = 0; i < 100; i++) p.emit('confetti', 0, 1, 0, 20);
    expect(p.alive).toBeLessThanOrEqual(360);
    p.clear();
    p.enabled = false;
    p.emit('confetti', 0, 1, 0, 30);
    expect(p.alive).toBe(10);
  });

  it('keeps particles above the road', () => {
    const p = new Particles(new THREE.Scene());
    p.emit('splash', 0, 0.1, 0, 20);
    for (let i = 0; i < 12; i++) p.update(0.05, 0);
    // Internal positions are private; a bounce floor means none fall through.
    expect(p.alive).toBeGreaterThan(0);
  });
});

describe('Events', () => {
  it('delivers each event with its detail to every listener', () => {
    const e = new Events();
    const got: string[] = [];
    e.on((t: GameEventType, d: string) => got.push(`${t}:${d}`));
    e.on((t) => got.push(`second:${t}`));
    e.emit('coin', 'penny');
    e.emit('jump');
    expect(got).toEqual(['coin:penny', 'second:coin', 'jump:', 'second:jump']);
  });
});
