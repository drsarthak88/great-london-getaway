import * as THREE from 'three';
import { CharacterAnimator } from './CharacterAnimator';
import { DETECTIVE_STYLE, grabPose, holdMagnifier } from './Poses';
import { applyPose } from '../models/Biped';
import { buildDetective, DETECTIVE_HIP_HEIGHT, type DetectiveRig } from '../models/Detective';
import { BlobShadow } from './BlobShadow';
import { Chase } from '../game/Chase';
import { damp } from '../utils/math';
import { CONFIG } from '../config';

/**
 * Inspector Hemlock Bones on screen. Runs behind Jack at `chase.gap`, drifting toward
 * Jack's lane with a little delay, magnifying glass held high.
 */
export class Detective {
  readonly rig: DetectiveRig;
  readonly chase = new Chase();
  readonly animator = new CharacterAnimator(DETECTIVE_STYLE, DETECTIVE_HIP_HEIGHT, grabPose);
  private readonly shadow: BlobShadow;
  private x = 0;

  constructor(scene: THREE.Scene) {
    this.rig = buildDetective();
    scene.add(this.rig.root);
    this.shadow = new BlobShadow(scene, 0.7);
  }

  reset(gap?: number): void {
    this.chase.reset(gap);
    this.animator.reset();
    this.x = -CONFIG.detective.sideOffset;
    this.sync(0, 0, 0, false);
  }

  /** The catch scene: dash up beside Jack and grab him. */
  catchUp(dt: number, playerX: number): void {
    this.chase.grab(dt, 1.25);
    this.x = damp(this.x, playerX - 0.85, 6, dt);
    this.sync(dt, playerX, 0, false, true);
  }

  update(dt: number, playerX: number, speed: number, running: boolean): void {
    if (running) this.chase.update(dt);
    // Chase on a diagonal: beside-and-behind Jack, on the side nearer the kerb's middle
    // of the road, so he never stands between the camera and Jack.
    const side = playerX > 0.1 ? -1 : playerX < -0.1 ? 1 : -1;
    this.x = damp(this.x, playerX + side * CONFIG.detective.sideOffset, 3.5, dt);
    this.sync(dt, playerX, speed, running);
  }

  private sync(dt: number, playerX: number, speed: number, running: boolean, caught = false): void {
    const visible = this.chase.visible;
    this.rig.root.visible = visible;
    this.shadow.visible = visible;
    if (!visible) return;

    this.rig.root.position.set(this.x, 0, this.chase.gap);
    // Face Jack: turn slightly toward him.
    this.rig.root.rotation.y = Math.atan2(this.x - playerX, this.chase.gap) * 0.8;
    const pose = this.animator.update(dt, { running, grounded: true, rolling: false, rollProgress: 0, vy: 0, speed, caught });
    if (!caught) holdMagnifier(pose, 0.85);
    applyPose(this.rig, pose);
    this.shadow.update(this.x, 0, 0, this.chase.gap);
  }
}
