import { CONFIG } from '../config';

export type PowerKind = 'helicopter' | 'spring' | 'brolly' | 'magnet' | 'helmet' | 'cabDash' | 'teaTime' | 'corgi';

export const POWER_KINDS: readonly PowerKind[] = ['helicopter', 'spring', 'brolly', 'magnet', 'helmet', 'cabDash', 'teaTime', 'corgi'];

export const POWER_NAMES: Record<PowerKind, string> = {
  helicopter: 'Helicopter Tail',
  spring: 'Spring Tail',
  brolly: 'Brolly Glide',
  magnet: 'Teacup Magnet',
  helmet: "Bobby's Helmet",
  cabDash: 'Black Cab Dash',
  teaTime: 'Tea Time',
  corgi: 'Corgi Pal',
};

/**
 * Power-ups that change how Jack moves. Only one can be active at a time; picking up
 * another replaces it. The rest (magnet, helmet, tea time, corgi) stack freely.
 */
export const MOVEMENT_POWERS: readonly PowerKind[] = ['helicopter', 'spring', 'brolly', 'cabDash'];

export type PowerLevels = Partial<Record<PowerKind, number>>;

/** Duration of a power-up after shop upgrades. */
export function powerDuration(kind: PowerKind, level = 0, cfg = CONFIG.powerups): number {
  const l = Math.max(0, Math.min(cfg.maxLevel, level));
  return cfg.duration[kind] * (1 + cfg.upgradeStep * l);
}

/**
 * Active power-up timers. Pure logic: the game asks what is active and reacts to the
 * started/ended events. Timers run on real time, so Tea Time doesn't stretch itself.
 */
export class PowerUps {
  private readonly remaining: Record<PowerKind, number> = { helicopter: 0, spring: 0, brolly: 0, magnet: 0, helmet: 0, cabDash: 0, teaTime: 0, corgi: 0 };
  private readonly total: Record<PowerKind, number> = { ...this.remaining };
  levels: PowerLevels = {};

  /** Called when a power-up ends (timed out, replaced, or used up). */
  onEnd: (kind: PowerKind) => void = () => {};

  reset(): void {
    for (const k of POWER_KINDS) {
      this.remaining[k] = 0;
      this.total[k] = 0;
    }
  }

  activate(kind: PowerKind): void {
    if (MOVEMENT_POWERS.includes(kind)) {
      for (const other of MOVEMENT_POWERS) if (other !== kind && this.remaining[other] > 0) this.end(other);
    }
    const d = powerDuration(kind, this.levels[kind] ?? 0);
    this.remaining[kind] = d;
    this.total[kind] = d;
  }

  isActive(kind: PowerKind): boolean {
    return this.remaining[kind] > 0;
  }

  /** Seconds left. */
  timeLeft(kind: PowerKind): number {
    return this.remaining[kind];
  }

  /** 1 when just picked up, falling to 0 as it runs out. */
  fraction(kind: PowerKind): number {
    return this.total[kind] > 0 ? this.remaining[kind] / this.total[kind] : 0;
  }

  /** End a power-up early (e.g. the helmet absorbing a hit). */
  end(kind: PowerKind): void {
    if (this.remaining[kind] <= 0) return;
    this.remaining[kind] = 0;
    this.onEnd(kind);
  }

  /** End every active power-up (firing onEnd for each), e.g. when Jack is caught. */
  endAll(): void {
    for (const k of POWER_KINDS) this.end(k);
  }

  /** The helmet takes the hit: returns true if a shield was there to use. */
  consumeShield(): boolean {
    if (!this.isActive('helmet')) return false;
    this.end('helmet');
    return true;
  }

  update(realDt: number): void {
    for (const k of POWER_KINDS) {
      if (this.remaining[k] <= 0) continue;
      this.remaining[k] -= realDt;
      if (this.remaining[k] <= 0) {
        this.remaining[k] = 0;
        this.onEnd(k);
      }
    }
  }
}

/** Weighted random pick of which power-up to place on the road. */
export function pickPower(r: number, weights = CONFIG.powerups.weights): PowerKind {
  let total = 0;
  for (const k of POWER_KINDS) total += weights[k];
  let x = r * total;
  for (const k of POWER_KINDS) {
    x -= weights[k];
    if (x <= 0) return k;
  }
  return POWER_KINDS[POWER_KINDS.length - 1];
}
