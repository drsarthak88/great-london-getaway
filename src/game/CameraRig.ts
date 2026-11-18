import * as THREE from 'three';
import { CONFIG } from '../config';
import { damp } from '../utils/math';

/** Chase camera that trails the player, softly following lane changes and jumps. */
export class CameraRig {
  private x = 0;
  private y = 0;
  private readonly look = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  reset(): void {
    this.x = 0;
    this.y = 0;
  }

  update(dt: number, playerX: number, playerY: number, portrait: boolean): void {
    const c = CONFIG.camera;
    this.x = damp(this.x, playerX * c.followX, c.dampX, dt);
    this.y = damp(this.y, playerY * c.followY, c.dampY, dt);
    const height = portrait ? c.portraitHeight : c.height;
    const dist = portrait ? c.portraitDistance : c.distance;
    this.camera.position.set(this.x, height + this.y, dist);
    this.look.set(this.x * 0.8, 0.9 + this.y * 0.5, -c.lookAhead);
    this.camera.lookAt(this.look);
  }
}
