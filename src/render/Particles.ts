import * as THREE from 'three';

export type ParticleKind = 'sparkle' | 'dust' | 'splash' | 'debris' | 'confetti' | 'stars';

const CAP = 360;

interface Preset {
  colors: number[];
  size: [number, number];
  speed: [number, number];
  up: [number, number];
  gravity: number;
  life: [number, number];
  /** How much the particle is carried toward the camera by the scrolling world (0..1). */
  drift: number;
  /** Spread sideways mostly (dust) or in all directions. */
  flat?: boolean;
}

const PRESETS: Record<ParticleKind, Preset> = {
  sparkle: { colors: [0xffd23a, 0xfff3a0, 0xffffff, 0xff8a3d], size: [0.08, 0.14], speed: [1.5, 3.5], up: [1, 3.5], gravity: -6, life: [0.35, 0.55], drift: 0.25 },
  dust: { colors: [0xf2e4c4, 0xe8d6b0, 0xffffff], size: [0.14, 0.26], speed: [1.5, 3], up: [0.2, 1], gravity: 1.2, life: [0.35, 0.6], drift: 1, flat: true },
  splash: { colors: [0x8fdcff, 0xffffff, 0x46b5ff], size: [0.09, 0.17], speed: [1, 3], up: [3.5, 6.5], gravity: -16, life: [0.5, 0.8], drift: 1 },
  debris: { colors: [0xff4d6d, 0xffc93c, 0x4cc96f, 0x46b5ff, 0xffffff, 0xff8a3d], size: [0.14, 0.26], speed: [4, 8], up: [3, 7], gravity: -15, life: [0.8, 1.2], drift: 1 },
  confetti: { colors: [0xff4d6d, 0xffc93c, 0x4cc96f, 0x46b5ff, 0xb47cff, 0xff8fb1], size: [0.09, 0.15], speed: [2, 5], up: [3, 6], gravity: -6, life: [0.9, 1.4], drift: 0.4 },
  stars: { colors: [0xffd23a, 0xffffff], size: [0.12, 0.2], speed: [1.5, 2.5], up: [1.5, 3], gravity: -3, life: [0.5, 0.8], drift: 0.2 },
};

/**
 * One pooled, instanced particle system for all the little bursts that make the game
 * feel juicy: coin sparkles, dust puffs, splashes, smash debris, confetti, dizzy stars.
 * A single draw call; no allocation after construction.
 */
export class Particles {
  private readonly mesh: THREE.InstancedMesh;
  private readonly px = new Float32Array(CAP);
  private readonly py = new Float32Array(CAP);
  private readonly pz = new Float32Array(CAP);
  private readonly vx = new Float32Array(CAP);
  private readonly vy = new Float32Array(CAP);
  private readonly vz = new Float32Array(CAP);
  private readonly life = new Float32Array(CAP);
  private readonly maxLife = new Float32Array(CAP);
  private readonly size = new Float32Array(CAP);
  private readonly grav = new Float32Array(CAP);
  private readonly drift = new Float32Array(CAP);
  private readonly spin = new Float32Array(CAP);
  /** Live particle count (read-only outside). */
  alive = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  /** Off when the player asks for reduced motion (keeps a calmer screen). */
  enabled = true;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), CAP);
    this.mesh.setColorAt(0, this.c.set(0xffffff));
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  clear(): void {
    this.alive = 0;
    this.mesh.count = 0;
  }

  emit(kind: ParticleKind, x: number, y: number, z: number, count: number): void {
    if (!this.enabled) count = Math.ceil(count / 3);
    const P = PRESETS[kind];
    const r = (a: [number, number]) => a[0] + Math.random() * (a[1] - a[0]);
    for (let n = 0; n < count && this.alive < CAP; n++) {
      const i = this.alive++;
      const ang = Math.random() * Math.PI * 2;
      const sp = r(P.speed);
      this.px[i] = x;
      this.py[i] = y;
      this.pz[i] = z;
      this.vx[i] = Math.cos(ang) * sp;
      this.vz[i] = Math.sin(ang) * sp * (P.flat ? 0.6 : 1);
      this.vy[i] = r(P.up);
      this.maxLife[i] = this.life[i] = r(P.life);
      this.size[i] = r(P.size);
      this.grav[i] = P.gravity;
      this.drift[i] = P.drift;
      this.spin[i] = (Math.random() - 0.5) * 20;
      this.mesh.setColorAt(i, this.c.setHex(P.colors[(Math.random() * P.colors.length) | 0]));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** `scroll` is the run speed: the world (and grounded particles) streams toward the camera. */
  update(dt: number, scroll: number): void {
    let i = 0;
    while (i < this.alive) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.kill(i);
        continue;
      }
      this.vy[i] += this.grav[i] * dt;
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      this.pz[i] += (this.vz[i] + scroll * this.drift[i]) * dt;
      if (this.py[i] < 0.02) {
        this.py[i] = 0.02;
        this.vy[i] *= -0.3;
      }
      const k = this.life[i] / this.maxLife[i];
      const sz = this.size[i] * (k < 0.3 ? k / 0.3 : 1);
      this.e.set(this.spin[i] * k, this.spin[i] * 0.7 * k, 0);
      this.q.setFromEuler(this.e);
      this.p.set(this.px[i], this.py[i], this.pz[i]);
      this.s.set(sz, sz, sz);
      this.mesh.setMatrixAt(i, this.m.compose(this.p, this.q, this.s));
      i++;
    }
    this.mesh.count = this.alive;
    if (this.alive > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Remove particle i by moving the last live particle into its slot. */
  private kill(i: number): void {
    const last = --this.alive;
    if (i === last) return;
    this.px[i] = this.px[last];
    this.py[i] = this.py[last];
    this.pz[i] = this.pz[last];
    this.vx[i] = this.vx[last];
    this.vy[i] = this.vy[last];
    this.vz[i] = this.vz[last];
    this.life[i] = this.life[last];
    this.maxLife[i] = this.maxLife[last];
    this.size[i] = this.size[last];
    this.grav[i] = this.grav[last];
    this.drift[i] = this.drift[last];
    this.spin[i] = this.spin[last];
    this.mesh.getColorAt(last, this.c);
    this.mesh.setColorAt(i, this.c);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
