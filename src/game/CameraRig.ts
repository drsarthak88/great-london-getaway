import * as THREE from 'three';
import { CONFIG } from '../config';
import { damp } from '../utils/math';

/** Chase camera that trails the player, softly following lane changes and jumps. */
export class CameraRig {
  private x = 0;
  private y = 0;
  /** Smoothed height of the surface Jack is running on (road, ramp, roof). */
  private ground = 0;
  private readonly look = new THREE.Vector3();
  /** Screen-shake "trauma" 0..1; shake strength is its square, so it eases out. */
  private trauma = 0;
  private time = 0;
  reducedMotion = false;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.ground = 0;
    this.trauma = 0;
  }

  shake(amount: number): void {
    if (this.reducedMotion) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /**
   * Follow the player. The camera rises fully with the surface underfoot (so bus roofs
   * frame like the road) but only partly with jumps (so jumps read as height).
   */
  update(dt: number, playerX: number, playerY: number, portrait: boolean, groundY = 0, followY: number = CONFIG.camera.followY): void {
    const c = CONFIG.camera;
    this.x = damp(this.x, playerX * c.followX, c.dampX, dt);
    this.ground = damp(this.ground, groundY, 4, dt);
    this.y = damp(this.y, this.ground + (playerY - this.ground) * followY, c.dampY, dt);
    const height = portrait ? c.portraitHeight : c.height;
    const dist = portrait ? c.portraitDistance : c.distance;
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    const k = this.trauma * this.trauma * 0.35;
    const sx = k * Math.sin(this.time * 47.3);
    const sy = k * Math.sin(this.time * 39.1 + 1.3);
    this.camera.position.set(this.x + sx, height + this.y + sy, dist);
    this.look.set(this.x * 0.8 + sx * 0.5, 0.6 + this.y * 0.5 + sy * 0.5, -c.lookAhead);
    this.camera.lookAt(this.look);
  }
}
