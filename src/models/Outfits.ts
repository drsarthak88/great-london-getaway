import * as THREE from 'three';
import { CONFIG } from '../config';
import { toon, toonMap } from '../render/ToonMaterials';
import { checkTexture, stripeTexture } from '../render/Textures';
import { mergeStatic } from '../render/Merge';
import { outlineTree } from '../render/Outline';

/**
 * Jack's wardrobe items, built from primitives. Hats attach to the head's hat mount,
 * the scarf to the neck mount, the jacket to the torso. Each returns a Group to toggle.
 */
const OUT = CONFIG.render.characterOutline;

function m(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

export function buildFlatCap(): THREE.Group {
  const g = new THREE.Group();
  const tweed = toonMap(checkTexture(0x8a6a4a, 0x5a4030, 0xe0c090, 4));
  const crown = m(new THREE.SphereGeometry(0.33, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), tweed, 0, -0.14, 0.02);
  crown.scale.set(1.12, 0.5, 1.15);
  g.add(crown);
  const peak = m(new THREE.SphereGeometry(0.26, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), tweed, 0, -0.13, -0.27);
  peak.scale.set(1, 0.18, 0.75);
  g.add(peak);
  g.add(m(new THREE.SphereGeometry(0.04, 8, 6), tweed, 0, 0.02, 0));
  outlineTree(g, OUT);
  return g;
}

export function buildBowler(): THREE.Group {
  const g = new THREE.Group();
  const black = toon(0x26262e);
  const dome = m(new THREE.SphereGeometry(0.26, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), black, 0, -0.06, 0);
  dome.scale.set(1, 1.05, 1.05);
  g.add(dome);
  g.add(m(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 24), black, 0, -0.07, 0));
  g.add(m(new THREE.CylinderGeometry(0.265, 0.265, 0.06, 20), toon(0xe63946), 0, -0.02, 0));
  mergeStatic(g);
  outlineTree(g, OUT);
  return g;
}

export function buildUnionScarf(): { root: THREE.Group; tails: THREE.Group } {
  const g = new THREE.Group();
  const cloth = toonMap(stripeTexture(0xe63946, 0x1d4ed8, 6));
  const white = toon(0xffffff);
  const wrap = m(new THREE.TorusGeometry(0.2, 0.075, 8, 18), cloth, 0, 0, 0);
  wrap.rotation.x = Math.PI / 2;
  g.add(wrap);
  g.add(m(new THREE.TorusGeometry(0.2, 0.03, 6, 18).rotateX(Math.PI / 2), white, 0, 0.0, 0));
  // Two tails that flutter out behind as Jack runs.
  const tails = new THREE.Group();
  tails.position.set(0.08, -0.02, 0.18);
  for (const [dx, len] of [[0, 0.42], [0.1, 0.34]]) {
    const t = m(new THREE.BoxGeometry(0.12, len, 0.03).translate(0, -len / 2, 0), cloth, dx, 0, 0);
    tails.add(t);
  }
  g.add(tails);
  outlineTree(g, OUT);
  return { root: g, tails };
}

export function buildPearlyJacket(): THREE.Group {
  const g = new THREE.Group();
  const navy = toon(0x1c2340);
  const shell = m(new THREE.CapsuleGeometry(0.29, 0.18, 6, 16), navy, 0, 0.3, 0);
  shell.scale.set(1.02, 1, 0.92);
  g.add(shell);
  // Pearl buttons in rows and swirls, front and back.
  const pearl = toon(0xfffaf0, { emissive: 0xffffff, emissiveIntensity: 0.25 });
  const bead = new THREE.SphereGeometry(0.028, 6, 5);
  for (let row = 0; row < 5; row++) {
    const y = 0.12 + row * 0.08;
    const ring = 14;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + row * 0.2;
      const r = 0.3;
      g.add(m(bead, pearl, Math.cos(a) * r, y, Math.sin(a) * r * 0.93));
    }
  }
  // Lapels.
  for (const s of [-1, 1]) {
    const lapel = m(new THREE.BoxGeometry(0.08, 0.28, 0.03), toon(0x2b3566), s * 0.09, 0.42, -0.26);
    lapel.rotation.z = s * 0.35;
    g.add(lapel);
  }
  mergeStatic(g);
  outlineTree(g, OUT);
  return g;
}
