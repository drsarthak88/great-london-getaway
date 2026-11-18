import { CONFIG } from '../config';
import { damp } from '../utils/math';

/**
 * How far Inspector Bones is behind Jack, and the stumble rule. Pure logic.
 * He bursts out after Jack at the start of each run, then drops back out of view;
 * a stumble brings him right up behind, and a second one within the window is a catch.
 */
export type StumbleResult = 'warned' | 'caught';

export class Chase {
  gap: number = CONFIG.detective.farGap;
  private closeTimer = 0;
  /** Seconds left in which a second stumble means getting caught. */
  stumbleTimer = 0;

  constructor(private readonly cfg = CONFIG.detective) {}

  /** Place him at a fixed gap immediately (e.g. on the start screen). */
  reset(gap: number = this.cfg.farGap): void {
    this.gap = gap;
    this.closeTimer = 0;
    this.stumbleTimer = 0;
  }

  /**
   * Jack stumbled. The first time Bones catches right up and stays close for the
   * stumble window; a second stumble inside that window is a catch.
   */
  stumble(window: number = CONFIG.stumble.window): StumbleResult {
    if (this.stumbleTimer > 0) return 'caught';
    this.stumbleTimer = window;
    this.pullClose(window);
    return 'warned';
  }

  /** Corgi Pal barks him back: forget the last stumble and drop back. */
  knockBack(): void {
    this.stumbleTimer = 0;
    this.closeTimer = 0;
  }

  /** Close the gap for the catch scene. */
  grab(dt: number, gap: number): void {
    this.gap = damp(this.gap, gap, 6, dt);
  }

  /** Bring him right up behind Jack for `seconds`. */
  pullClose(seconds: number): void {
    this.closeTimer = Math.max(this.closeTimer, seconds);
  }

  get isClose(): boolean {
    return this.closeTimer > 0;
  }

  get visible(): boolean {
    return this.gap < this.cfg.hideGap;
  }

  update(dt: number): void {
    if (this.stumbleTimer > 0) this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    if (this.closeTimer > 0) {
      this.closeTimer = Math.max(0, this.closeTimer - dt);
      this.gap = damp(this.gap, this.cfg.closeGap, this.cfg.approachRate, dt);
    } else {
      this.gap = damp(this.gap, this.cfg.farGap, this.cfg.retreatRate, dt);
    }
  }
}
