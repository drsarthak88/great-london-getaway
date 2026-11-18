import { CONFIG } from '../config';
import { jumpPhysics } from '../game/Difficulty';
import { laneX, stepLane, type Lane } from '../game/Lanes';

type PlayerTuning = {
  jumpHeight: number;
  jumpDuration: number;
  fastFallSpeed: number;
  rollDuration: number;
  standHeight: number;
  rollHeight: number;
};

/**
 * Pure movement state for Marmalade Jack: lanes, jumping, rolling and falling.
 * No Three.js in here, so it is fully unit-testable; the Player view reads from it.
 *
 * Coordinates: x is sideways (lanes), y is up (feet height). Forward motion is
 * handled by the world scrolling, so the player has no z.
 */
export class PlayerController {
  lane: Lane = 0;
  /** Lane before the most recent lane change (for bouncing back off a side hit). */
  prevLane: Lane = 0;
  x = 0;
  /** Sideways velocity from the last update (for lean animation). */
  vx = 0;
  y = 0;
  vy = 0;
  grounded = true;
  /** Height of whatever surface is under the player (road = 0, bus roof > 0). */
  groundY = 0;

  rolling = false;
  rollTimer = 0;
  /** Swiped down mid-air: roll as soon as we land. */
  rollQueued = false;

  /** Multipliers that power-ups change (Spring Tail, Brolly Glide). */
  jumpMultiplier = 1;
  gravityMultiplier = 1;

  /** One-frame event flags, valid until the next clearEvents(). */
  justJumped = false;
  justLanded = false;
  justChangedLane = false;
  /** Set when a lane change was refused because we are already at the edge. */
  bumpedEdge = false;

  private gravity: number;
  private jumpVelocity: number;
  private readonly laneSpeed: number;

  constructor(private readonly tuning: PlayerTuning = CONFIG.player, private readonly laneWidth: number = CONFIG.lanes.width) {
    const p = jumpPhysics(tuning.jumpHeight, tuning.jumpDuration);
    this.gravity = p.gravity;
    this.jumpVelocity = p.velocity;
    this.laneSpeed = laneWidth / CONFIG.lanes.changeTime;
  }

  reset(): void {
    this.lane = 0;
    this.prevLane = 0;
    this.x = 0;
    this.vx = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.groundY = 0;
    this.rolling = false;
    this.rollTimer = 0;
    this.rollQueued = false;
    this.jumpMultiplier = 1;
    this.gravityMultiplier = 1;
    this.clearEvents();
  }

  /** Current collider height (shrinks while rolling). */
  get height(): number {
    return this.rolling ? this.tuning.rollHeight : this.tuning.standHeight;
  }

  get airborne(): boolean {
    return !this.grounded;
  }

  /** Request a lane change; allowed on the ground and mid-air. Returns true if it moved. */
  move(dir: -1 | 1): boolean {
    const next = stepLane(this.lane, dir);
    if (next === this.lane) {
      this.bumpedEdge = true;
      return false;
    }
    this.prevLane = this.lane;
    this.lane = next;
    this.justChangedLane = true;
    return true;
  }

  /** Knocked back toward the lane we came from after clipping something's side. */
  bounceBack(): void {
    if (this.lane !== this.prevLane) {
      const l = this.lane;
      this.lane = this.prevLane;
      this.prevLane = l;
    } else {
      // Already in our lane: nudge back to its centre.
      this.lane = this.prevLane;
    }
  }

  /** Jump if standing (a jump cancels a roll). Returns true if a jump started. */
  jump(): boolean {
    if (!this.grounded) return false;
    this.rolling = false;
    this.rollTimer = 0;
    this.rollQueued = false;
    this.grounded = false;
    // Scaling launch speed by sqrt(k) scales apex height by k.
    this.vy = this.jumpVelocity * Math.sqrt(this.jumpMultiplier);
    this.justJumped = true;
    return true;
  }

  /** Roll on the ground; in the air, slam down quickly and roll on landing. */
  roll(): void {
    if (this.grounded) {
      this.rolling = true;
      this.rollTimer = this.tuning.rollDuration;
    } else {
      this.vy = Math.min(this.vy, -this.tuning.fastFallSpeed);
      this.rollQueued = true;
    }
  }

  update(dt: number): void {
    // --- Sideways: slide at constant speed toward the target lane.
    const tx = laneX(this.lane, this.laneWidth);
    const prevX = this.x;
    const maxStep = this.laneSpeed * dt;
    const dx = tx - this.x;
    this.x = Math.abs(dx) <= maxStep ? tx : this.x + Math.sign(dx) * maxStep;
    this.vx = dt > 0 ? (this.x - prevX) / dt : 0;

    // --- Walked off a ledge (e.g. the end of a bus roof): start falling.
    if (this.grounded && this.y > this.groundY + 1e-3) {
      this.grounded = false;
      this.vy = 0;
    }

    // --- Vertical.
    if (!this.grounded) {
      // Exact for constant gravity, so jump height doesn't depend on frame rate.
      const g = this.gravity * this.gravityMultiplier;
      this.y += this.vy * dt - 0.5 * g * dt * dt;
      this.vy -= g * dt;
      if (this.y <= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.grounded = true;
        this.justLanded = true;
        if (this.rollQueued) {
          this.rollQueued = false;
          this.rolling = true;
          this.rollTimer = this.tuning.rollDuration;
        }
      }
    } else {
      // Stepping up onto a ramp/roof is handled by the world raising groundY.
      this.y = this.groundY;
    }

    // --- Roll timer.
    if (this.rolling) {
      this.rollTimer -= dt;
      if (this.rollTimer <= 0) {
        this.rollTimer = 0;
        this.rolling = false;
      }
    }
  }

  /** Reset one-frame event flags. Call once per frame, before handling input. */
  clearEvents(): void {
    this.justJumped = false;
    this.justLanded = false;
    this.justChangedLane = false;
    this.bumpedEdge = false;
  }
}
