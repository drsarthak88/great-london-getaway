import * as THREE from 'three';
import { CONFIG } from '../config';
import type { Coin, CoinKind } from '../game/Track';
import { coinParts } from '../models/Props';
import { outlineTree } from '../render/Outline';

const KINDS: CoinKind[] = ['penny', 'sovereign', 'token'];
const CAPS: Record<CoinKind, number> = { penny: 200, sovereign: 24, token: 6 };
/** Coins further ahead than this are hidden by fog anyway. */
const DRAW_AHEAD = 130;

/**
 * Draws every live coin with one instanced mesh per coin type (plus its outline hull):
 * six draw calls however many coins are on the road. Matrices are rewritten each frame
 * for spin and bob, which is cheap and allocation-free.
 */
export class CoinViews {
  private readonly meshes = new Map<CoinKind, THREE.InstancedMesh>();
  private readonly hulls = new Map<CoinKind, THREE.InstancedMesh>();
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3(1, 1, 1);
  private readonly e = new THREE.Euler();
  private time = 0;

  constructor(scene: THREE.Scene, private readonly coins: readonly Coin[]) {
    const parts = coinParts();
    for (const kind of KINDS) {
      const { geo, mat } = parts[kind];
      const im = new THREE.InstancedMesh(geo, mat, CAPS[kind]);
      im.frustumCulled = false;
      im.count = 0;
      outlineTree(im, CONFIG.render.characterOutline);
      const hull = im.children[0] as THREE.InstancedMesh;
      hull.frustumCulled = false;
      hull.count = 0;
      scene.add(im);
      this.meshes.set(kind, im);
      this.hulls.set(kind, hull);
    }
  }

  update(dt: number, distance: number): void {
    this.time += dt;
    const spin = this.time * CONFIG.coins.spin;
    for (const kind of KINDS) {
      const im = this.meshes.get(kind)!;
      const cap = CAPS[kind];
      let n = 0;
      for (let i = 0; i < this.coins.length && n < cap; i++) {
        const c = this.coins[i];
        if (!c.active || c.kind !== kind) continue;
        const ahead = c.d - distance;
        if (ahead > DRAW_AHEAD || ahead < -4) continue;
        this.e.set(0, spin + c.d * 0.35, 0);
        this.q.setFromEuler(this.e);
        this.p.set(c.x, c.y + Math.sin(this.time * 3 + c.d) * 0.06, -ahead);
        this.m.compose(this.p, this.q, this.s);
        im.setMatrixAt(n++, this.m);
      }
      im.count = n;
      this.hulls.get(kind)!.count = n;
      im.instanceMatrix.needsUpdate = true;
    }
  }
}
