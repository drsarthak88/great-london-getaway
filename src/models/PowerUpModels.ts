import * as THREE from 'three';
import { CONFIG } from '../config';
import { toon } from '../render/ToonMaterials';
import { outlineTree } from '../render/Outline';
import { mergeStatic } from '../render/Merge';
import type { PowerKind } from '../powerups/PowerUps';
import { buildCab } from './Cab';
import { buildTeapot } from './Teapot';

/** Procedural models for the eight power-ups, their effects and their road pickups. */

const OUT = CONFIG.render.characterOutline;

function m(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Helicopter Tail rotor: two long blades and a hub; spins about its local y axis. */
export function buildRotor(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const blade = toon(0xe8862a);
  const tip = toon(0xb85f17);
  g.add(m(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10), toon(0x55585e)));
  for (const dir of [0, Math.PI / 2]) {
    const b = m(new THREE.BoxGeometry(1.5, 0.025, 0.13), blade);
    b.rotation.y = dir;
    g.add(b);
    for (const end of [-1, 1]) {
      const t = m(new THREE.BoxGeometry(0.16, 0.03, 0.14), tip, Math.cos(dir) * end * 0.72, 0, -Math.sin(dir) * end * 0.72);
      t.rotation.y = dir;
      g.add(t);
    }
  }
  mergeStatic(g);
  outlineTree(g, OUT);
  g.scale.setScalar(scale);
  return g;
}

/** Spring Tail coil: a ginger-and-steel helix, hanging down from its top (length 1). */
export function buildSpring(): THREE.Group {
  const g = new THREE.Group();
  const turns = 6;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= turns * 24; i++) {
    const t = i / (turns * 24);
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.14, -t, Math.sin(a) * 0.14));
  }
  const coil = m(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, 0.035, 6, false), toon(0xb9c0c8));
  g.add(coil);
  g.add(m(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14), toon(0xe8862a), 0, -1, 0));
  outlineTree(g, OUT);
  return g;
}

/** Brolly Glide: an open black umbrella. Built hanging along -y (handle at the origin). */
export function buildBrolly(): THREE.Group {
  const g = new THREE.Group();
  const black = toon(0x23232a);
  const wood = toon(0x7a4a26);
  g.add(m(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), toon(0x9a9da3), 0, -0.55, 0));
  const hook = m(new THREE.TorusGeometry(0.07, 0.022, 6, 12, Math.PI), wood, 0.07, 0.0, 0);
  hook.rotation.z = Math.PI;
  g.add(hook);
  // Canopy: an eight-panel dome opening toward the handle end (convex side away from it).
  const canopy = m(new THREE.SphereGeometry(0.72, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), black, 0, -1.05, 0);
  canopy.scale.set(1, 0.55, 1);
  canopy.rotation.x = Math.PI;
  g.add(canopy);
  g.add(m(new THREE.ConeGeometry(0.03, 0.14, 6).rotateX(Math.PI), toon(0x9a9da3), 0, -1.48, 0));
  outlineTree(g, OUT);
  return g;
}

/** Teacup Magnet: a floating china cup and saucer. */
export function buildTeacup(): THREE.Group {
  const g = new THREE.Group();
  const china = toon(0xfbf7ee);
  const band = toon(0x3d6fb6);
  const profile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.14, 0.0),
    new THREE.Vector2(0.2, 0.08),
    new THREE.Vector2(0.24, 0.26),
    new THREE.Vector2(0.22, 0.26),
    new THREE.Vector2(0.18, 0.1),
    new THREE.Vector2(0.0, 0.06),
  ];
  g.add(m(new THREE.LatheGeometry(profile, 18), china, 0, 0.06, 0));
  g.add(m(new THREE.TorusGeometry(0.235, 0.018, 6, 20).rotateX(Math.PI / 2), band, 0, 0.27, 0));
  g.add(m(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 18), toon(0x8a5a2b), 0, 0.29, 0));
  const handle = m(new THREE.TorusGeometry(0.075, 0.022, 6, 12, Math.PI * 1.3), china, 0.25, 0.18, 0);
  handle.rotation.z = -Math.PI * 0.65;
  g.add(handle);
  g.add(m(new THREE.CylinderGeometry(0.34, 0.26, 0.04, 20), china, 0, 0.02, 0));
  g.add(m(new THREE.TorusGeometry(0.3, 0.012, 6, 20).rotateX(Math.PI / 2), band, 0, 0.045, 0));
  outlineTree(g, OUT);
  return g;
}

/** Bobby's Helmet: a tall navy custodian helmet with a silver badge and top rose. */
export function buildHelmet(): THREE.Group {
  const g = new THREE.Group();
  const navy = toon(0x1f2a4a);
  const silver = toon(0xd5d9e0);
  const dome = m(new THREE.SphereGeometry(0.31, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), navy, 0, 0.0, 0);
  dome.scale.set(1, 1.55, 1.05);
  g.add(dome);
  g.add(m(new THREE.CylinderGeometry(0.34, 0.35, 0.05, 20), navy, 0, -0.04, 0));
  g.add(m(new THREE.CylinderGeometry(0.315, 0.315, 0.05, 20), silver, 0, 0.02, 0));
  const badge = m(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 8).rotateX(Math.PI / 2), silver, 0, 0.2, -0.31);
  badge.rotation.z = Math.PI / 8;
  g.add(badge);
  g.add(m(new THREE.SphereGeometry(0.05, 10, 8), silver, 0, 0.47, 0));
  mergeStatic(g);
  outlineTree(g, OUT);
  return g;
}

export interface CorgiModel {
  root: THREE.Group;
  /** `phase` drives the trotting legs; `bark` 0..1 opens the mouth and puffs the chest. */
  update(phase: number, bark: number): void;
}

/** Corgi Pal: short legs, big ears, fluffy white bib, orange-and-white coat. */
export function buildCorgi(): CorgiModel {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const orange = toon(0xe0913b);
  const white = toon(0xfbf3e4);
  const ink = toon(0x2b2118);
  const trunk = m(new THREE.CapsuleGeometry(0.2, 0.5, 6, 12).rotateX(Math.PI / 2), orange, 0, 0.36, 0);
  body.add(trunk);
  const belly = m(new THREE.CapsuleGeometry(0.15, 0.4, 4, 10).rotateX(Math.PI / 2), white, 0, 0.3, -0.02);
  body.add(belly);
  const head = new THREE.Group();
  head.position.set(0, 0.55, -0.42);
  body.add(head);
  head.add(m(new THREE.SphereGeometry(0.17, 14, 10), orange));
  const muzzle = m(new THREE.SphereGeometry(0.1, 10, 8), white, 0, -0.04, -0.13);
  muzzle.scale.set(1, 0.8, 1.2);
  head.add(muzzle);
  head.add(m(new THREE.SphereGeometry(0.035, 8, 6), ink, 0, 0.0, -0.25));
  for (const s of [-1, 1]) {
    const ear = m(new THREE.ConeGeometry(0.08, 0.22, 8), orange, s * 0.1, 0.17, 0);
    ear.rotation.z = -s * 0.25;
    head.add(ear);
    const eye = m(new THREE.SphereGeometry(0.025, 6, 6), ink, s * 0.07, 0.04, -0.15);
    eye.userData.noOutline = true;
    head.add(eye);
  }
  const mouth = m(new THREE.SphereGeometry(0.04, 8, 6), toon(0xd0505a), 0, -0.09, -0.18);
  mouth.scale.set(1.2, 0.2, 0.6);
  mouth.userData.noOutline = true;
  head.add(mouth);
  const tail = m(new THREE.SphereGeometry(0.08, 8, 6), white, 0, 0.45, 0.33);
  body.add(tail);
  const legs: THREE.Group[] = [];
  for (const [x, z] of [
    [-0.11, -0.22],
    [0.11, -0.22],
    [-0.11, 0.22],
    [0.11, 0.22],
  ]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.22, z);
    leg.add(m(new THREE.CapsuleGeometry(0.05, 0.1, 3, 6).translate(0, -0.1, 0), orange));
    leg.add(m(new THREE.SphereGeometry(0.055, 8, 6), white, 0, -0.19, -0.02));
    body.add(leg);
    legs.push(leg);
  }
  outlineTree(root, OUT);
  return {
    root,
    update(phase: number, bark: number): void {
      const s = Math.sin(phase);
      legs[0].rotation.x = s * 0.9;
      legs[3].rotation.x = s * 0.9;
      legs[1].rotation.x = -s * 0.9;
      legs[2].rotation.x = -s * 0.9;
      body.position.y = Math.abs(Math.cos(phase)) * 0.05;
      head.rotation.x = -bark * 0.35;
      mouth.scale.y = 0.2 + bark * 1.2;
      tail.position.x = Math.sin(phase * 2) * 0.05;
    },
  };
}

/** Mini models shown inside the floating pickup bubbles. */
function pickupIcon(kind: PowerKind): THREE.Object3D {
  switch (kind) {
    case 'helicopter': {
      const r = buildRotor(0.55);
      r.rotation.x = 0.5;
      return r;
    }
    case 'spring': {
      const s = buildSpring();
      s.scale.setScalar(0.55);
      s.position.y = 0.28;
      return s;
    }
    case 'brolly': {
      const b = buildBrolly();
      b.scale.setScalar(0.42);
      b.rotation.x = Math.PI;
      b.position.y = -0.3;
      return b;
    }
    case 'magnet': {
      const c = buildTeacup();
      c.scale.setScalar(1.1);
      c.position.y = -0.15;
      return c;
    }
    case 'helmet': {
      const h = buildHelmet();
      h.scale.setScalar(0.85);
      h.position.y = -0.18;
      return h;
    }
    case 'cabDash': {
      const c = buildCab();
      c.scale.setScalar(0.24);
      c.position.y = -0.24;
      c.rotation.y = 0.6;
      return c;
    }
    case 'teaTime': {
      const t = buildTeapot();
      t.scale.setScalar(0.5);
      return t;
    }
    case 'corgi': {
      const c = buildCorgi();
      c.update(0, 0.5);
      c.root.scale.setScalar(0.8);
      c.root.position.y = -0.3;
      c.root.rotation.y = 0.8;
      return c.root;
    }
  }
}

const RING_COLORS: Record<PowerKind, number> = {
  helicopter: 0xe8862a,
  spring: 0x7bc043,
  brolly: 0x5b6cff,
  magnet: 0x3d9bd6,
  helmet: 0x2c3e7a,
  cabDash: 0xf0b429,
  teaTime: 0xb5651d,
  corgi: 0xe05a8a,
};

/** A floating pickup: a glowing ring around a mini model, inside a soft bubble. */
export function buildPickup(kind: PowerKind): THREE.Group {
  const g = new THREE.Group();
  const ring = m(new THREE.TorusGeometry(0.55, 0.06, 8, 28), toon(RING_COLORS[kind], { emissive: RING_COLORS[kind], emissiveIntensity: 0.55 }));
  g.add(ring);
  const bubble = m(new THREE.SphereGeometry(0.53, 18, 12), toon(0xffffff, { opacity: 0.22, emissive: 0xfff4d6, emissiveIntensity: 0.4 }));
  bubble.userData.noOutline = true;
  (bubble.material as THREE.Material).depthWrite = false;
  g.add(bubble);
  outlineTree(ring, OUT);
  const icon = pickupIcon(kind);
  icon.name = 'icon';
  g.add(icon);
  g.scale.setScalar(1.25);
  return g;
}

/** Tea Time steam: a few soft puffs that swirl and rise around Jack. */
export function buildSteam(count = 10): { root: THREE.Group; update(t: number): void } {
  const root = new THREE.Group();
  const mat = toon(0xffffff, { opacity: 0.55, emissive: 0xffffff, emissiveIntensity: 0.6 });
  mat.depthWrite = false;
  const geo = new THREE.SphereGeometry(0.16, 10, 8);
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geo, mat);
    root.add(p);
    puffs.push(p);
  }
  return {
    root,
    update(t: number): void {
      for (let i = 0; i < puffs.length; i++) {
        const k = (t * 0.45 + i / puffs.length) % 1;
        const a = i * 2.4 + t * 2.2;
        const r = 0.75 + 0.25 * Math.sin(t + i);
        puffs[i].position.set(Math.cos(a) * r, 0.2 + k * 2.2, Math.sin(a) * r * 0.8);
        puffs[i].scale.setScalar(0.6 + k * 1.4 * (1 - k) * 2);
      }
    },
  };
}
