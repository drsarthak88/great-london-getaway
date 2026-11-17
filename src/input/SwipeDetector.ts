export type SwipeDir = 'left' | 'right' | 'up' | 'down';

/**
 * Turns a single pointer's path into at most one swipe, decided as soon as the finger
 * has travelled far enough (not on release) so controls feel instant.
 * Pure logic: feed it coordinates and times, read back results.
 */
export class SwipeDetector {
  private active = false;
  private startX = 0;
  private startY = 0;
  private startT = 0;
  private fired = false;

  constructor(public threshold: number, public tapMaxMs = 300) {}

  begin(x: number, y: number, t: number): void {
    this.active = true;
    this.fired = false;
    this.startX = x;
    this.startY = y;
    this.startT = t;
  }

  /** Returns a direction the first time the gesture crosses the threshold, else null. */
  move(x: number, y: number): SwipeDir | null {
    if (!this.active || this.fired) return null;
    const dx = x - this.startX;
    const dy = y - this.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx < this.threshold && ady < this.threshold) return null;
    this.fired = true;
    // Screen y grows downward, so a negative dy is an upward swipe.
    if (adx > ady) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  /** Ends the gesture. Returns 'tap' for a short touch that never became a swipe. */
  end(x: number, y: number, t: number): SwipeDir | 'tap' | null {
    if (!this.active) return null;
    // A fast flick can start and finish between move events; classify it on release.
    const late = this.move(x, y);
    this.active = false;
    if (late) return late;
    if (!this.fired && t - this.startT <= this.tapMaxMs) return 'tap';
    return null;
  }

  cancel(): void {
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }
}
