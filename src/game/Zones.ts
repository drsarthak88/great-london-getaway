import { CONFIG } from '../config';
import { ZONES, type LandmarkId, type ZoneDef } from '../data/zones';

/**
 * Pure zone schedule: which London zone covers a track distance, how colours blend
 * between zones, where landmarks, rivers and bridges are. Zones cycle forever.
 */
export const ZONE_LENGTH = CONFIG.zones.length;

export function zoneIndexAt(d: number, length = ZONE_LENGTH): number {
  const i = Math.floor(Math.max(0, d) / length);
  return i % ZONES.length;
}

export function zoneAt(d: number): ZoneDef {
  return ZONES[zoneIndexAt(d)];
}

/** Distance into the current zone. */
export function zoneOffset(d: number, length = ZONE_LENGTH): number {
  return Math.max(0, d) % length;
}

/**
 * Colour blend: over the last `blend` units of a zone, `t` goes 0→1 toward the next.
 * Returns the indices of the current and next zones.
 */
export function zoneBlend(d: number, out: { a: number; b: number; t: number }, blend = CONFIG.zones.blend): typeof out {
  const off = zoneOffset(d);
  out.a = zoneIndexAt(d);
  out.b = (out.a + 1) % ZONES.length;
  const start = ZONE_LENGTH - blend;
  out.t = off <= start ? 0 : (off - start) / blend;
  return out;
}

export interface LandmarkHit {
  id: LandmarkId;
  /** Absolute track distance of the landmark's centre. */
  d: number;
  side: -1 | 0 | 1;
  length: number;
  /** Which pass through the zone cycle (distinguishes repeat visits). */
  cycle: number;
}

/** Visit every landmark whose footprint overlaps [d0, d1]. Allocation-free if `cb` is. */
export function forLandmarks(d0: number, d1: number, cb: (id: LandmarkId, d: number, side: -1 | 0 | 1, length: number, cycle: number) => void): void {
  const first = Math.max(0, Math.floor(d0 / ZONE_LENGTH) - 1);
  const last = Math.floor(Math.max(0, d1) / ZONE_LENGTH) + 1;
  for (let c = first; c <= last; c++) {
    const z = ZONES[c % ZONES.length];
    const base = c * ZONE_LENGTH;
    for (const lm of z.landmarks) {
      const centre = base + lm.at;
      if (centre + lm.length / 2 < d0 || centre - lm.length / 2 > d1) continue;
      cb(lm.id, centre, lm.side, lm.length, c);
    }
  }
}

function inRange(off: number, r: [number, number] | undefined): boolean {
  return !!r && off >= r[0] && off <= r[1];
}

/** Is there river (instead of terraces) on this side at distance d? */
export function riverAt(side: -1 | 1, d: number): boolean {
  const z = zoneAt(d);
  if (!z.river) return false;
  return inRange(zoneOffset(d), side < 0 ? z.river.left : z.river.right);
}

/** Is the road on a bridge at distance d? */
export function bridgeAt(d: number): boolean {
  const z = zoneAt(d);
  return !!z.bridge && inRange(zoneOffset(d), [z.bridge.from, z.bridge.to]);
}

/**
 * Should terraces on this side be left out over [d0, d1]? True where a landmark sits
 * on that side (or spans the road) or the river runs alongside.
 */
export function clearance(side: -1 | 1, d0: number, d1: number): boolean {
  if (riverAt(side, d0) || riverAt(side, d1) || riverAt(side, (d0 + d1) / 2)) return true;
  let hit = false;
  forLandmarks(d0, d1, (_id, _d, s, len) => {
    // Road-spanning landmarks (bridges, bunting) need no clearance unless they are long gateways.
    if (s === side || (s === 0 && len > 100)) hit = true;
  });
  return hit;
}

/** First bascule gap at or after `d` (absolute track distance), or Infinity. */
export function nextBridgeGap(d: number): number {
  const c0 = Math.floor(Math.max(0, d) / ZONE_LENGTH);
  for (let c = c0; c < c0 + ZONES.length + 1; c++) {
    const z = ZONES[c % ZONES.length];
    if (!z.bridge) continue;
    for (const g of z.bridge.gaps) {
      const abs = c * ZONE_LENGTH + g;
      if (abs >= d) return abs;
    }
  }
  return Infinity;
}

/** Zone entered between two distances (for the title banner), or -1. */
export function zoneEntered(prevD: number, d: number): number {
  if (prevD < 0) return d >= 0 ? 0 : -1;
  return Math.floor(prevD / ZONE_LENGTH) !== Math.floor(d / ZONE_LENGTH) ? zoneIndexAt(d) : -1;
}
