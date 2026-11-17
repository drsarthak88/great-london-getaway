import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config';
import { toon } from '../render/ToonMaterials';
import { outlineTree } from '../render/Outline';
import { PlayerController } from './PlayerController';
import { damp } from '../utils/math';

/**
 * Phase 2 placeholder view for Marmalade Jack: a chunky ginger block with ears and a
 * tail so you can read his facing, lean and squash. Phase 3 swaps in the real cat model.
 */
export class Player {
  readonly controller = new PlayerController();
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  /** Soft blob shadow on the ground: shows where Jack will land. */
  private readonly shadow: THREE.Mesh;
  private squash = 1;
  private lean = 0;
  private runPhase = 0;

  constructor(scene: THREE.Scene) {
    const ginger = toon(CONFIG.colors.ginger);
    const h = CONFIG.player.standHeight;

    const torso = new THREE.Mesh(new RoundedBoxGeometry(0.9, h, 0.8, 3, 0.22), ginger);
    torso.position.y = h / 2;
    this.body.add(torso);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 8), ginger);
      ear.position.set(side * 0.26, h + 0.12, 0);
      this.body.add(ear);
    }

    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 8), toon(0xc96d1c));
    tail.position.set(0, h * 0.55, 0.55);
    tail.rotation.x = 0.9;
    this.body.add(tail);

    // A gold dot on his back: the stolen Golden Teapot.
    const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), toon(CONFIG.colors.gold, { emissive: 0x6b4500, emissiveIntensity: 0.25 }));
    teapot.position.set(0, h * 0.65, 0.42);
    this.body.add(teapot);

    outlineTree(this.body);
    this.root.add(this.body);
    scene.add(this.root);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: CONFIG.colors.ink, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    this.shadow.renderOrder = 1;
    scene.add(this.shadow);
  }

  reset(): void {
    this.controller.reset();
    this.squash = 1;
    this.lean = 0;
    this.sync(0, 0);
  }

  /** Copy controller state onto the model and add simple procedural motion. */
  sync(dt: number, speed: number): void {
    const c = this.controller;
    this.root.position.set(c.x, c.y, 0);

    const lift = Math.max(0, c.y - c.groundY);
    const shrink = 1 / (1 + lift * 0.25);
    this.shadow.position.set(c.x, c.groundY + 0.03, 0);
    this.shadow.scale.setScalar(shrink);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.28 * shrink;

    // Squash flat while rolling, stretch a little on take-off.
    const targetSquash = c.rolling ? CONFIG.player.rollHeight / CONFIG.player.standHeight : c.airborne ? 1.08 : 1;
    if (c.justLanded) this.squash = 0.8;
    this.squash = damp(this.squash, targetSquash, 18, dt);
    this.body.scale.set(1 / Math.sqrt(this.squash), this.squash, 1 / Math.sqrt(this.squash));

    // Lean into lane changes.
    this.lean = damp(this.lean, -c.vx * 0.02, 14, dt);
    this.body.rotation.z = this.lean;

    // A little bob while running on the ground.
    if (c.grounded && !c.rolling && speed > 0) {
      this.runPhase += dt * speed * 0.9;
      this.body.position.y = Math.abs(Math.sin(this.runPhase)) * 0.12;
    } else {
      this.body.position.y = 0;
    }
  }
}
