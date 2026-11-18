import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config';
import { OBSTACLES } from '../game/ObstacleTypes';
import { toon, toonMap } from '../render/ToonMaterials';
import { signTexture, stripeTexture } from '../render/Textures';
import { mergeStatic } from '../render/Merge';
import { outlineTree } from '../render/Outline';

/**
 * Street obstacles, built from primitives. Every model is centred on its footprint
 * (origin at ground level, middle of its length) with its front facing +z, and is
 * sized from OBSTACLES so the visuals match the colliders.
 */

const RED = 0xd42e25;

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

function finish(g: THREE.Group, outline = true): THREE.Group {
  mergeStatic(g);
  if (outline) outlineTree(g);
  return g;
}

/** Red telephone kiosk with a domed roof, glazing bars and TELEPHONE signs. */
export function buildPhoneBox(): THREE.Group {
  const g = new THREE.Group();
  const red = toon(RED);
  const glass = toon(0xbfdce8, { emissive: 0x5d8aa0, emissiveIntensity: 0.15 });
  const s = OBSTACLES.phoneBox;
  const w = s.width - 0.1;
  g.add(mesh(new RoundedBoxGeometry(w + 0.08, 0.16, w + 0.08, 2, 0.04), toon(0x55585e), 0, 0.08, 0));
  g.add(mesh(new RoundedBoxGeometry(w, 2.25, w, 2, 0.06), red, 0, 1.28, 0));
  // Glazed panels on all four sides: a light pane with red glazing bars over it.
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2;
    const nx = Math.sin(a);
    const nz = Math.cos(a);
    const pane = mesh(new THREE.BoxGeometry(w - 0.3, 1.55, 0.03), glass, nx * (w / 2 + 0.005), 1.18, nz * (w / 2 + 0.005));
    pane.rotation.y = a;
    g.add(pane);
    for (let r = 1; r < 6; r++) {
      const bar = mesh(new THREE.BoxGeometry(w - 0.3, 0.05, 0.05), red, nx * (w / 2 + 0.02), 0.41 + r * 0.26, nz * (w / 2 + 0.02));
      bar.rotation.y = a;
      g.add(bar);
    }
    for (const off of [-0.17, 0.17]) {
      const bar = mesh(new THREE.BoxGeometry(0.05, 1.55, 0.05), red, nx * (w / 2 + 0.02) + nz * off, 1.18, nz * (w / 2 + 0.02) - nx * off);
      bar.rotation.y = a;
      g.add(bar);
    }
    const sign = mesh(new THREE.BoxGeometry(w - 0.2, 0.17, 0.03), toonMap(signTexture(['TELEPHONE'], 0xf4efe0, 0x2b2118, 256, 40), { emissive: 0x403a2a, emissiveIntensity: 0.4 }), nx * (w / 2 + 0.01), 2.18, nz * (w / 2 + 0.01));
    sign.rotation.y = a;
    g.add(sign);
  }
  g.add(mesh(new RoundedBoxGeometry(w + 0.12, 0.14, w + 0.12, 2, 0.04), red, 0, 2.45, 0));
  const dome = mesh(new THREE.SphereGeometry(w * 0.62, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 2.5, 0);
  dome.scale.set(1, 0.38, 1);
  g.add(dome);
  return finish(g);
}

/** Red pillar post box with a domed cap, posting slot and plaque. */
export function buildPostBox(): THREE.Group {
  const g = new THREE.Group();
  const red = toon(RED);
  const r = OBSTACLES.postBox.width / 2 - 0.02;
  g.add(mesh(new THREE.CylinderGeometry(r + 0.02, r + 0.04, 0.12, 18), toon(0x2a2a2e), 0, 0.06, 0));
  g.add(mesh(new THREE.CylinderGeometry(r, r, 0.92, 18), red, 0, 0.56, 0));
  g.add(mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.08, 18), red, 0, 1.04, 0));
  const cap = mesh(new THREE.SphereGeometry(r + 0.02, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 1.07, 0);
  cap.scale.set(1, 0.45, 1);
  g.add(cap);
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.05, 0.06), toon(0x1a1a1a), 0, 0.86, r - 0.01));
  g.add(mesh(new THREE.BoxGeometry(0.26, 0.18, 0.04), toon(0xf4efe0), 0, 0.6, r));
  return finish(g);
}

/** Roadworks barrier: red-and-white board on white legs, a lamp, and cones at the lane edges. */
export function buildBarrier(): THREE.Group {
  const g = new THREE.Group();
  const white = toon(0xf4f1ea);
  const s = OBSTACLES.barrier;
  const board = toonMap(stripeTexture(0xd42e25, 0xf4f1ea, 7));
  // Board stripes run across: rotate the UVs by building the board as a rotated box.
  const b = mesh(new THREE.BoxGeometry(0.34, s.width - 0.15, 0.08), board, 0, 0.82, 0);
  b.rotation.z = Math.PI / 2;
  g.add(b);
  const rail = mesh(new THREE.BoxGeometry(0.16, s.width - 0.3, 0.06), board, 0, 0.36, 0);
  rail.rotation.z = Math.PI / 2;
  g.add(rail);
  for (const side of [-1, 1]) {
    for (const lean of [-1, 1]) {
      const leg = mesh(new THREE.BoxGeometry(0.07, 1.05, 0.07), white, side * (s.width / 2 - 0.15), 0.5, lean * 0.12);
      leg.rotation.x = lean * 0.2;
      g.add(leg);
    }
  }
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 10), toon(0xffb020, { emissive: 0xff8a00, emissiveIntensity: 0.6 }), -s.width / 2 + 0.2, 1.08, 0));
  // Traffic cones sit on the lane lines, clear of the running line.
  const orange = toon(0xf26b1d);
  for (const side of [-1, 1]) {
    const x = side * (CONFIG.lanes.width / 2 - 0.05);
    g.add(mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), orange, x, 0.03, 0.45));
    g.add(mesh(new THREE.ConeGeometry(0.17, 0.62, 14), orange, x, 0.37, 0.45));
    g.add(mesh(new THREE.CylinderGeometry(0.085, 0.115, 0.11, 14), white, x, 0.4, 0.45));
  }
  return finish(g);
}

/** Low overhead gantry with a "MIND THE GAP" board: roll under it. */
export function buildSign(): THREE.Group {
  const g = new THREE.Group();
  const s = OBSTACLES.sign;
  const pole = toon(0x2b2f36);
  for (const side of [-1, 1]) {
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, s.height, 8), pole, side * (s.width / 2 + 0.02), s.height / 2, 0));
  }
  g.add(mesh(new THREE.BoxGeometry(s.width + 0.15, 0.1, 0.1), pole, 0, s.height - 0.08, 0));
  g.add(mesh(new THREE.BoxGeometry(0.06, s.height - 1.85, 0.06), pole, -0.5, (s.height + 1.85) / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(0.06, s.height - 1.85, 0.06), pole, 0.5, (s.height + 1.85) / 2, 0));
  g.add(mesh(new THREE.BoxGeometry(s.width, 0.72, 0.1), toon(0x1f3c88), 0, s.yMin + 0.4, 0));
  // The lettering goes on front and back faces only.
  const face = toonMap(signTexture(['MIND THE GAP'], 0x1f3c88, 0xffffff, 512, 96), { emissive: 0x0a1430, emissiveIntensity: 0.3 });
  for (const dir of [1, -1]) {
    const p = mesh(new THREE.PlaneGeometry(s.width - 0.06, 0.66), face, 0, s.yMin + 0.4, dir * 0.052);
    p.rotation.y = dir > 0 ? 0 : Math.PI;
    p.userData.noOutline = true;
    g.add(p);
  }
  const hazard = mesh(new THREE.BoxGeometry(0.1, s.width, 0.11), toonMap(stripeTexture(0xf5c518, 0x222222, 12)), 0, s.yMin + 0.03, 0);
  hazard.rotation.z = Math.PI / 2;
  g.add(hazard);
  return finish(g);
}

/** A Royal Guard standing to attention in a red tunic and tall bearskin. */
export function buildGuard(): THREE.Group {
  const g = new THREE.Group();
  const red = toon(0xc8202a);
  const black = toon(0x1d1d22);
  const skin = toon(0xf0c8a0);
  const white = toon(0xf4f1ea);
  const gold = toon(0xe0b040);
  for (const side of [-1, 1]) {
    g.add(mesh(new THREE.CapsuleGeometry(0.11, 0.62, 4, 10), black, side * 0.13, 0.43, 0));
    const boot = mesh(new THREE.SphereGeometry(0.12, 10, 8), black, side * 0.13, 0.06, 0.05);
    boot.scale.set(1, 0.6, 1.5);
    g.add(boot);
    g.add(mesh(new THREE.CapsuleGeometry(0.085, 0.5, 4, 10), red, side * 0.36, 1.2, 0));
    g.add(mesh(new THREE.SphereGeometry(0.085, 10, 8), white, side * 0.37, 0.88, 0));
  }
  const tunic = mesh(new THREE.CapsuleGeometry(0.3, 0.5, 6, 14), red, 0, 1.22, 0);
  tunic.scale.set(1, 1, 0.75);
  g.add(tunic);
  g.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.08, 16), white, 0, 1.02, 0));
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.SphereGeometry(0.03, 6, 6), gold, 0, 1.12 + i * 0.12, 0.22));
  g.add(mesh(new THREE.SphereGeometry(0.17, 14, 10), skin, 0, 1.78, 0.02));
  // Chin strap and eyes (closed, very serious).
  const strap = mesh(new THREE.TorusGeometry(0.15, 0.015, 6, 16, Math.PI), gold, 0, 1.78, 0.05);
  strap.rotation.z = Math.PI;
  g.add(strap);
  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.BoxGeometry(0.06, 0.012, 0.02), black, side * 0.06, 1.8, 0.17);
    eye.userData.noOutline = true;
    g.add(eye);
  }
  const bearskin = mesh(new THREE.CapsuleGeometry(0.22, 0.42, 6, 14), black, 0, 2.2, -0.01);
  bearskin.scale.set(1, 1, 0.95);
  g.add(bearskin);
  return finish(g);
}

/** A shallow puddle (drawn without an outline, flat on the road). */
export function buildPuddle(): THREE.Group {
  const g = new THREE.Group();
  const s = OBSTACLES.puddle;
  const water = mesh(new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), toon(0x6fa6c8, { opacity: 0.85, emissive: 0x2a5878, emissiveIntensity: 0.25 }), 0, 0.015, 0);
  water.scale.set(s.width, 1, s.length);
  g.add(water);
  const shine = mesh(new THREE.RingGeometry(0.3, 0.36, 24).rotateX(-Math.PI / 2), toon(0xe6f4ff, { emissive: 0xbfe0ff, emissiveIntensity: 0.5 }), -0.25, 0.02, -0.3);
  shine.scale.set(s.width * 0.5, 1, s.length * 0.4);
  g.add(shine);
  return finish(g, false);
}

/** A builder's ramp leading up to a bus roof, with hazard chevrons on the slope. */
export function buildRamp(): THREE.Group {
  const g = new THREE.Group();
  const s = OBSTACLES.ramp;
  const L = s.length;
  const H = s.height;
  const W = s.width - 0.15;
  const shape = new THREE.Shape();
  shape.moveTo(-L / 2, 0);
  shape.lineTo(L / 2, 0);
  shape.lineTo(L / 2, H);
  shape.closePath();
  const wedge = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
  wedge.rotateY(Math.PI / 2);
  wedge.translate(-W / 2, 0, 0);
  g.add(mesh(wedge, toon(0x8b8f96)));
  const slope = Math.hypot(L, H);
  const plane = mesh(new THREE.PlaneGeometry(W, slope), toonMap(stripeTexture(0xf5c518, 0x2b2b2b, 10)), 0, H / 2 + 0.02, 0);
  plane.rotation.x = -Math.PI / 2 + Math.atan2(H, L);
  plane.userData.noOutline = true;
  g.add(plane);
  return finish(g);
}

export interface PigeonFlock {
  root: THREE.Group;
  /** Animate flapping; `scatter` 0..1 sends them flying up and away. */
  update(t: number, scatter: number): void;
}

/** A small flock of fluttering pigeons hovering at head height: roll under them. */
export function buildPigeons(): PigeonFlock {
  const root = new THREE.Group();
  const grey = toon(0x8d919c);
  const wingMat = toon(0x6f7480);
  const s = OBSTACLES.pigeons;

  // One merged body (body + head + neck ring + beak) shared by every bird.
  const bodyParts = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.16, 12, 8), grey);
  body.scale.set(0.85, 0.8, 1.25);
  bodyParts.add(body);
  bodyParts.add(mesh(new THREE.SphereGeometry(0.095, 10, 8), grey, 0, 0.1, 0.15));
  bodyParts.add(mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12), toon(0x4f9a7a), 0, 0.06, 0.12));
  const beak = mesh(new THREE.ConeGeometry(0.025, 0.08, 6), toon(0xe0a040), 0, 0.09, 0.26);
  beak.rotation.x = Math.PI / 2;
  bodyParts.add(beak);
  mergeStatic(bodyParts);
  const bodyGeo = (bodyParts.children[0] as THREE.Mesh).geometry;
  const bodyMat = (bodyParts.children[0] as THREE.Mesh).material as THREE.Material;
  const extra = bodyParts.children.slice(1) as THREE.Mesh[];
  const wingGeo = new THREE.BoxGeometry(0.34, 0.025, 0.16).translate(0.17, 0, 0);

  const birds: { g: THREE.Group; wl: THREE.Mesh; wr: THREE.Mesh; phase: number; base: THREE.Vector3 }[] = [];
  const spots = [
    [-0.6, 1.35, 0.3],
    [0.55, 1.5, -0.2],
    [0, 1.95, 0.1],
    [-0.35, 2.0, -0.45],
    [0.7, 1.95, 0.45],
  ];
  spots.forEach(([x, y, z], i) => {
    const bird = new THREE.Group();
    const b = new THREE.Mesh(bodyGeo, bodyMat);
    bird.add(b);
    for (const m of extra) bird.add(new THREE.Mesh(m.geometry, m.material));
    const wl = new THREE.Mesh(wingGeo, wingMat);
    wl.position.set(0.08, 0.03, 0);
    const wr = new THREE.Mesh(wingGeo, wingMat);
    wr.position.set(-0.08, 0.03, 0);
    wr.rotation.y = Math.PI;
    bird.add(wl, wr);
    bird.position.set(x * (s.width / 2), y, z);
    bird.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.5;
    root.add(bird);
    birds.push({ g: bird, wl, wr, phase: i * 1.7, base: bird.position.clone() });
  });
  outlineTree(root, CONFIG.render.characterOutline);

  return {
    root,
    update(t: number, scatter: number): void {
      for (const b of birds) {
        const flap = Math.sin(t * 22 + b.phase) * (0.8 + scatter * 0.4);
        b.wl.rotation.z = flap;
        b.wr.rotation.z = -flap;
        b.g.position.set(
          b.base.x * (1 + scatter * 2.5),
          b.base.y + Math.sin(t * 3 + b.phase) * 0.08 + scatter * scatter * 6,
          b.base.z + scatter * 2,
        );
      }
    },
  };
}

/** Coin geometry and materials, shared by the instanced coin renderer. */
export function coinParts(): Record<'penny' | 'sovereign' | 'token', { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[] }> {
  const disc = (r: number) => new THREE.CylinderGeometry(r, r, 0.08, 22).rotateX(Math.PI / 2);
  const tokenFace = toonMap(tokenTexture(), { emissive: 0x0b4a44, emissiveIntensity: 0.35 });
  return {
    penny: { geo: disc(0.3), mat: toon(0xd0803c, { emissive: 0x6a3008, emissiveIntensity: 0.35 }) },
    sovereign: { geo: disc(0.38), mat: toon(0xffd34a, { emissive: 0x8a5a00, emissiveIntensity: 0.5 }) },
    token: { geo: disc(0.42), mat: [toon(0xf0b429), tokenFace, tokenFace] },
  };
}

let tokenTex: THREE.Texture | null = null;
/** Teal token face with a gold rim and a little teapot silhouette. */
function tokenTexture(): THREE.Texture {
  if (tokenTex) return tokenTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#f0b429';
  x.beginPath();
  x.arc(64, 64, 64, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#1f9e8f';
  x.beginPath();
  x.arc(64, 64, 52, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#ffd86b';
  x.beginPath();
  x.ellipse(64, 72, 26, 21, 0, 0, Math.PI * 2);
  x.fill();
  x.fillRect(52, 44, 24, 8);
  x.beginPath();
  x.arc(64, 42, 6, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.moveTo(86, 70);
  x.lineTo(104, 54);
  x.lineTo(108, 58);
  x.lineTo(90, 80);
  x.fill();
  x.lineWidth = 6;
  x.strokeStyle = '#ffd86b';
  x.beginPath();
  x.arc(38, 70, 11, Math.PI * 0.5, Math.PI * 1.5);
  x.stroke();
  tokenTex = new THREE.CanvasTexture(c);
  tokenTex.colorSpace = THREE.SRGBColorSpace;
  return tokenTex;
}

/** Tower Bridge with a bascule lifted: the Thames shows through a gap in the road. */
export function buildBridgeGap(): THREE.Group {
  const g = new THREE.Group();
  const s = OBSTACLES.gap;
  const water = mesh(new THREE.PlaneGeometry(s.width, s.length - 0.4).rotateX(-Math.PI / 2), toon(0x1fb5e8, { emissive: 0x0e7fb0, emissiveIntensity: 0.35 }), 0, 0.03, 0);
  g.add(water);
  // Dark drop at the edges, and the two raised leaf lips with hazard stripes.
  const drop = toon(0x1d3557);
  for (const dir of [1, -1]) {
    g.add(mesh(new THREE.BoxGeometry(s.width, 0.05, 0.25), drop, 0, 0.04, dir * (s.length / 2 - 0.32)));
    const lip = mesh(new THREE.BoxGeometry(s.width, 0.12, 0.5), toonMap(stripeTexture(0xf5c518, 0x222222, 8)), 0, 0.12, dir * (s.length / 2 - 0.05));
    lip.rotation.x = dir * 0.35;
    lip.userData.noOutline = true;
    g.add(lip);
  }
  return finish(g, false);
}
