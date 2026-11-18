import * as THREE from 'three';
import type { Obstacle, ObstacleKind } from '../game/ObstacleTypes';
import { buildBus } from '../models/Bus';
import { buildCab } from '../models/Cab';
import { buildBarrier, buildBridgeGap, buildGuard, buildPhoneBox, buildPigeons, buildPostBox, buildPuddle, buildRamp, buildSign, type PigeonFlock } from '../models/Props';

interface View {
  obj: THREE.Object3D;
  busy: boolean;
  flock?: PigeonFlock;
  scatter: number;
  /** Seconds since the Black Cab Dash sent it flying. */
  knockT: number;
}

const POOL_SIZES: Record<ObstacleKind, number> = {
  bus: 10,
  cab: 8,
  phoneBox: 6,
  postBox: 6,
  barrier: 8,
  sign: 6,
  pigeons: 4,
  guard: 6,
  puddle: 6,
  ramp: 4,
  gap: 6,
};

/**
 * Pooled 3D models mirroring the Track's obstacle pool. Each model kind is built once
 * and cloned (sharing geometry and materials), so spawning never allocates.
 */
export class ObstacleViews {
  private readonly pools = new Map<ObstacleKind, View[]>();
  /** View assigned to each obstacle slot, by index in the track's pool. */
  private readonly assigned: (View | null)[];
  /** Generation of the obstacle each view was assigned to. */
  private readonly assignedGen: number[];
  private time = 0;

  constructor(
    scene: THREE.Scene,
    private readonly obstacles: readonly Obstacle[],
  ) {
    this.assigned = obstacles.map(() => null);
    this.assignedGen = obstacles.map(() => -1);
    const busProtos = [buildBus('42', 'TEAPOT LANE'), buildBus('7', 'BISCUIT STREET'), buildBus('221', 'CRUMPET ROAD')];
    const protos: Partial<Record<ObstacleKind, () => THREE.Object3D>> = {
      cab: buildCab,
      phoneBox: buildPhoneBox,
      postBox: buildPostBox,
      barrier: buildBarrier,
      sign: buildSign,
      guard: buildGuard,
      puddle: buildPuddle,
      ramp: buildRamp,
      gap: buildBridgeGap,
    };
    for (const kind of Object.keys(POOL_SIZES) as ObstacleKind[]) {
      const views: View[] = [];
      const proto = kind === 'bus' || kind === 'pigeons' ? null : protos[kind]!();
      for (let i = 0; i < POOL_SIZES[kind]; i++) {
        let view: View;
        if (kind === 'pigeons') {
          const flock = buildPigeons();
          view = { obj: flock.root, busy: false, flock, scatter: 0, knockT: 0 };
        } else if (kind === 'bus') {
          view = { obj: busProtos[i % busProtos.length].clone(), busy: false, scatter: 0, knockT: 0 };
        } else {
          view = { obj: proto!.clone(), busy: false, scatter: 0, knockT: 0 };
        }
        view.obj.visible = false;
        scene.add(view.obj);
        views.push(view);
      }
      this.pools.set(kind, views);
    }
  }

  reset(): void {
    for (let i = 0; i < this.assigned.length; i++) this.release(i);
  }

  /** Match views to active obstacles and place them relative to the player. */
  update(dt: number, distance: number): void {
    this.time += dt;
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      let v = this.assigned[i];
      if (v && (!o.active || o.gen !== this.assignedGen[i])) {
        this.release(i);
        v = null;
      }
      if (!o.active) continue;
      if (!v) {
        v = this.acquire(o.kind);
        if (!v) continue;
        this.assigned[i] = v;
        this.assignedGen[i] = o.gen;
        v.scatter = 0;
        v.knockT = 0;
        v.obj.rotation.set(0, 0, 0);
      }
      // Model origin is the centre of the footprint.
      v.obj.position.set(o.x, 0, -(o.d + o.spec.length / 2 - distance));
      if (o.knocked && !v.flock) {
        // Cartoon knock: tumble up and off to the side of the road.
        v.knockT += dt;
        const t = v.knockT;
        const side = o.x >= 0 ? 1 : -1;
        v.obj.position.x += side * t * 9;
        v.obj.position.y = t * 9 - t * t * 14;
        v.obj.position.z -= t * 6;
        v.obj.rotation.set(-t * 7, 0, side * t * 5);
      }
      if (v.flock) {
        if (o.hit || o.knocked) v.scatter = Math.min(1, v.scatter + dt * 1.6);
        v.flock.update(this.time, v.scatter);
      }
    }
  }

  private acquire(kind: ObstacleKind): View | null {
    const pool = this.pools.get(kind)!;
    for (const v of pool) {
      if (!v.busy) {
        v.busy = true;
        v.obj.visible = true;
        return v;
      }
    }
    if (import.meta.env.DEV) console.warn(`ObstacleViews: pool for ${kind} exhausted`);
    return null;
  }

  private release(i: number): void {
    const v = this.assigned[i];
    if (!v) return;
    v.busy = false;
    v.obj.visible = false;
    this.assigned[i] = null;
  }
}
