import { describe, expect, it } from 'vitest';
import { PlayerController } from '../src/entities/PlayerController';
import { CONFIG } from '../src/config';

const DT = 1 / 60;

function step(p: PlayerController, seconds: number): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    p.clearEvents();
    p.update(DT);
  }
}

describe('PlayerController lanes', () => {
  it('slides to the target lane within the configured lane-change time', () => {
    const p = new PlayerController();
    expect(p.move(1)).toBe(true);
    expect(p.lane).toBe(1);
    step(p, CONFIG.lanes.changeTime + 2 * DT);
    expect(p.x).toBeCloseTo(CONFIG.lanes.width, 5);
  });

  it('refuses to move past the edge and flags the bump', () => {
    const p = new PlayerController();
    p.move(-1);
    expect(p.move(-1)).toBe(false);
    expect(p.bumpedEdge).toBe(true);
    expect(p.lane).toBe(-1);
  });

  it('allows changing lane mid-air', () => {
    const p = new PlayerController();
    p.jump();
    step(p, 0.1);
    expect(p.airborne).toBe(true);
    expect(p.move(1)).toBe(true);
    step(p, 0.2);
    expect(p.x).toBeCloseTo(CONFIG.lanes.width, 5);
  });
});

describe('PlayerController jumping', () => {
  it('reaches the configured apex and lands after the configured airtime', () => {
    const p = new PlayerController();
    expect(p.jump()).toBe(true);
    let apex = 0;
    let t = 0;
    while (p.airborne && t < 3) {
      p.clearEvents();
      p.update(DT);
      t += DT;
      apex = Math.max(apex, p.y);
    }
    expect(apex).toBeCloseTo(CONFIG.player.jumpHeight, 1);
    expect(t).toBeCloseTo(CONFIG.player.jumpDuration, 1);
    expect(p.justLanded).toBe(true);
    expect(p.y).toBe(0);
  });

  it('cannot double-jump', () => {
    const p = new PlayerController();
    p.jump();
    step(p, 0.1);
    expect(p.jump()).toBe(false);
  });

  it('scales jump height with the jump multiplier (Spring Tail)', () => {
    const p = new PlayerController();
    p.jumpMultiplier = 3;
    p.jump();
    let apex = 0;
    for (let i = 0; i < 300 && (p.airborne || i === 0); i++) {
      p.update(DT);
      apex = Math.max(apex, p.y);
    }
    expect(apex).toBeCloseTo(CONFIG.player.jumpHeight * 3, 0);
  });

  it('falls when the ground drops away (walking off a roof)', () => {
    const p = new PlayerController();
    p.groundY = 3;
    p.update(DT);
    expect(p.y).toBe(3);
    p.groundY = 0;
    p.update(DT);
    expect(p.airborne).toBe(true);
    step(p, 1);
    expect(p.grounded).toBe(true);
    expect(p.y).toBe(0);
  });
});

describe('PlayerController rolling', () => {
  it('rolls for the configured duration with a shorter collider', () => {
    const p = new PlayerController();
    p.roll();
    expect(p.rolling).toBe(true);
    expect(p.height).toBe(CONFIG.player.rollHeight);
    step(p, CONFIG.player.rollDuration + 2 * DT);
    expect(p.rolling).toBe(false);
    expect(p.height).toBe(CONFIG.player.standHeight);
  });

  it('jumping cancels a roll', () => {
    const p = new PlayerController();
    p.roll();
    expect(p.jump()).toBe(true);
    expect(p.rolling).toBe(false);
  });

  it('swiping down mid-air slams down and rolls on landing', () => {
    const p = new PlayerController();
    p.jump();
    step(p, 0.15);
    p.roll();
    expect(p.vy).toBeLessThanOrEqual(-CONFIG.player.fastFallSpeed);
    let landedRolling = false;
    for (let i = 0; i < 60; i++) {
      p.clearEvents();
      p.update(DT);
      if (p.justLanded) {
        landedRolling = p.rolling;
        break;
      }
    }
    expect(landedRolling).toBe(true);
  });
});
