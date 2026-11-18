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
  private readonly items = new Map<LandmarkId, { lm: Landmark; minX: number; seenFrame: number; announced: number }>();
  private readonly itemList: { lm: Landmark; minX: number; seenFrame: number; announced: number }[] = [];
  private curDistance = 0;
  private curPrev = 0;
  private curDt = 0;
  private frame = 0;
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
        const item = { lm, minX: box.min.x, seenFrame: -1, announced: -1 };
        this.items.set(p.id, item);
        this.itemList.push(item);
      }
    }
  }

  reset(): void {
    for (const item of this.itemList) item.announced = -1;
  }

  update(dt: number, distance: number, prevDistance: number): void {
    this.frame++;
    this.time += dt;
    this.curDt = dt;
    this.curDistance = distance;
    this.curPrev = prevDistance;
    forLandmarks(distance - BEHIND, distance + AHEAD, this.place);
    for (const item of this.itemList) if (item.seenFrame !== this.frame) item.lm.root.visible = false;
  }

  /** Position one landmark (a bound method, so no closure is allocated per frame). */
  private place = (id: LandmarkId, d: number, side: -1 | 0 | 1, _len: number, cycle: number): void => {
    const item = this.items.get(id);
    if (!item) return;
    const distance = this.curDistance;
    item.seenFrame = this.frame;
    const root = item.lm.root;
    root.visible = true;
    // Set back from the pavement; left-side pieces are mirrored.
    const pl = PLACEMENT[id];
    const k = pl?.scale ?? 1;
    const x = side === 0 ? 0 : side * (STREET_EDGE + 0.6 + (pl?.setback ?? 0) - item.minX * k);
    root.position.set(x, 0, -(d - distance));
    root.scale.set(side < 0 ? -k : k, k, k);
    item.lm.update?.(this.curDt, this.time);
    if (d - distance < POSTCARD_AT && item.announced !== cycle) {
      item.announced = cycle;
      this.onAppear(id);
    }
    if (this.curPrev < d && distance >= d) this.onPass(id);
  };

}
