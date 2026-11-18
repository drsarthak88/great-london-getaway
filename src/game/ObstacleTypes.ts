/**
 * Obstacle kinds and their collision shapes. Pure data: sizes here drive both the
 * collision rules and the procedural models, so what you see is what you hit.
 *
 * Track space: an obstacle occupies lane-centred x ± width/2, heights yMin..height,
 * and track distance [d, d + length] (d is the end nearest the player).
 */
export type ObstacleKind =
  | 'bus'
  | 'cab'
  | 'phoneBox'
  | 'postBox'
  | 'barrier'
  | 'sign'
  | 'pigeons'
  | 'guard'
  | 'puddle'
  | 'ramp';

export interface ObstacleSpec {
  width: number;
  length: number;
  /** Top of the collider (for ramps: the height at the far end). */
  height: number;
  /** Bottom of the collider; > 0 for overhead things you roll under. */
  yMin: number;
  /** You can land on and run along the top. */
  platform: boolean;
  /** Running into it head-on is only a stumble (e.g. a flock of pigeons). */
  soft: boolean;
  /** No collision; triggers an effect when you run through it (puddles). */
  trigger: boolean;
  /** Top surface rises linearly from 0 to `height` along its length. */
  ramp: boolean;
  /** Black Cab Dash smashes straight through it. */
  smashable: boolean;
  /** Cannot be passed in its lane except by going round (or flying over). */
  blocking: boolean;
}

const base: Omit<ObstacleSpec, 'width' | 'length' | 'height'> = {
  yMin: 0,
  platform: false,
  soft: false,
  trigger: false,
  ramp: false,
  smashable: false,
  blocking: false,
};

export const OBSTACLES: Record<ObstacleKind, ObstacleSpec> = {
  bus: { ...base, width: 2.3, length: 9.5, height: 3.75, platform: true, blocking: true },
  cab: { ...base, width: 1.9, length: 4.3, height: 1.95, platform: true },
  phoneBox: { ...base, width: 1.15, length: 1.15, height: 2.75, platform: true, blocking: true },
  postBox: { ...base, width: 0.75, length: 0.75, height: 1.25, platform: true },
  barrier: { ...base, width: 2.3, length: 0.35, height: 1.05, platform: true, smashable: true },
  sign: { ...base, width: 2.4, length: 0.3, yMin: 1.05, height: 2.7, smashable: true },
  pigeons: { ...base, width: 2.0, length: 1.6, yMin: 1.0, height: 2.3, soft: true, smashable: true },
  guard: { ...base, width: 0.9, length: 0.8, height: 2.6, blocking: true },
  puddle: { ...base, width: 2.2, length: 3.2, height: 0.05, trigger: true, smashable: true },
  ramp: { ...base, width: 2.3, length: 5, height: 3.75, platform: true, ramp: true },
};

/** How a lane holding this obstacle can be got past without changing lane. */
export function passMove(kind: ObstacleKind): 'jump' | 'roll' | 'climb' | 'none' | 'free' {
  switch (kind) {
    case 'barrier':
    case 'postBox':
    case 'cab':
    case 'puddle':
      return 'jump';
    case 'sign':
    case 'pigeons':
      return 'roll';
    case 'ramp':
      return 'climb';
    default:
      return 'none';
  }
}

/**
 * One obstacle instance. Instances are pooled and reused, so never hold on to one
 * after it goes inactive.
 */
export class Obstacle {
  active = false;
  kind: ObstacleKind = 'barrier';
  spec: ObstacleSpec = OBSTACLES.barrier;
  lane = 0;
  x = 0;
  /** Near end in track distance. */
  d = 0;
  prevD = 0;
  /** Track velocity (negative = driving toward the player). */
  vel = 0;
  /** Already hit or triggered this run; ignore further contact. */
  hit = false;
  /** Has the player stood on its top (for "jump N buses" missions). */
  stoodOn = false;
  /** Bumped every time the slot is reused, so views can tell a respawn apart. */
  gen = 0;

  set(kind: ObstacleKind, lane: number, x: number, d: number, vel = 0): this {
    this.active = true;
    this.gen++;
    this.kind = kind;
    this.spec = OBSTACLES[kind];
    this.lane = lane;
    this.x = x;
    this.d = d;
    this.prevD = d;
    this.vel = vel;
    this.hit = false;
    this.stoodOn = false;
    return this;
  }

  get far(): number {
    return this.d + this.spec.length;
  }
}
