import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toon, toonMap } from '../render/ToonMaterials';
import { signTexture } from '../render/Textures';
import { mergeStatic } from '../render/Merge';
import { outlineTree } from '../render/Outline';
import type { LandmarkId } from '../data/zones';

/**
 * Stylised, chunky, brightly coloured London landmarks built from primitives. Not
 * accurate models: recognisable, cheerful set pieces that slide past beside the road.
 *
 * Convention: origin on the ground at the landmark's centre; +z faces the camera
 * (back down the road); local +x points AWAY from the road on the right-hand side, so
 * a left-side landmark is mirrored by the caller. Each builder reports its depth
 * (extent away from the road) so it can be set back clear of the pavement.
 */
export interface Landmark {
  root: THREE.Group;
  /** Distance from the road edge side of the model to its far side. */
  depth: number;
  /** Per-frame animation (wheel turning, clock hands, screens...). */
  update?: (dt: number, t: number) => void;
}

// ---------- tiny helpers ----------
function add(g: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const box = (w: number, h: number, d: number, r = 0): THREE.BufferGeometry => (r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d));
const cyl = (rt: number, rb: number, h: number, seg = 16): THREE.BufferGeometry => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r: number, h: number, seg = 4): THREE.BufferGeometry => new THREE.ConeGeometry(r, h, seg);

/** A facade texture with a grid of bright windows (cached by its parameters). */
const facadeCache = new Map<string, THREE.Texture>();
function facadeTexture(cols: number, rows: number, wall: number, glass: number, frame = 0xffffff, arch = false): THREE.Texture {
  const key = `${cols}x${rows}-${wall}-${glass}-${frame}-${arch}`;
  const hit = facadeCache.get(key);
  if (hit) return hit;
  const W = 32 * cols;
  const H = 40 * rows;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  x.fillStyle = hex(wall);
  x.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const wx = k * 32 + 8;
      const wy = r * 40 + 8;
      x.fillStyle = hex(frame);
      x.fillRect(wx - 3, wy - 3, 22, 30);
      x.fillStyle = hex(glass);
      if (arch) {
        x.beginPath();
        x.moveTo(wx, wy + 24);
        x.lineTo(wx, wy + 8);
        x.arc(wx + 8, wy + 8, 8, Math.PI, 0);
        x.lineTo(wx + 16, wy + 24);
        x.fill();
      } else {
        x.fillRect(wx, wy, 16, 24);
      }
      x.fillStyle = 'rgba(255,255,255,0.55)';
      x.fillRect(wx + 2, wy + 3, 4, 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  facadeCache.set(key, tex);
  return tex;
}

/** A box whose road-facing (+x... we use -x for right side) faces carry a window facade. */
function facadeBox(g: THREE.Object3D, w: number, h: number, d: number, wall: number, tex: THREE.Texture, x: number, y: number, z: number): void {
  const plain = toon(wall);
  const face = toonMap(tex);
  // Box material order: +x, -x, +y, -y, +z, -z. Windows on the sides facing the road (-x) and the camera (+z).
  const mats = [plain, face, plain, plain, face, plain];
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.position.set(x, y, z);
  m.userData.keep = true;
  g.add(m);
}

function finish(g: THREE.Group, outline = true): THREE.Group {
  mergeStatic(g);
  if (outline) outlineTree(g);
  return g;
}

// ---------- palette ----------
const C = {
  stone: 0xf6cf73,
  stoneLight: 0xffe7a6,
  cream: 0xfff3d6,
  white: 0xffffff,
  gold: 0xffc21a,
  teal: 0x2bb3a3,
  slate: 0x3a86b8,
  sky: 0x5bc8f5,
  red: 0xe63946,
  green: 0x52c75a,
  grass: 0x6fd35b,
  water: 0x2ec4f0,
  ink: 0x2b2118,
  bronze: 0xc98a2e,
  glass: 0x7fd3ff,
};

// ---------- Houses of Parliament ----------
function parliament(): Landmark {
  const g = new THREE.Group();
  const L = 92;
  const D = 12;
  facadeBox(g, D, 11, L, C.stone, facadeTexture(40, 4, C.stone, C.glass, C.stoneLight, true), D / 2, 5.5, 0);
  // Gothic pinnacles along the roofline, and steep blue roofs.
  const pin = toon(C.stoneLight);
  for (let z = -L / 2 + 2; z <= L / 2 - 2; z += 4) {
    add(g, cone(0.45, 2.4, 4), pin, 0.4, 12.2, z);
  }
  add(g, box(D - 2, 2.5, L - 2), toon(C.slate), D / 2 + 0.6, 12.2, 0).rotation.z = 0;
  // Victoria Tower at the far end with a flag.
  add(g, box(9, 30, 9), toon(C.stone), D / 2, 15, -L / 2 + 5);
  for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) add(g, cone(0.8, 3.5, 4), toon(C.gold), D / 2 + dx, 31.5, -L / 2 + 5 + dz);
  add(g, cyl(0.1, 0.1, 6, 6), toon(C.white), D / 2, 33, -L / 2 + 5);
  add(g, box(0.1, 2, 3.2), toonMap(unionFlag()), D / 2, 35, -L / 2 + 6.6);
  // Central lantern spire.
  add(g, box(4, 6, 4), toon(C.stoneLight), D / 2, 14, 2);
  add(g, cone(2.6, 9, 8), toon(C.slate), D / 2, 21.5, 2);
  add(g, cone(0.3, 2, 6), toon(C.gold), D / 2, 27, 2);
  return { root: finish(g), depth: D };
}

// ---------- Big Ben / Elizabeth Tower ----------
function bigBen(): Landmark {
  const g = new THREE.Group();
  const W = 7;
  add(g, box(W, 30, W), toon(C.stone), 0, 15, 0);
  // Vertical ribs.
  for (const s of [-1, 1]) for (const t of [-1, 1]) add(g, box(0.8, 30, 0.8), toon(C.stoneLight), s * (W / 2), 15, t * (W / 2));
  add(g, box(W + 1.2, 8, W + 1.2), toon(C.stoneLight), 0, 34, 0);
  add(g, box(W, 4, W), toon(C.stone), 0, 40, 0);
  // Belfry roof: a tall teal pyramid with gold trim and pinnacles.
  add(g, cone(W * 0.78, 10, 4), toon(C.teal), 0, 47, 0).rotation.y = Math.PI / 4;
  add(g, cyl(0.25, 0.25, 4, 6), toon(C.gold), 0, 53.5, 0);
  add(g, new THREE.SphereGeometry(0.6, 10, 8), toon(C.gold), 0, 55.8, 0);
  for (const s of [-1, 1]) for (const t of [-1, 1]) add(g, cone(0.5, 3, 4), toon(C.gold), s * (W / 2 + 0.3), 43.5, t * (W / 2 + 0.3));
  finish(g);

  // Clock faces on the camera side and the road side, with hands that tell the real time.
  const faceMat = toonMap(clockFace(), { emissive: 0xfff4c0, emissiveIntensity: 0.35 });
  const hands: { hour: THREE.Object3D; minute: THREE.Object3D }[] = [];
  const handMat = toon(C.ink);
  for (const [nx, nz, ry] of [[0, 1, 0], [-1, 0, -Math.PI / 2]] as const) {
    const face = new THREE.Group();
    face.position.set(nx * (W / 2 + 0.62), 34, nz * (W / 2 + 0.62));
    face.rotation.y = ry;
    g.add(face);
    add(face, new THREE.CircleGeometry(3.2, 32), faceMat).userData.noOutline = true;
    add(face, new THREE.TorusGeometry(3.25, 0.22, 6, 32), toon(C.gold));
    const hour = new THREE.Group();
    add(hour, box(0.3, 1.9, 0.08), handMat, 0, 0.9, 0.08);
    const minute = new THREE.Group();
    add(minute, box(0.2, 2.8, 0.08), handMat, 0, 1.35, 0.12);
    face.add(hour, minute);
    hands.push({ hour, minute });
  }
  let last = -1;
  return {
    root: g,
    depth: W,
    update: () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      if (mins === last) return;
      last = mins;
      for (const h of hands) {
        h.minute.rotation.z = -(now.getMinutes() / 60) * Math.PI * 2;
        h.hour.rotation.z = -(((mins / 60) % 12) / 12) * Math.PI * 2;
      }
    },
  };
}

function clockFace(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fffaf0';
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = '#2b2118';
  x.lineWidth = 6;
  x.beginPath();
  x.arc(128, 128, 118, 0, Math.PI * 2);
  x.stroke();
  x.fillStyle = '#2b2118';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    x.save();
    x.translate(128 + Math.sin(a) * 98, 128 - Math.cos(a) * 98);
    x.rotate(a);
    x.fillRect(-4, -14, 8, 28);
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let flagTex: THREE.Texture | null = null;
/** The Union Flag, drawn on a canvas. */
function unionFlag(): THREE.Texture {
  if (flagTex) return flagTex;
  const c = document.createElement('canvas');
  c.width = 120;
  c.height = 60;
  const x = c.getContext('2d')!;
  x.fillStyle = '#012169';
  x.fillRect(0, 0, 120, 60);
  x.strokeStyle = '#fff';
  x.lineWidth = 12;
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(120, 60);
  x.moveTo(120, 0);
  x.lineTo(0, 60);
  x.stroke();
  x.strokeStyle = '#C8102E';
  x.lineWidth = 4;
  x.stroke();
  x.fillStyle = '#fff';
  x.fillRect(50, 0, 20, 60);
  x.fillRect(0, 20, 120, 20);
  x.fillStyle = '#C8102E';
  x.fillRect(54, 0, 12, 60);
  x.fillRect(0, 24, 120, 12);
  flagTex = new THREE.CanvasTexture(c);
  flagTex.colorSpace = THREE.SRGBColorSpace;
  return flagTex;
}

// ---------- London Eye ----------
function londonEye(): Landmark {
  const g = new THREE.Group();
  const R = 24;
  const cx = 16;
  const hubY = R + 4;
  // Legs (A-frame) leaning from the bank.
  const white = toon(C.white);
  for (const dz of [-5, 5]) {
    const leg = add(g, cyl(0.5, 0.7, 30, 8), white, cx - 9, 14, dz);
    leg.rotation.z = -0.55;
  }
  finish(g);
  const wheel = new THREE.Group();
  wheel.position.set(cx, hubY, 0);
  const rim = toon(C.white);
  add(wheel, new THREE.TorusGeometry(R, 0.45, 8, 64), rim);
  add(wheel, new THREE.TorusGeometry(R - 2, 0.25, 6, 64), rim);
  add(wheel, cyl(1.4, 1.4, 2.5, 16).rotateX(Math.PI / 2), toon(C.sky));
  for (let i = 0; i < 16; i++) {
    const spoke = add(wheel, cyl(0.1, 0.1, R * 2, 4), rim);
    spoke.rotation.z = (i / 16) * Math.PI;
  }
  const podMat = toon(C.glass, { emissive: 0x7fd3ff, emissiveIntensity: 0.25 });
  const podColors = [0xff6b3d, 0xffc93c, 0x4cc96f, 0xff4d6d];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const pod = add(wheel, new THREE.SphereGeometry(1.15, 10, 8), i % 4 === 0 ? toon(podColors[(i / 4) % 4]) : podMat, Math.cos(a) * (R + 1), Math.sin(a) * (R + 1), 0);
    pod.scale.set(1, 0.75, 1.6);
  }
  // The wheel faces down the road, so riders could wave at Jack.
  wheel.rotation.y = Math.PI / 2;
  finish(wheel);
  g.add(wheel);
  return {
    root: g,
    depth: cx + R,
    update: (dt) => {
      wheel.rotation.x += dt * 0.06;
    },
  };
}

// ---------- Tower of London ----------
function towerOfLondon(): Landmark {
  const g = new THREE.Group();
  const lawn = toon(C.grass);
  add(g, box(30, 0.3, 54), lawn, 15, 0.15, 0);
  // Curtain wall with crenellations.
  const wall = toon(C.cream);
  for (const [w, d, x, z] of [[1.5, 52, 1, 0], [1.5, 52, 29, 0], [28, 1.5, 15, 26], [28, 1.5, 15, -26]] as const) add(g, box(w, 4, d), wall, x, 2, z);
  for (let z = -25; z <= 25; z += 2.5) add(g, box(1.6, 0.8, 1), wall, 1, 4.4, z);
  // The White Tower with four onion-domed turrets.
  facadeBox(g, 16, 14, 18, C.white, facadeTexture(6, 3, C.white, C.glass, 0xffe7a6, true), 15, 7, 0);
  for (const [dx, dz] of [[-8, -9], [8, -9], [-8, 9], [8, 9]]) {
    add(g, cyl(1.6, 1.6, 17, 12), toon(C.white), 15 + dx, 8.5, dz);
    add(g, new THREE.SphereGeometry(1.9, 12, 10), toon(C.slate), 15 + dx, 17.6, dz).scale.set(1, 1.3, 1);
    add(g, cone(0.25, 2.2, 6), toon(C.gold), 15 + dx, 20.3, dz);
  }
  // Ravens perched on the wall.
  const raven = toon(0x1c1c28);
  for (const z of [-18, -6, 7, 19]) {
    add(g, new THREE.SphereGeometry(0.45, 8, 6), raven, 1, 5.2, z).scale.set(0.7, 0.8, 1.3);
    add(g, new THREE.SphereGeometry(0.28, 8, 6), raven, 1, 5.7, z + 0.45);
    add(g, cone(0.1, 0.35, 5), toon(C.gold), 1, 5.65, z + 0.8).rotation.x = Math.PI / 2;
  }
  return { root: finish(g), depth: 30 };
}

// ---------- Tower Bridge (spans the road) ----------
function towerBridge(towerGap: number): Landmark {
  const g = new THREE.Group();
  const stone = toon(C.stoneLight);
  const blue = toon(C.sky);
  const slate = toon(C.slate);
  const piersX = 8;
  for (const z of [towerGap / 2, -towerGap / 2]) {
    for (const s of [-1, 1]) {
      facadeBox(g, 4.5, 26, 6, C.stoneLight, facadeTexture(2, 6, C.stoneLight, C.glass, C.white, true), s * piersX, 13, z);
      add(g, cone(3.6, 6, 4), slate, s * piersX, 29, z).rotation.y = Math.PI / 4;
      add(g, cone(0.3, 2.5, 6), toon(C.gold), s * piersX, 33, z);
      for (const dz of [-2.6, 2.6]) add(g, cone(0.55, 3, 4), slate, s * (piersX + 1.9), 27, z + dz);
    }
    // Gothic arch over the road, painted blue and white.
    add(g, box(piersX * 2 + 2, 3, 6.4), stone, 0, 19.5, z);
    add(g, box(piersX * 2 - 4, 1.2, 6.6), blue, 0, 17.6, z);
    // Suspension chains sweeping down to the banks.
    for (const s of [-1, 1]) {
      const dir = Math.sign(z);
      const chain = add(g, box(0.7, 0.7, 40), blue, s * (piersX + 2.5), 13, z + dir * 19);
      chain.rotation.x = dir * 0.42;
    }
  }
  // The high-level walkways joining the two towers.
  for (const y of [24, 25.8]) add(g, box(4, 1.2, towerGap - 5), blue, 0, y, 0);
  add(g, box(4.4, 0.4, towerGap - 5), toon(C.white), 0, 24.9, 0);
  // Railings along the bridge deck.
  for (const s of [-1, 1]) add(g, box(0.25, 1.1, towerGap + 70), blue, s * 7.8, 0.55, 0);
  return { root: finish(g), depth: 0 };
}

// ---------- Buckingham Palace ----------
function buckingham(): Landmark {
  const g = new THREE.Group();
  const L = 104;
  const D = 16;
  add(g, box(D + 10, 0.3, L + 6), toon(0xf2e4c4), (D + 10) / 2 - 1, 0.15, 0);
  facadeBox(g, D, 14, L, C.cream, facadeTexture(44, 3, C.cream, C.glass, 0xffe7a6), 6 + D / 2, 7, 0);
  // Central portico: columns and a pediment, with the famous balcony draped in red.
  for (let z = -8; z <= 8; z += 2.6) add(g, cyl(0.45, 0.5, 11, 10), toon(C.white), 5.6, 6.5, z);
  const ped = add(g, cone(10, 3.4, 3), toon(C.cream), 5.8, 13.2, 0);
  ped.rotation.set(0, 0, Math.PI / 2);
  ped.scale.set(1, 0.9, 1);
  add(g, box(1.6, 0.9, 12), toon(C.red), 4.9, 9.8, 0);
  add(g, box(0.2, 0.2, L), toon(C.gold), 5.9, 14.1, 0);
  // Flagpole with the Union Flag.
  add(g, cyl(0.1, 0.1, 7, 6), toon(C.white), 6 + D / 2, 17.5, 0);
  add(g, box(0.1, 2.2, 3.6), toonMap(unionFlag()), 6 + D / 2, 20, 1.9);
  // Black and gold gates and railings in front.
  const black = toon(0x1f2433);
  add(g, box(0.25, 2.6, L), black, 0.8, 1.3, 0);
  for (let z = -L / 2; z <= L / 2; z += 2) add(g, cone(0.12, 0.5, 4), toon(C.gold), 0.8, 2.85, z);
  for (const z of [-20, 0, 20]) {
    add(g, box(0.6, 4, 0.6), toon(C.gold), 0.8, 2, z - 3);
    add(g, box(0.6, 4, 0.6), toon(C.gold), 0.8, 2, z + 3);
    add(g, new THREE.SphereGeometry(0.6, 10, 8), toon(C.gold), 0.8, 4.4, z);
  }
  return { root: finish(g), depth: D + 6 };
}

// ---------- Victoria Memorial ----------
function victoriaMemorial(): Landmark {
  const g = new THREE.Group();
  const marble = toon(C.white);
  const water = toon(C.water, { emissive: 0x1a90c0, emissiveIntensity: 0.25 });
  const cx = 12;
  add(g, cyl(12, 12, 0.6, 32), toon(0xf2e4c4), cx, 0.3, 0);
  add(g, cyl(10, 10.5, 0.9, 32), marble, cx, 0.9, 0);
  add(g, cyl(9.4, 9.4, 0.3, 32), water, cx, 1.3, 0);
  add(g, cyl(5, 6, 3, 8), marble, cx, 2.5, 0);
  add(g, box(4.2, 8, 4.2), marble, cx, 8, 0);
  add(g, cyl(1.6, 2.2, 3, 8), marble, cx, 13.5, 0);
  // The gilded Winged Victory on top.
  const gold = toon(C.gold, { emissive: 0x8a5a00, emissiveIntensity: 0.3 });
  add(g, new THREE.SphereGeometry(0.9, 12, 10), gold, cx, 15.9, 0).scale.set(1, 1.6, 1);
  add(g, new THREE.SphereGeometry(0.5, 10, 8), gold, cx, 17.8, 0);
  for (const s of [-1, 1]) {
    const wing = add(g, box(0.3, 2.6, 1.4), gold, cx, 17, s * 1.2);
    wing.rotation.x = s * 0.5;
  }
  return { root: finish(g), depth: 24 };
}

// ---------- Nelson's Column and the lions ----------
function nelson(): Landmark {
  const g = new THREE.Group();
  const cx = 14;
  const stone = toon(C.stoneLight);
  add(g, box(28, 0.3, 46), toon(0xf6e2b8), cx, 0.15, 0);
  add(g, box(9, 5, 9), stone, cx, 2.5, 0);
  add(g, cyl(1.6, 1.9, 34, 16), toon(0xfff1d0), cx, 22, 0);
  add(g, box(4.2, 2, 4.2), toon(C.bronze), cx, 40, 0);
  // Admiral on top: a little figure with a bicorne hat.
  const statue = toon(0xd9d0c0);
  add(g, cyl(0.7, 0.9, 2.6, 10), statue, cx, 42.3, 0);
  add(g, new THREE.SphereGeometry(0.55, 10, 8), statue, cx, 44, 0);
  add(g, box(0.5, 0.45, 1.8, 0.1), toon(0x2b2118), cx, 44.55, 0);
  // Four lions, one at each corner, on plinths.
  const lion = toon(C.bronze);
  for (const [dx, dz] of [[-6.5, -8], [6.5, -8], [-6.5, 8], [6.5, 8]]) {
    add(g, box(3, 2, 6), stone, cx + dx, 1, dz);
    add(g, new THREE.SphereGeometry(1.1, 12, 8), lion, cx + dx, 2.9, dz + 1).scale.set(1, 0.8, 2.1);
    add(g, new THREE.SphereGeometry(0.95, 12, 10), lion, cx + dx, 3.7, dz + (dz < 0 ? 2.7 : 2.7));
    add(g, new THREE.SphereGeometry(1.25, 12, 10), toon(0xa86a1e), cx + dx, 3.7, dz + 2.3);
  }
  // Fountains.
  const water = toon(C.water, { emissive: 0x1a90c0, emissiveIntensity: 0.3 });
  for (const dz of [-17, 17]) {
    add(g, cyl(5, 5, 0.9, 24), stone, cx, 0.45, dz);
    add(g, cyl(4.5, 4.5, 0.2, 24), water, cx, 0.95, dz);
    add(g, cyl(0.4, 0.6, 3.5, 8), stone, cx, 2.5, dz);
    add(g, cyl(0.25, 0.9, 1.6, 10), water, cx, 4.8, dz);
  }
  return { root: finish(g), depth: 28 };
}

// ---------- Piccadilly Circus: bright screens and the winged archer fountain ----------
const ADS: [string, number, number][] = [
  ['FIZZ-O POP!', 0xff4d6d, 0xffffff],
  ['CRUMPET CRUNCH', 0xffc93c, 0x2b2118],
  ['TEAPOT TV', 0x2ec4b6, 0xffffff],
  ['SCONE ZONE', 0x7b2cbf, 0xffe066],
  ['MARMALADE MILK', 0xff8a3d, 0xffffff],
  ['BRAVO BISCUITS', 0x46b5ff, 0xffffff],
];
function piccadilly(): Landmark {
  const g = new THREE.Group();
  facadeBox(g, 12, 12, 30, 0xfff1d0, facadeTexture(10, 3, 0xfff1d0, C.glass), 6, 6, 0);
  finish(g);
  // Screens on the road-facing side: each cycles through made-up adverts.
  const mats = ADS.map(([text, bg, fg]) => toonMap(signTexture([text], bg, fg, 512, 160), { emissive: 0xffffff, emissiveIntensity: 0.55 }));
  const screens: THREE.Mesh[] = [];
  const spots: [number, number, number, number][] = [
    [4.2, -7.5, 11, 4.4],
    [4.2, 6.5, 11, 4.4],
    [9.4, -7.5, 11, 3.8],
    [9.4, 6.5, 11, 3.8],
  ];
  spots.forEach(([y, z, w, h], i) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mats[i % mats.length]);
    s.position.set(-0.08, y, z);
    s.rotation.y = -Math.PI / 2;
    g.add(s);
    screens.push(s);
  });
  // The winged archer statue on its fountain, in front of the screens.
  const f = new THREE.Group();
  const silver = toon(0xd8dde6);
  add(f, cyl(2.6, 3, 1, 8), toon(0x8a6a4a), 0, 0.5, 0);
  add(f, cyl(1, 1.4, 3, 8), toon(0x8a6a4a), 0, 2.5, 0);
  add(f, new THREE.SphereGeometry(0.5, 10, 8), silver, 0, 4.6, 0).scale.set(1, 1.5, 1);
  add(f, new THREE.SphereGeometry(0.32, 10, 8), silver, 0, 5.6, 0);
  for (const s of [-1, 1]) add(f, box(0.12, 1.4, 0.8), silver, 0, 5, s * 0.6).rotation.x = s * 0.6;
  add(f, new THREE.TorusGeometry(0.6, 0.05, 4, 12, Math.PI), toon(C.gold), 0.4, 5.1, 0).rotation.y = Math.PI / 2;
  f.position.set(-3, 0, 12);
  finish(f);
  g.add(f);
  let t0 = 0;
  let k = 0;
  return {
    root: g,
    depth: 12,
    update: (dt) => {
      t0 += dt;
      if (t0 < 1.6) return;
      t0 = 0;
      k++;
      screens.forEach((s, i) => (s.material = mats[(i + k) % mats.length]));
    },
  };
}

// ---------- 221B Baker Street ----------
function baker221b(): Landmark {
  const g = new THREE.Group();
  facadeBox(g, 9, 12, 10, 0xd9542f, facadeTexture(3, 3, 0xd9542f, C.glass, C.white), 4.5, 6, 0);
  add(g, box(0.3, 3, 1.8), toon(0x16a34a), -0.1, 1.5, 0);
  add(g, box(0.32, 0.5, 1.3), toonMap(signTexture(['221B'], 0x111111, 0xffd23a, 128, 48)), -0.12, 3.4, 0).userData.noOutline = true;
  add(g, new THREE.SphereGeometry(0.1, 8, 6), toon(C.gold), -0.3, 1.5, 0.6);
  add(g, box(1.2, 0.3, 2.4), toon(C.white), -0.5, 0.15, 0);
  // Black railings and a gas lamp outside.
  for (let z = -4.6; z <= 4.6; z += 0.5) if (Math.abs(z) > 1.1) add(g, box(0.06, 1.1, 0.06), toon(0x111111), -0.6, 0.55, z);
  add(g, cyl(0.08, 0.1, 3.6, 6), toon(0x1f2433), -1.6, 1.8, 3.6);
  add(g, box(0.5, 0.7, 0.5), toon(0xffd166, { emissive: 0xffb703, emissiveIntensity: 0.8 }), -1.6, 3.9, 3.6);
  return { root: finish(g), depth: 9 };
}

// ---------- St Paul's Cathedral ----------
function stPauls(): Landmark {
  const g = new THREE.Group();
  const stone = toon(C.cream);
  const cx = 16;
  facadeBox(g, 22, 12, 70, C.cream, facadeTexture(24, 2, C.cream, C.glass, C.white, true), cx, 6, 0);
  // Drum ringed with columns, the great dome, lantern, golden ball and cross.
  add(g, cyl(9, 9, 6, 24), stone, cx, 15, 0);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    add(g, cyl(0.35, 0.35, 6, 6), toon(C.white), cx + Math.cos(a) * 9.4, 15, Math.sin(a) * 9.4);
  }
  add(g, cyl(8, 8.5, 2, 24), stone, cx, 19, 0);
  add(g, new THREE.SphereGeometry(8, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), toon(C.sky), cx, 20, 0).scale.set(1, 1.15, 1);
  add(g, cyl(1.2, 1.5, 4, 10), toon(C.white), cx, 31, 0);
  add(g, new THREE.SphereGeometry(0.9, 12, 10), toon(C.gold), cx, 33.8, 0);
  add(g, box(0.25, 2.2, 0.25), toon(C.gold), cx, 35.6, 0);
  add(g, box(0.25, 0.25, 1.2), toon(C.gold), cx, 35.9, 0);
  // West front: two bell towers and a columned portico facing the camera.
  for (const s of [-1, 1]) {
    add(g, box(5, 22, 5), stone, cx + s * 7, 11, 33);
    add(g, cyl(1.8, 2.2, 4, 10), toon(C.white), cx + s * 7, 24, 33);
    add(g, cone(1.6, 4, 8), toon(C.sky), cx + s * 7, 28, 33);
    add(g, new THREE.SphereGeometry(0.5, 8, 6), toon(C.gold), cx + s * 7, 30.3, 33);
  }
  for (let x = -4; x <= 4; x += 2) add(g, cyl(0.45, 0.5, 9, 10), toon(C.white), cx + x, 4.5, 36);
  const ped = add(g, cone(6.5, 2.6, 3), stone, cx, 10.4, 36);
  ped.rotation.set(Math.PI / 2, 0, 0);
  ped.scale.set(1, 1, 0.5);
  return { root: finish(g), depth: 28 };
}

// ---------- Camden: a bright painted footbridge over the road ----------
function camden(): Landmark {
  const g = new THREE.Group();
  const span = 22;
  add(g, box(span, 2, 3.4), toon(0xff5fa2), 0, 9, 0);
  add(g, box(span, 0.5, 3.6), toon(0xffd93b), 0, 10.2, 0);
  for (const s of [-1, 1]) {
    add(g, box(2, 9, 3.4), toon(0x7ed957), s * (span / 2 - 1), 4.5, 0);
    add(g, box(2.4, 0.6, 3.8), toon(0x5ec8ff), s * (span / 2 - 1), 0.3, 0);
  }
  const sign = add(g, new THREE.PlaneGeometry(14, 1.6), toonMap(signTexture(['CAMDEN MARKET'], 0xff5fa2, 0xffffff, 512, 64), { emissive: 0xff5fa2, emissiveIntensity: 0.25 }), 0, 9, 1.75);
  sign.userData.noOutline = true;
  return { root: finish(g), depth: 0 };
}

// ---------- Notting Hill: carnival bunting across the road ----------
function nottingHill(): Landmark {
  const g = new THREE.Group();
  const colors = [0xff4d6d, 0xffc93c, 0x4cc96f, 0x46b5ff, 0xb47cff, 0xff8a3d];
  const poleMat = toon(0xffffff);
  for (let row = 0; row < 5; row++) {
    const z = -24 + row * 12;
    for (const s of [-1, 1]) add(g, cyl(0.12, 0.14, 8, 6), poleMat, s * 7.6, 4, z);
    for (let i = 0; i < 18; i++) {
      const x = -7.2 + (i + 0.5) * (14.4 / 18);
      const sag = 7.2 - 1.2 * Math.cos(((x + 7.2) / 14.4) * Math.PI * 2 - Math.PI) - 1.2;
      const flag = add(g, cone(0.35, 0.8, 3), toon(colors[(i + row) % colors.length]), x, sag - 0.4, z);
      flag.rotation.x = Math.PI;
      flag.userData.noOutline = true;
    }
  }
  return { root: finish(g, false), depth: 0 };
}

/** Build the landmark for an id. `towerGap` is the distance between Tower Bridge's towers. */
export function buildLandmark(id: LandmarkId, towerGap = 130): Landmark {
  switch (id) {
    case 'parliament':
      return parliament();
    case 'bigBen':
      return bigBen();
    case 'londonEye':
      return londonEye();
    case 'towerOfLondon':
      return towerOfLondon();
    case 'towerBridge':
      return towerBridge(towerGap);
    case 'buckingham':
      return buckingham();
    case 'victoriaMemorial':
      return victoriaMemorial();
    case 'nelson':
      return nelson();
    case 'piccadilly':
      return piccadilly();
    case 'baker221b':
      return baker221b();
    case 'stPauls':
      return stPauls();
    case 'camden':
      return camden();
    case 'nottingHill':
      return nottingHill();
  }
}
