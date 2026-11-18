import { CONFIG } from '../config';
import { mulberry32 } from '../utils/random';

export type WeatherKind = 'clear' | 'fog' | 'drizzle';

/**
 * Pure weather schedule along the track: clear stretches broken by fog patches and
 * drizzle showers, each fading in and out. Deterministic for a seed.
 */
export class Weather {
  private rng = mulberry32(1);
  /** Current/next event: [start, end) in track distance. */
  start = 0;
  end = 0;
  kind: WeatherKind = 'fog';
  /** Where the most recent drizzle shower ended (for the rainbow afterwards). */
  lastDrizzleEnd = -Infinity;

  constructor(private readonly cfg = CONFIG.weather) {}

  reset(seed: number): void {
    this.rng = mulberry32(seed * 7 + 3);
    this.end = 0;
    this.lastDrizzleEnd = -Infinity;
    this.scheduleAfter(150);
  }

  private scheduleAfter(d: number): void {
    const [g0, g1] = this.cfg.gap;
    const [l0, l1] = this.cfg.length;
    this.start = d + g0 + (g1 - g0) * this.rng();
    this.end = this.start + l0 + (l1 - l0) * this.rng();
    this.kind = this.rng() < 0.5 ? 'fog' : 'drizzle';
  }

  /** Advance the schedule past `d` (call as the run progresses). */
  update(d: number): void {
    while (d >= this.end) {
      if (this.kind === 'drizzle' && this.end > 0) this.lastDrizzleEnd = this.end;
      this.scheduleAfter(this.end);
    }
  }

  /** Strength 0..1 of `kind` at distance d (0 outside the event, ramping at the ends). */
  amount(kind: WeatherKind, d: number): number {
    if (kind === 'clear' || kind !== this.kind || d < this.start || d >= this.end) return 0;
    const r = this.cfg.ramp;
    return Math.min(1, (d - this.start) / r, (this.end - d) / r);
  }

  current(d: number): WeatherKind {
    return d >= this.start && d < this.end ? this.kind : 'clear';
  }
}
