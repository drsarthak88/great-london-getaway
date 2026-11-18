import { CONFIG } from '../config';
import type { CoinKind } from './Track';

/**
 * Run scoring. Points come from distance and coins, both scaled by the multiplier
 * at the moment they are earned (so raising it mid-run only affects what follows).
 */
export class Score {
  points = 0;
  /** Coin currency collected this run (sovereigns count 10). */
  coins = 0;
  tokens = 0;
  /** Base 1; missions raise it (Phase 7). */
  multiplier = 1;

  constructor(private readonly cfg = CONFIG) {}

  reset(multiplier = 1): void {
    this.points = 0;
    this.coins = 0;
    this.tokens = 0;
    this.multiplier = multiplier;
  }

  addDistance(units: number): void {
    if (units > 0) this.points += units * this.cfg.score.perMetre * this.multiplier;
  }

  /** Returns the coin value collected. */
  addCoin(kind: CoinKind): number {
    if (kind === 'power') return 0;
    if (kind === 'token') {
      this.tokens++;
      return 0;
    }
    const value = kind === 'sovereign' ? this.cfg.coins.sovereignValue : this.cfg.coins.pennyValue;
    this.coins += value;
    this.points += value * this.cfg.score.perCoin * this.multiplier;
    return value;
  }

  get total(): number {
    return Math.floor(this.points);
  }
}
