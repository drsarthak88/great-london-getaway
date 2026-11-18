import { CONFIG } from '../config';
import type { Coin } from './Track';

/**
 * Collect every coin within reach of the player. Calls `onCollect` for each and
 * deactivates it. `reachScale` > 1 widens the grab (Teacup Magnet uses its own pull).
 */
export function collectCoins(
  coins: readonly Coin[],
  x: number,
  feetY: number,
  height: number,
  d: number,
  onCollect: (c: Coin) => void,
  reachScale = 1,
): number {
  const rx = CONFIG.coins.reachX * reachScale;
  const rd = CONFIG.coins.reachD * reachScale;
  let n = 0;
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i];
    if (!c.active) continue;
    if (Math.abs(c.d - d) > rd || Math.abs(c.x - x) > rx) continue;
    if (c.y < feetY - 0.3 || c.y > feetY + height + 0.45) continue;
    c.active = false;
    onCollect(c);
    n++;
  }
  return n;
}
