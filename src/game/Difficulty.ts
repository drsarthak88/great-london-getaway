import { CONFIG } from '../config';

/** Forward speed after `elapsed` seconds of running: a gentle linear ramp, capped. */
export function speedAt(elapsed: number, cfg = CONFIG.speed): number {
  const s = cfg.start + cfg.accel * Math.max(0, elapsed);
  return s > cfg.max ? cfg.max : s;
}

/** Gravity and launch velocity that give the configured jump height and airtime. */
export function jumpPhysics(height: number, duration: number): { gravity: number; velocity: number } {
  // Rising half takes duration/2: h = g t^2 / 2 and v0 = g t.
  const half = duration / 2;
  const gravity = (2 * height) / (half * half);
  return { gravity, velocity: gravity * half };
}
