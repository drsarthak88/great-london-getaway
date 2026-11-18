import * as THREE from 'three';
import { CONFIG } from '../config';
import { PlayerController } from './PlayerController';
import { CharacterAnimator } from './CharacterAnimator';
import { CAT_STYLE } from './Poses';
import { applyPose } from '../models/Biped';
import { buildCat, CAT_HIP_HEIGHT, type CatRig } from '../models/Cat';
import { BlobShadow } from './BlobShadow';
import { damp } from '../utils/math';

/**
 * Marmalade Jack on screen: the procedural cat rig driven by PlayerController state.
 * Adds squash and stretch, leaning into lane changes, and a blob shadow.
 */
export class Player {
  readonly controller = new PlayerController();
  /** Positioned at the controller's (x, y). */
  readonly root = new THREE.Group();
  readonly rig: CatRig;
  readonly animator = new CharacterAnimator(CAT_STYLE, CAT_HIP_HEIGHT);
  /** Wrapper that receives squash/stretch and lean without disturbing the rig. */
  private readonly body = new THREE.Group();
  private readonly shadow: BlobShadow;
  private squash = 1;
  private lean = 0;
  private turn = 0;
  /** Seconds of stumble wobble left. */
  private flinchTimer = 0;
  /** Seconds of invulnerability blink left. */
  private blinkTimer = 0;
  /** Knock-back after a crash (pushed toward the camera). */
  private knockZ = 0;
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.rig = buildCat();
    this.body.add(this.rig.root);
    this.root.add(this.body);
    scene.add(this.root);
    this.shadow = new BlobShadow(scene, 0.62);
  }

  reset(): void {
    this.controller.reset();
    this.animator.reset();
    this.squash = 1;
    this.lean = 0;
    this.turn = 0;
    this.flinchTimer = 0;
    this.blinkTimer = 0;
    this.knockZ = 0;
    this.rig.root.visible = true;
    this.sync(0, 0, false);
  }

  /** Clipped something: a quick wobble and a short invulnerability blink. */
  flinch(grace: number): void {
    this.flinchTimer = 0.45;
    this.blinkTimer = grace;
    this.squash = 0.8;
  }

  /** Ran smack into something: squash flat against it and bounce back a little. */
  bonk(): void {
    this.squash = 0.6;
    this.knockZ = 0.9;
  }

  /** Copy controller state onto the model and animate. `running` is false on the title screen. */
  sync(dt: number, speed: number, running: boolean, caught = false): void {
    const c = this.controller;
    this.time += dt;
    this.knockZ = damp(this.knockZ, caught ? 0.45 : 0, 5, dt);
    this.root.position.set(c.x, c.y, this.knockZ);

    const pose = this.animator.update(dt, {
      running,
      grounded: c.grounded,
      rolling: c.rolling,
      rollProgress: 1 - c.rollTimer / CONFIG.player.rollDuration,
      vy: c.vy,
      speed,
      caught,
    });
    applyPose(this.rig, pose);
    this.rig.hips.rotation.x = this.animator.spin;

    // Squash on landing, stretch on take-off, settle back to 1.
    if (c.justLanded) this.squash = 0.72;
    if (c.justJumped) this.squash = 1.25;
    this.squash = damp(this.squash, 1, 10, dt);
    const side = 1 / Math.sqrt(this.squash);
    this.body.scale.set(side, this.squash, side);

    // Lean and glance into lane changes.
    this.lean = damp(this.lean, -c.vx * 0.022, 14, dt);
    this.turn = damp(this.turn, -c.vx * 0.03, 12, dt);
    let wobble = 0;
    if (this.flinchTimer > 0) {
      this.flinchTimer = Math.max(0, this.flinchTimer - dt);
      wobble = Math.sin(this.time * 45) * 0.3 * (this.flinchTimer / 0.45);
    }
    this.body.rotation.set(0, this.turn, this.lean + wobble);

    if (this.blinkTimer > 0) {
      this.blinkTimer = Math.max(0, this.blinkTimer - dt);
      this.rig.root.visible = this.blinkTimer === 0 || Math.floor(this.time * 14) % 2 === 0;
    }

    this.shadow.update(c.x, c.groundY, c.y, 0);
  }
}
