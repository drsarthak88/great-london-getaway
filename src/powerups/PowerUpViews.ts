import * as THREE from 'three';
import type { Coin } from '../game/Track';
import { POWER_KINDS, type PowerKind } from './PowerUps';
import { buildPickup } from '../models/PowerUpModels';

const PER_KIND = 2;
const DRAW_AHEAD = 130;

/** Floating power-up pickups on the road: a small pool of models per kind. */
export class PowerUpViews {
  private readonly pools = new Map<PowerKind, { g: THREE.Group; icon: THREE.Object3D }[]>();
  private time = 0;
  private readonly used: Record<PowerKind, number> = { helicopter: 0, spring: 0, brolly: 0, magnet: 0, helmet: 0, cabDash: 0, teaTime: 0, corgi: 0 };

  constructor(scene: THREE.Scene, private readonly coins: readonly Coin[]) {
    for (const k of POWER_KINDS) {
      const proto = buildPickup(k);
      const list: { g: THREE.Group; icon: THREE.Object3D }[] = [];
      for (let i = 0; i < PER_KIND; i++) {
        const g = i === 0 ? proto : proto.clone();
        g.visible = false;
        scene.add(g);
        list.push({ g, icon: g.getObjectByName('icon')! });
      }
      this.pools.set(k, list);
    }
  }

  update(dt: number, distance: number): void {
    this.time += dt;
    for (const k of POWER_KINDS) {
      this.used[k] = 0;
      for (const v of this.pools.get(k)!) v.g.visible = false;
    }
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (!c.active || c.kind !== 'power') continue;
      const ahead = c.d - distance;
      if (ahead > DRAW_AHEAD || ahead < -3) continue;
      const n = this.used[c.power];
      const v = this.pools.get(c.power)![n];
      if (!v) continue;
      const g = v.g;
      this.used[c.power] = n + 1;
      g.visible = true;
      g.position.set(c.x, c.y + Math.sin(this.time * 2.5 + c.d) * 0.12, -ahead);
      // The ring keeps facing the camera; only the mini model inside spins.
      v.icon.rotation.y = this.time * 1.8;
    }
  }
}
