import { CONFIG } from '../config';
import type { Coin } from '../game/Track';

/**
 * Teacup Magnet: coins near Jack (any lane, a little way ahead) fly toward him.
 * Moves them in track space; the normal pickup check then collects them.
 * Power-up pickups and Teapot Tokens are not pulled.
 */
export function magnetPull(coins: readonly Coin[], x: number, y: number, d: number, dt: number, cfg = CONFIG.powerups): void {
  const step = cfg.magnetSpeed * dt;
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    if (!c.active || c.kind === 'power' || c.kind === 'token') continue;
    const ahead = c.d - d;
    if (ahead > cfg.magnetAhead || ahead < -1 || Math.abs(c.x - x) > cfg.magnetReach) continue;
    const dx = x - c.x;
    const dy = y - c.y;
    const dd = d - c.d;
    const len = Math.hypot(dx, dy, dd);
    if (len < 1e-3) continue;
    const k = Math.min(1, step / len);
    c.x += dx * k;
    c.y += dy * k;
    c.d += dd * k;
    c.pulled = true;
  }
}
