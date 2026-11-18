import * as THREE from 'three';
import { ZONES, type LandmarkId } from '../data/zones';
import { buildLandmark, type Landmark } from '../models/Landmarks';
import { forLandmarks } from '../game/Zones';
import { STREET_EDGE } from '../game/World';

const AHEAD = 260;
const BEHIND = 90;
/** A postcard pops up when a landmark comes this close. */
const POSTCARD_AT = 120;

/**
 * Per-landmark set-back from the pavement and scale, tuned so even the tall ones fit
 * in the chase camera's view as they slide past.
 */
const PLACEMENT: Partial<Record<LandmarkId, { setback: number; scale: number }>> = {
  parliament: { setback: 5, scale: 0.75 },
  bigBen: { setback: 9, scale: 0.6 },
  londonEye: { setback: 22, scale: 0.75 },
  towerOfLondon: { setback: 4, scale: 0.75 },
  buckingham: { setback: 4, scale: 0.8 },
  victoriaMemorial: { setback: 4, scale: 0.75 },
  nelson: { setback: 3, scale: 0.6 },
  piccadilly: { setback: 1, scale: 0.85 },
  baker221b: { setback: 0.3, scale: 1 },
  stPauls: { setback: 14, scale: 0.6 },
};

/**
 * Places the landmark set pieces beside (or over) the road as they come up, animates
 * them, and reports when one first appears (for its postcard) and when Jack passes
 * Big Ben (for the Westminster chime).
 */
export class LandmarkViews {
  private readonly items = new Map<LandmarkId, { lm: Landmark; minX: number; seenFrame: number }>();
  private frame = 0;
  private readonly announced = new Set<string>();
  private time = 0;

  /** First sighting of a landmark this run. */
  onAppear: (id: LandmarkId) => void = () => {};
  /** Jack has just run past this landmark. */
  onPass: (id: LandmarkId) => void = () => {};

  constructor(scene: THREE.Scene) {
    const bridgeZone = ZONES.find((z) => z.bridge);
    const towerGap = bridgeZone?.bridge ? bridgeZone.bridge.towers[1] - bridgeZone.bridge.towers[0] : 130;
    for (const z of ZONES) {
      for (const p of z.landmarks) {
        if (this.items.has(p.id)) continue;
        const lm = buildLandmark(p.id, towerGap);
        lm.root.visible = false;
        scene.add(lm.root);
        const box = new THREE.Box3().setFromObject(lm.root);
        this.items.set(p.id, { lm, minX: box.min.x, seenFrame: -1 });
      }
    }
  }

  reset(): void {
    this.announced.clear();
  }

  update(dt: number, distance: number, prevDistance: number): void {
    this.frame++;
    this.time += dt;
    const f = this.frame;
    forLandmarks(distance - BEHIND, distance + AHEAD, (id, d, side, _len, cycle) => {
      const item = this.items.get(id);
      if (!item) return;
      item.seenFrame = f;
      const root = item.lm.root;
      root.visible = true;
      // Set back from the pavement; left-side pieces are mirrored.
      const pl = PLACEMENT[id];
      const k = pl?.scale ?? 1;
      const x = side === 0 ? 0 : side * (STREET_EDGE + 0.6 + (pl?.setback ?? 0) - item.minX * k);
      root.position.set(x, 0, -(d - distance));
      root.scale.set(side < 0 ? -k : k, k, k);
      item.lm.update?.(dt, this.time);
      const key = `${id}:${cycle}`;
      if (d - distance < POSTCARD_AT && !this.announced.has(key)) {
        this.announced.add(key);
        this.onAppear(id);
      }
      if (prevDistance < d && distance >= d) this.onPass(id);
    });
    for (const item of this.items.values()) if (item.seenFrame !== f) item.lm.root.visible = false;
  }
}
