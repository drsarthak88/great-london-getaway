import { CONFIG } from '../config';
import type { Obstacle } from './ObstacleTypes';

/**
 * Pure collision rules for Jack against obstacles. All in track space:
 * x sideways, y up (feet), d along the road (Jack's centre is at the run distance).
 */
export interface PlayerBox {
  x: number;
  /** Feet height. */
  y: number;
  /** Track distance of the player's centre. */
  d: number;
  halfW: number;
  halfD: number;
  height: number;
}

/**
 * - `crash`: ran straight into something solid; caught at once.
 * - `stumble`: a glancing or soft hit; Bones catches up.
 * - `bounce`: hit the side while changing lane; stumble and get pushed back.
 * - `puddle`: splashed through a puddle; slows down.
 * - `fall`: ran into a gap in the road (Tower Bridge) instead of jumping it.
 */
export type HitKind = 'none' | 'crash' | 'stumble' | 'bounce' | 'puddle' | 'fall';

/** Top surface height of an obstacle at track distance `d` (ramps slope up). */
export function surfaceTop(o: Obstacle, d: number): number {
  const s = o.spec;
  if (!s.ramp) return s.height;
  const t = (d - o.d) / s.length;
  return s.height * (t < 0 ? 0 : t > 1 ? 1 : t);
}

/** Is the player's centre over this obstacle's footprint? */
function overFootprint(o: Obstacle, x: number, d: number): boolean {
  return Math.abs(x - o.x) < o.spec.width / 2 && d >= o.d && d <= o.far;
}

/**
 * Height of the ground under the player: the road (0) or the highest platform top
 * that the player is over and is not too far below their feet (no teleporting up
 * the side of a bus). The step test uses the surface height where the player was
 * last frame (`prevD`), so climbing a ramp works at any speed and frame rate.
 */
export function groundHeight(
  obstacles: readonly Obstacle[],
  x: number,
  d: number,
  feetY: number,
  prevD: number = d,
  step: number = CONFIG.obstacles.stepUp,
): number {
  let ground = 0;
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (!o.active || !o.spec.platform || o.knocked) continue;
    if (!overFootprint(o, x, d)) continue;
    const reachable = feetY >= surfaceTop(o, Math.min(prevD, d)) - step;
    const top = surfaceTop(o, d);
    if (reachable && top > ground) ground = top;
  }
  return ground;
}

/** The platform the player is standing on, if any (for stats like "jumped on a bus"). */
export function platformUnder(obstacles: readonly Obstacle[], x: number, d: number, feetY: number): Obstacle | null {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (!o.active || !o.spec.platform || o.knocked) continue;
    if (overFootprint(o, x, d) && Math.abs(feetY - surfaceTop(o, d)) < 0.05) return o;
  }
  return null;
}

function overlap1D(aMin: number, aMax: number, bMin: number, bMax: number): number {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

/**
 * Classify contact between the player and one obstacle this frame, using where both
 * were last frame to tell a head-on hit from a side-swipe.
 */
export function classifyHit(o: Obstacle, prev: PlayerBox, cur: PlayerBox, step: number = CONFIG.obstacles.stepUp): HitKind {
  if (!o.active || o.hit || o.knocked) return 'none';
  const s = o.spec;
  const halfOW = s.width / 2;

  const ox = overlap1D(cur.x - cur.halfW, cur.x + cur.halfW, o.x - halfOW, o.x + halfOW);
  if (ox <= 0) return 'none';
  const od = overlap1D(cur.d - cur.halfD, cur.d + cur.halfD, o.d, o.far);
  if (od <= 0) return 'none';

  if (s.pit) {
    // Fall in only with feet on the road level and well over the hole.
    const over = Math.abs(cur.x - o.x) < halfOW && cur.d > o.d + 0.45 && cur.d < o.far - 0.45;
    return over && cur.y < 0.08 ? 'fall' : 'none';
  }

  if (s.trigger) {
    // Only splashes if you run through it on the ground.
    return cur.y < s.height + 0.25 && Math.abs(cur.x - o.x) < halfOW ? 'puddle' : 'none';
  }

  const top = surfaceTop(o, Math.min(Math.max(cur.d, o.d), o.far));
  const oy = overlap1D(cur.y, cur.y + cur.height, s.yMin, top);
  if (oy <= 0) return 'none';
  // Standing on (or stepping up onto) a platform is not a hit.
  if (s.platform && cur.y >= top - step) return 'none';

  const wasInD = overlap1D(prev.d - prev.halfD, prev.d + prev.halfD, o.prevD, o.prevD + s.length) > 0;
  const wasInX = overlap1D(prev.x - prev.halfW, prev.x + prev.halfW, o.x - halfOW, o.x + halfOW) > 0;

  if (!wasInD) {
    // Arrived from the front. Squarely = crash; just clipping the corner = stumble.
    const squarely = ox / (2 * cur.halfW) >= 0.5;
    if (!squarely) return 'bounce';
    return s.soft ? 'stumble' : 'crash';
  }
  if (!wasInX) return 'bounce';
  // Already overlapping on both axes (e.g. dropped onto it from too high above the step).
  return 'stumble';
}
