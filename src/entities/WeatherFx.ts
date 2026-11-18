import * as THREE from 'three';

const DROPS = 280;

/** Drizzle: light blue rain streaks falling in a box around the camera. */
export class WeatherFx {
  private readonly rain: THREE.InstancedMesh;
  private readonly seeds = new Float32Array(DROPS * 3);
  private readonly m = new THREE.Matrix4();
  private time = 0;

  constructor(scene: THREE.Scene) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.7, depthWrite: false });
    this.rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 0.7, 0.025), mat, DROPS);
    this.rain.frustumCulled = false;
    this.rain.count = 0;
    for (let i = 0; i < DROPS; i++) {
      this.seeds[i * 3] = (Math.random() - 0.5) * 30;
      this.seeds[i * 3 + 1] = Math.random() * 14;
      this.seeds[i * 3 + 2] = -Math.random() * 40 + 6;
    }
    scene.add(this.rain);
  }

  /** `amount` 0..1 of drizzle; `speed` is the run speed (rain streams past). */
  update(dt: number, amount: number, camera: THREE.Camera, speed: number): void {
    this.time += dt;
    const n = Math.floor(DROPS * amount);
    this.rain.count = n;
    if (n === 0) return;
    const cx = camera.position.x;
    for (let i = 0; i < n; i++) {
      const x = this.seeds[i * 3];
      let y = this.seeds[i * 3 + 1] - this.time * 16;
      y = ((y % 14) + 14) % 14;
      // Drops stream toward the camera; wrap them within z in [-40, -1) so none
      // pass right in front of the lens.
      const z = ((((this.seeds[i * 3 + 2] + this.time * speed * 0.15 + 40) % 39) + 39) % 39) - 40;
      this.m.makeTranslation(cx + x, y, z);
      this.rain.setMatrixAt(i, this.m);
    }
    this.rain.instanceMatrix.needsUpdate = true;
  }
}
