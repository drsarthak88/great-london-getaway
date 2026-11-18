import * as THREE from 'three';

/**
 * A tiny hand-rolled skeleton for cartoon characters. Each joint is a Group pivot;
 * meshes hang off them. Characters face -z (running away from the camera).
 *
 * Rotation conventions (radians):
 *  - thigh/shoulder pitch > 0 swings the limb forward (toward -z)
 *  - knee < 0 bends the shin backward; elbow > 0 bends the forearm forward
 *  - torso pitch < 0 leans forward
 *  - shoulder spread > 0 raises the arm out sideways (mirrored per side)
 */
export interface BipedRig {
  root: THREE.Group;
  /** Pelvis pivot; its y is offset by the pose for bobbing and crouching. */
  hips: THREE.Group;
  hipHeight: number;
  torso: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  elbowL: THREE.Group;
  shoulderR: THREE.Group;
  elbowR: THREE.Group;
  thighL: THREE.Group;
  kneeL: THREE.Group;
  thighR: THREE.Group;
  kneeR: THREE.Group;
  /** Chain of tail pivots, base first (empty for characters without tails). */
  tail: THREE.Group[];
}

/** Indices into a pose array. */
export const J = {
  hipsY: 0,
  hipsYaw: 1,
  torsoPitch: 2,
  torsoYaw: 3,
  torsoRoll: 4,
  headPitch: 5,
  headYaw: 6,
  headRoll: 7,
  shLPitch: 8,
  shLSpread: 9,
  elL: 10,
  shRPitch: 11,
  shRSpread: 12,
  elR: 13,
  thL: 14,
  knL: 15,
  thR: 16,
  knR: 17,
  tailSway: 18,
  tailLift: 19,
  COUNT: 20,
} as const;

export type Pose = Float32Array;

export function makePose(): Pose {
  return new Float32Array(J.COUNT);
}

/** Copy a blended pose onto the rig's joints. Allocation-free. */
export function applyPose(rig: BipedRig, p: Pose): void {
  rig.hips.position.y = rig.hipHeight + p[J.hipsY];
  rig.hips.rotation.set(0, p[J.hipsYaw], 0);
  rig.torso.rotation.set(p[J.torsoPitch], p[J.torsoYaw], p[J.torsoRoll]);
  rig.head.rotation.set(p[J.headPitch], p[J.headYaw], p[J.headRoll]);
  rig.shoulderL.rotation.set(p[J.shLPitch], 0, -p[J.shLSpread]);
  rig.elbowL.rotation.x = p[J.elL];
  rig.shoulderR.rotation.set(p[J.shRPitch], 0, p[J.shRSpread]);
  rig.elbowR.rotation.x = p[J.elR];
  rig.thighL.rotation.x = p[J.thL];
  rig.kneeL.rotation.x = p[J.knL];
  rig.thighR.rotation.x = p[J.thR];
  rig.kneeR.rotation.x = p[J.knR];
  const n = rig.tail.length;
  for (let i = 0; i < n; i++) {
    const seg = rig.tail[i];
    // Sway grows toward the tip so the tail whips; lift curls it upward.
    seg.rotation.y = p[J.tailSway] * (0.4 + (i / n) * 0.9);
    seg.rotation.x = -p[J.tailLift] * (i === 0 ? 1 : 0.28);
  }
}

/** Capsule hanging down from its pivot (top of the capsule sits on the pivot). */
export function hangingCapsule(radius: number, length: number, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.CapsuleGeometry(radius, length, 4, 10);
  g.translate(0, -length / 2 - radius * 0.6, 0);
  return new THREE.Mesh(g, mat);
}

export interface LimbSpec {
  upper: number;
  lower: number;
  radius: number;
  upperMat: THREE.Material;
  lowerMat: THREE.Material;
}

/** Build a two-segment limb. Returns the top pivot and the middle (knee/elbow) pivot. */
export function buildLimb(spec: LimbSpec): { top: THREE.Group; mid: THREE.Group; end: THREE.Group } {
  const top = new THREE.Group();
  top.add(hangingCapsule(spec.radius, spec.upper, spec.upperMat));
  const mid = new THREE.Group();
  mid.position.y = -(spec.upper + spec.radius * 0.6);
  top.add(mid);
  mid.add(hangingCapsule(spec.radius * 0.92, spec.lower, spec.lowerMat));
  const end = new THREE.Group();
  end.position.y = -(spec.lower + spec.radius * 0.9);
  mid.add(end);
  return { top, mid, end };
}

/** Assemble the joint hierarchy. Callers add meshes to the returned pivots. */
export function createRig(opts: {
  hipHeight: number;
  hipWidth: number;
  shoulderY: number;
  shoulderWidth: number;
  neckY: number;
  arm: LimbSpec;
  leg: LimbSpec;
}): BipedRig & { handL: THREE.Group; handR: THREE.Group; footL: THREE.Group; footR: THREE.Group } {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = opts.hipHeight;
  root.add(hips);
  const torso = new THREE.Group();
  hips.add(torso);
  const head = new THREE.Group();
  head.position.y = opts.neckY;
  torso.add(head);

  const armL = buildLimb(opts.arm);
  armL.top.position.set(-opts.shoulderWidth / 2, opts.shoulderY, 0);
  torso.add(armL.top);
  const armR = buildLimb(opts.arm);
  armR.top.position.set(opts.shoulderWidth / 2, opts.shoulderY, 0);
  torso.add(armR.top);

  const legL = buildLimb(opts.leg);
  legL.top.position.set(-opts.hipWidth / 2, 0, 0);
  hips.add(legL.top);
  const legR = buildLimb(opts.leg);
  legR.top.position.set(opts.hipWidth / 2, 0, 0);
  hips.add(legR.top);

  return {
    root,
    hips,
    hipHeight: opts.hipHeight,
    torso,
    head,
    shoulderL: armL.top,
    elbowL: armL.mid,
    handL: armL.end,
    shoulderR: armR.top,
    elbowR: armR.mid,
    handR: armR.end,
    thighL: legL.top,
    kneeL: legL.mid,
    footL: legL.end,
    thighR: legR.top,
    kneeR: legR.mid,
    footR: legR.end,
    tail: [],
  };
}
