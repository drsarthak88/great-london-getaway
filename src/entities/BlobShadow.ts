import * as THREE from 'three';
import { CONFIG } from '../config';

const geo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);

/** Cheap soft contact shadow that shrinks and fades as its owner rises. */
export class BlobShadow {
  readonly mesh: THREE.Mesh;
  private readonly mat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, private readonly radius: number, private readonly opacity = 0.28) {
    this.mat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.ink, transparent: true, opacity, depthWrite: false });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  update(x: number, groundY: number, y: number, z: number): void {
    const lift = Math.max(0, y - groundY);
    const shrink = 1 / (1 + lift * 0.25);
    this.mesh.position.set(x, groundY + 0.03, z);
    this.mesh.scale.setScalar(this.radius * shrink);
    this.mat.opacity = this.opacity * shrink;
  }

  set visible(v: boolean) {
    this.mesh.visible = v;
  }
}
