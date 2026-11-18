import * as THREE from 'three';
import type { BackdropId } from '../data/zones';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Merge meshes (all children of `g`) into one geometry with baked vertex colours. */
function mergeColoured(g: THREE.Group): THREE.BufferGeometry {
  g.updateMatrixWorld(true);
  const geos: THREE.BufferGeometry[] = [];
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(geo.attributes)) if (k !== 'position') geo.deleteAttribute(k);
    const col = (m.material as THREE.MeshBasicMaterial).color;
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([col.r, col.g, col.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    geos.push(geo);
  });
  return mergeGeometries(geos, false)!;
}

/**
 * A bright storybook sky: gradient dome, puffy cartoon clouds, an optional rainbow,
 * and pale skyline silhouettes on the horizon. Everything follows the camera and
 * ignores fog, so the sky always stays cheerful.
 */
export class Sky {
  readonly root = new THREE.Group();
  private readonly uniforms = {
    top: { value: new THREE.Color(0x3fb6ff) },
    bottom: { value: new THREE.Color(0xfff0b8) },
  };
  /** All the clouds merged into one mesh, slowly turning round the sky. */
  private readonly cloudLayer: THREE.Mesh;
  private readonly rainbow: THREE.Group;
  private readonly rainbowMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, fog: false, depthWrite: false });
  private readonly backdrops = new Map<BackdropId, THREE.Group>();
  private readonly backdropMat: THREE.MeshBasicMaterial;
  private time = 0;

  constructor(scene: THREE.Scene) {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(320, 24, 12),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: /* glsl */ `
          varying float vH;
          void main() {
            vH = normalize(position).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top;
          uniform vec3 bottom;
          varying float vH;
          void main() {
            float t = smoothstep(-0.05, 0.55, vH);
            gl_FragColor = vec4(mix(bottom, top, t), 1.0);
            #include <colorspace_fragment>
          }`,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    dome.renderOrder = -10;
    this.root.add(dome);

    // Puffy clouds: clusters of flattened white spheres, drifting slowly.
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    const shadeMat = new THREE.MeshBasicMaterial({ color: 0xe6f1ff, fog: false });
    const puff = new THREE.SphereGeometry(1, 12, 8);
    const cloudGroup = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      const n = 4 + (i % 3);
      for (let k = 0; k < n; k++) {
        const p = new THREE.Mesh(puff, k === 0 ? shadeMat : cloudMat);
        const s = 5 + ((k * 37 + i * 13) % 6);
        p.scale.set(s * 1.4, s * 0.8, s);
        p.position.set((k - n / 2) * 7, (k % 2) * 3, (k % 3) * 2);
        c.add(p);
      }
      const a = (i / 9) * Math.PI * 1.4 - Math.PI * 0.7;
      c.position.set(Math.sin(a) * 210, 55 + (i % 4) * 16, -Math.cos(a) * 210);
      cloudGroup.add(c);
    }
    this.cloudLayer = new THREE.Mesh(mergeColoured(cloudGroup), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    this.root.add(this.cloudLayer);

    // Rainbow arc (shown after a drizzle shower).
    this.rainbow = new THREE.Group();
    const bands = [0xff3b3b, 0xff9f1c, 0xffe14d, 0x4cd964, 0x3fa9ff, 0x7b5cff];
    const arcs = new THREE.Group();
    bands.forEach((col, i) => arcs.add(new THREE.Mesh(new THREE.TorusGeometry(120 - i * 4, 2.1, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: col }))));
    this.rainbow.add(new THREE.Mesh(mergeColoured(arcs), this.rainbowMat));
    this.rainbow.position.set(30, -10, -230);
    this.rainbow.renderOrder = -8;
    this.root.add(this.rainbow);

    // Skyline silhouettes, tinted toward the horizon colour.
    this.backdropMat = new THREE.MeshBasicMaterial({ color: 0xbfd9f2, fog: false });
    for (const id of ['bigBen', 'eye', 'shard', 'gherkin', 'dome', 'bridge'] as BackdropId[]) {
      const g = mergeBackdrop(backdrop(id, this.backdropMat), this.backdropMat);
      g.visible = false;
      g.renderOrder = -9;
      g.scale.setScalar(0.65);
      this.root.add(g);
      this.backdrops.set(id, g);
    }

    scene.add(this.root);
  }

  setColors(top: THREE.Color, bottom: THREE.Color): void {
    this.uniforms.top.value.copy(top);
    this.uniforms.bottom.value.copy(bottom);
    // Distant skyline: a soft mix of the horizon and sky colours.
    this.backdropMat.color.copy(bottom).lerp(top, 0.3);
  }

  /** Show the skyline pieces for the current zone. */
  setBackdrop(ids: readonly BackdropId[]): void {
    for (const [id, g] of this.backdrops) g.visible = ids.includes(id);
  }

  /** 0..1 rainbow visibility. */
  setRainbow(amount: number): void {
    this.rainbow.visible = amount > 0.01;
    this.rainbowMat.opacity = 0.75 * amount;
  }

  update(dt: number, camera: THREE.Camera): void {
    this.time += dt;
    this.root.position.set(camera.position.x, 0, camera.position.z);
    this.cloudLayer.rotation.y += dt * 0.004;
  }
}

function backdrop(id: BackdropId, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, x: number, y: number, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  switch (id) {
    case 'bigBen':
      add(new THREE.BoxGeometry(6, 60, 6), 0, 30);
      add(new THREE.BoxGeometry(8, 9, 8), 0, 62);
      add(new THREE.ConeGeometry(5.5, 16, 4), 0, 74).rotation.y = Math.PI / 4;
      g.position.set(-70, 0, -230);
      break;
    case 'eye':
      add(new THREE.TorusGeometry(34, 1.6, 6, 48), 0, 40);
      add(new THREE.CylinderGeometry(0.8, 1.2, 46, 6), -8, 20).rotation.z = 0.3;
      g.position.set(80, 0, -240);
      break;
    case 'shard':
      add(new THREE.ConeGeometry(14, 120, 4), 0, 60).rotation.y = 0.4;
      g.position.set(70, 0, -250);
      break;
    case 'gherkin': {
      const m = add(new THREE.SphereGeometry(10, 16, 12), 0, 26);
      m.scale.set(1, 2.6, 1);
      g.position.set(-60, 0, -240);
      break;
    }
    case 'dome':
      add(new THREE.CylinderGeometry(15, 15, 14, 20), 0, 22);
      add(new THREE.SphereGeometry(14, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 29);
      add(new THREE.CylinderGeometry(2, 2.4, 10, 8), 0, 47);
      add(new THREE.BoxGeometry(60, 18, 20), 0, 9);
      g.position.set(-90, 0, -250);
      break;
    case 'bridge':
      for (const x of [-25, 25]) {
        add(new THREE.BoxGeometry(10, 48, 10), x, 24);
        add(new THREE.ConeGeometry(7, 10, 4), x, 53).rotation.y = Math.PI / 4;
      }
      add(new THREE.BoxGeometry(50, 3, 4), 0, 42);
      g.position.set(60, 0, -240);
      break;
  }
  return g;
}

/** Collapse a backdrop silhouette into one mesh (single colour). */
function mergeBackdrop(g: THREE.Group, mat: THREE.Material): THREE.Group {
  const pos = g.position.clone();
  g.position.set(0, 0, 0);
  const geo = mergeColoured(g);
  geo.deleteAttribute('color');
  const out = new THREE.Group();
  out.add(new THREE.Mesh(geo, mat));
  out.position.copy(pos);
  return out;
}
