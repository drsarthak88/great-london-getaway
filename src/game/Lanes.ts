import { CONFIG } from '../config';

/** Lanes are indexed -1 (left), 0 (centre), 1 (right). */
export type Lane = -1 | 0 | 1;

export const MIN_LANE = -((CONFIG.lanes.count - 1) / 2);
export const MAX_LANE = (CONFIG.lanes.count - 1) / 2;

/** World-space x of a lane's centre. */
export function laneX(lane: number, width: number = CONFIG.lanes.width): number {
  return lane * width;
}

/** Clamp a lane index into the valid range. */
export function clampLane(lane: number): Lane {
  return Math.max(MIN_LANE, Math.min(MAX_LANE, Math.round(lane))) as Lane;
}

/**
 * The lane you end up in after asking to move `dir` (-1 left, +1 right) from `lane`.
 * Moving past the edge leaves you where you are.
 */
export function stepLane(lane: number, dir: -1 | 1): Lane {
  return clampLane(lane + dir);
}

/** Nearest lane to an x position (used to decide which lane the player is "in" mid-slide). */
export function laneAtX(x: number, width: number = CONFIG.lanes.width): Lane {
  return clampLane(x / width);
}
