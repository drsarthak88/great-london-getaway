import { J, type Pose } from '../models/Biped';

/**
 * Procedural key poses. Each writes joint angles into `out` (no allocation).
 * `style` lets a character exaggerate or tone down the same motion.
 */
export interface PoseStyle {
  /** Thigh swing amplitude while running. */
  stride: number;
  /** Arm pump amplitude while running. */
  armSwing: number;
  /** Vertical bob while running. */
  bob: number;
  /** Forward lean while running. */
  lean: number;
}

export const CAT_STYLE: PoseStyle = { stride: 0.95, armSwing: 0.9, bob: 0.07, lean: -0.22 };
export const DETECTIVE_STYLE: PoseStyle = { stride: 0.85, armSwing: 1.1, bob: 0.1, lean: -0.3 };

export function runPose(out: Pose, phase: number, s: PoseStyle): void {
  const sn = Math.sin(phase);
  const cs = Math.cos(phase);
  out[J.hipsY] = s.bob * Math.abs(cs) - s.bob * 0.5;
  out[J.hipsYaw] = -0.12 * sn;
  out[J.torsoPitch] = s.lean;
  out[J.torsoYaw] = 0.18 * sn;
  out[J.torsoRoll] = 0;
  out[J.headPitch] = -s.lean * 0.6;
  out[J.headYaw] = -0.12 * sn;
  out[J.headRoll] = 0.04 * cs;
  out[J.shLPitch] = -s.armSwing * sn;
  out[J.shLSpread] = 0.18;
  out[J.elL] = 1.25;
  out[J.shRPitch] = s.armSwing * sn;
  out[J.shRSpread] = 0.18;
  out[J.elR] = 1.25;
  out[J.thL] = s.stride * sn;
  out[J.knL] = -0.25 - 1.3 * Math.max(0, -sn) - 0.3 * Math.max(0, cs);
  out[J.thR] = -s.stride * sn;
  out[J.knR] = -0.25 - 1.3 * Math.max(0, sn) - 0.3 * Math.max(0, -cs);
  out[J.tailSway] = 0.35 * Math.sin(phase * 0.5);
  out[J.tailLift] = 0.55;
}

export function jumpPose(out: Pose): void {
  out.fill(0);
  out[J.hipsY] = 0.05;
  out[J.torsoPitch] = -0.15;
  out[J.headPitch] = 0.15;
  out[J.shLPitch] = 2.5;
  out[J.shLSpread] = 0.45;
  out[J.elL] = 0.35;
  out[J.shRPitch] = 2.2;
  out[J.shRSpread] = 0.55;
  out[J.elR] = 0.5;
  out[J.thL] = 1.25;
  out[J.knL] = -1.9;
  out[J.thR] = 0.2;
  out[J.knR] = -0.7;
  out[J.tailLift] = 1.0;
}

export function fallPose(out: Pose): void {
  out.fill(0);
  out[J.torsoPitch] = 0.05;
  out[J.headPitch] = -0.1;
  out[J.shLPitch] = 1.6;
  out[J.shLSpread] = 1.15;
  out[J.elL] = 0.7;
  out[J.shRPitch] = 1.4;
  out[J.shRSpread] = 1.25;
  out[J.elR] = 0.7;
  out[J.thL] = 0.45;
  out[J.knL] = -0.35;
  out[J.thR] = -0.15;
  out[J.knR] = -0.6;
  out[J.tailLift] = 1.35;
  out[J.tailSway] = 0.3;
}

/** Curled into a ball; the somersault spin is applied separately (not blended). */
export function rollPose(out: Pose, hipHeight: number): void {
  out.fill(0);
  out[J.hipsY] = -hipHeight * 0.45;
  out[J.torsoPitch] = -1.0;
  out[J.headPitch] = -0.7;
  out[J.shLPitch] = 1.3;
  out[J.shLSpread] = 0.1;
  out[J.elL] = 1.9;
  out[J.shRPitch] = 1.3;
  out[J.shRSpread] = 0.1;
  out[J.elR] = 1.9;
  out[J.thL] = 2.2;
  out[J.knL] = -2.5;
  out[J.thR] = 2.2;
  out[J.knR] = -2.5;
  out[J.tailLift] = 1.6;
}

/** Standing about. `t` is seconds, used for breathing and a cheeky look back. */
export function idlePose(out: Pose, t: number): void {
  out.fill(0);
  const breathe = Math.sin(t * 2.2);
  out[J.hipsY] = 0.01 * breathe;
  out[J.torsoPitch] = 0.03 * breathe;
  out[J.torsoYaw] = 0.45;
  out[J.headYaw] = 1.05 + 0.15 * Math.sin(t * 0.9);
  out[J.headRoll] = 0.12;
  out[J.headPitch] = 0.1;
  out[J.shLSpread] = 0.12;
  out[J.elL] = 0.25;
  out[J.shRPitch] = -0.2;
  out[J.shRSpread] = 0.14;
  out[J.elR] = 0.3;
  out[J.thL] = 0.05;
  out[J.thR] = -0.05;
  out[J.knL] = -0.08;
  out[J.knR] = -0.08;
  out[J.tailSway] = 0.4 * Math.sin(t * 1.6);
  out[J.tailLift] = 0.4;
}

/** out = Σ weights[i] * poses[i]. Weights should sum to 1. */
export function blendPoses(out: Pose, poses: Pose[], weights: Float32Array): void {
  out.fill(0);
  for (let p = 0; p < poses.length; p++) {
    const w = weights[p];
    if (w <= 1e-4) continue;
    const src = poses[p];
    for (let i = 0; i < out.length; i++) out[i] += src[i] * w;
  }
}

/**
 * Inspector Bones keeps his magnifying glass raised in front of him while he runs.
 * Blends the right arm toward a "held up" pose by `w` (0..1).
 */
export function holdMagnifier(out: Pose, w: number): void {
  out[J.shRPitch] += (1.75 - out[J.shRPitch]) * w;
  out[J.shRSpread] += (0.05 - out[J.shRSpread]) * w;
  out[J.elR] += (0.55 - out[J.elR]) * w;
}
