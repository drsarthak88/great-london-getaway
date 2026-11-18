import { makePose, type Pose } from '../models/Biped';
import { blendPoses, fallPose, idlePose, jumpPose, rollPose, runPose, surrenderPose, type PoseStyle } from './Poses';
import { clamp, damp } from '../utils/math';

export type AnimMode = 'idle' | 'run' | 'air' | 'roll' | 'caught';

export interface AnimInput {
  /** False while waiting on the title/ready screen. */
  running: boolean;
  grounded: boolean;
  rolling: boolean;
  /** 0..1 through the current roll. */
  rollProgress: number;
  /** Vertical velocity (positive = rising). */
  vy: number;
  /** Forward speed, drives the run cycle rate. */
  speed: number;
  /** The catch scene is playing. */
  caught?: boolean;
}

/** Which key pose should dominate for a given movement state. */
export function selectMode(s: Pick<AnimInput, 'running' | 'grounded' | 'rolling' | 'caught'>): AnimMode {
  if (s.caught) return 'caught';
  if (s.rolling) return 'roll';
  if (!s.grounded) return 'air';
  return s.running ? 'run' : 'idle';
}

/** Run-cycle angular rate (radians/s) for a forward speed. Faster running, faster legs. */
export function strideRate(speed: number): number {
  return 6 + speed * 0.35;
}

const MODES: AnimMode[] = ['idle', 'run', 'air', 'roll', 'caught'];
const BLEND_RATE: Record<AnimMode, number> = { idle: 8, run: 12, air: 16, roll: 22, caught: 10 };

/**
 * Blends procedural key poses with smoothed weights so transitions (take-off, landing,
 * tucking into a roll) ease rather than snap. Owns all its scratch arrays: no garbage.
 */
export class CharacterAnimator {
  readonly pose = makePose();
  /** Forward somersault angle while rolling (applied on top of the pose). */
  spin = 0;
  phase = 0;
  time = 0;
  mode: AnimMode = 'idle';

  private readonly poses: Pose[] = [makePose(), makePose(), makePose(), makePose(), makePose()];
  private readonly jumpTmp = makePose();
  private readonly fallTmp = makePose();
  private readonly weights = new Float32Array([1, 0, 0, 0, 0]);

  constructor(
    private readonly style: PoseStyle,
    private readonly hipHeight: number,
    /** Pose for the catch scene (Jack surrenders; Bones grabs). */
    private readonly caughtPose: (out: Pose, t: number) => void = surrenderPose,
  ) {}

  reset(): void {
    this.weights.set([1, 0, 0, 0, 0]);
    this.phase = 0;
    this.spin = 0;
    this.mode = 'idle';
  }

  update(dt: number, s: AnimInput): Pose {
    this.time += dt;
    if (s.running && s.grounded && !s.rolling) this.phase += dt * strideRate(s.speed);
    this.mode = selectMode(s);

    const idle = this.poses[0];
    const run = this.poses[1];
    const air = this.poses[2];
    const roll = this.poses[3];
    idlePose(idle, this.time);
    runPose(run, this.phase, this.style);
    jumpPose(this.jumpTmp);
    fallPose(this.fallTmp);
    const f = clamp(0.5 - s.vy * 0.08, 0, 1);
    for (let i = 0; i < air.length; i++) air[i] = this.jumpTmp[i] + (this.fallTmp[i] - this.jumpTmp[i]) * f;
    rollPose(roll, this.hipHeight);
    this.caughtPose(this.poses[4], this.time);

    const rate = BLEND_RATE[this.mode];
    let sum = 0;
    for (let i = 0; i < MODES.length; i++) {
      const target = MODES[i] === this.mode ? 1 : 0;
      this.weights[i] = dt > 0 ? damp(this.weights[i], target, rate, dt) : this.weights[i];
      sum += this.weights[i];
    }
    for (let i = 0; i < MODES.length; i++) this.weights[i] /= sum;
    blendPoses(this.pose, this.poses, this.weights);

    // One full forward flip per roll; at 2π it is visually identical to 0, so no pop.
    this.spin = s.rolling ? -Math.PI * 2 * clamp(s.rollProgress, 0, 1) : 0;
    return this.pose;
  }
}
