import { CONFIG } from '../config';
import { damp } from '../utils/math';

/**
 * How far Inspector Bones is behind Jack. Pure logic: Phase 4 drives `pullClose()`
 * from stumbles; for now he bursts out after Jack at the start of each run, then
 * drops back out of view.
 */
export class Chase {
  gap: number = CONFIG.detective.farGap;
  private closeTimer = 0;

  constructor(private readonly cfg = CONFIG.detective) {}

  /** Place him at a fixed gap immediately (e.g. on the start screen). */
  reset(gap: number = this.cfg.farGap): void {
    this.gap = gap;
    this.closeTimer = 0;
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
    if (this.closeTimer > 0) {
      this.closeTimer = Math.max(0, this.closeTimer - dt);
      this.gap = damp(this.gap, this.cfg.closeGap, this.cfg.approachRate, dt);
    } else {
      this.gap = damp(this.gap, this.cfg.farGap, this.cfg.retreatRate, dt);
    }
  }
}
