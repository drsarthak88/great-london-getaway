import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config';
import { toon, toonMap } from '../render/ToonMaterials';
import { signTexture } from '../render/Textures';
import { mergeStatic } from '../render/Merge';
import { outlineTree } from '../render/Outline';

/**
 * A chunky red double-decker, origin at ground centre, front facing +z (toward the
 * chase camera). Merged into one mesh per material so several can be on screen cheaply.
 */
export const BUS_SIZE = { width: 2.3, height: 3.75, length: 9.5 } as const;

const C = {
  red: CONFIG.colors.busRed,
  glass: 0x2d3e50,
  cream: 0xf3e3bf,
  black: 0x26262b,
  grey: 0x9a9da3,
  light: 0xfff2c4,
  plate: 0xf3c623,
};

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, r = 0): THREE.Mesh {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

export function buildBus(route = '42', destination = 'TEAPOT LANE'): THREE.Group {
  const { width: W, height: H, length: L } = BUS_SIZE;
  const g = new THREE.Group();
  const red = toon(C.red);
  const glass = toon(C.glass);
  const cream = toon(C.cream);
  const black = toon(C.black);
  const grey = toon(C.grey);
  const front = L / 2;

  // Body with a softly rounded roof, and a dark skirt underneath.
  g.add(box(W, H - 0.35, L, red, 0, 0.35 + (H - 0.35) / 2, 0, 0.3));
  g.add(box(W - 0.1, 0.4, L - 0.4, black, 0, 0.32, 0, 0.08));

  // Window bands for both decks, then red pillars between the panes.
  const lowerY = 1.62;
  const upperY = 2.98;
  g.add(box(W + 0.04, 0.82, L - 2.7, glass, 0, lowerY, -0.75));
  g.add(box(W + 0.04, 0.78, L - 0.9, glass, 0, upperY, 0));
  for (let z = -L / 2 + 0.6; z <= L / 2 - 0.4; z += 1.15) {
    if (z < front - 2.1) g.add(box(W + 0.08, 0.86, 0.12, red, 0, lowerY, z));
    g.add(box(W + 0.08, 0.82, 0.12, red, 0, upperY, z));
  }
  // Cream band between the decks.
  g.add(box(W + 0.06, 0.14, L - 0.15, cream, 0, 2.3, 0));

  // Front: windscreens, destination blind, grille, lamps, bumper, plate.
  g.add(box(W - 0.32, 0.95, 0.08, glass, 0, 1.7, front));
  g.add(box(W / 2 - 0.2, 0.74, 0.08, glass, -W / 4 + 0.02, upperY, front));
  g.add(box(W / 2 - 0.2, 0.74, 0.08, glass, W / 4 - 0.02, upperY, front));
  g.add(box(1.0, 0.36, 0.06, grey, 0, 0.78, front));
  g.add(box(W + 0.02, 0.22, 0.24, black, 0, 0.4, front - 0.02, 0.06));
  g.add(box(0.6, 0.14, 0.04, toon(C.plate), 0, 0.42, front + 0.11));
  const lampMat = toon(C.light, { emissive: 0xffd27a, emissiveIntensity: 0.6 });
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), lampMat);
    lamp.scale.set(1, 1, 0.45);
    lamp.position.set(side * 0.82, 0.8, front + 0.02);
    g.add(lamp);
    // Wing mirrors.
    g.add(box(0.06, 0.28, 0.16, black, side * (W / 2 + 0.16), 2.05, front - 0.35));
  }
  // Rear lamps.
  for (const side of [-1, 1]) g.add(box(0.18, 0.3, 0.05, toon(0xc0392b, { emissive: 0x801010, emissiveIntensity: 0.4 }), side * 0.85, 0.85, -L / 2));

  // Wheels: tyre plus hub cap, front and rear axles.
  const tyreGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 18).rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.36, 12).rotateZ(Math.PI / 2);
  for (const z of [front - 1.7, -front + 2.0]) {
    for (const side of [-1, 1]) {
      const tyre = new THREE.Mesh(tyreGeo, black);
      tyre.position.set(side * (W / 2 - 0.12), 0.52, z);
      g.add(tyre);
      const hub = new THREE.Mesh(hubGeo, grey);
      hub.position.copy(tyre.position);
      g.add(hub);
    }
  }

  mergeStatic(g);

  // Destination blind stays its own (textured) mesh.
  const blind = box(W - 0.55, 0.34, 0.06, toonMap(signTexture([`${route}  ${destination}`], 0x15151a, 0xffd23a, 512, 64), { emissive: 0x332200, emissiveIntensity: 0.3 }), 0, 2.48, front + 0.02);
  blind.userData.noOutline = true;
  g.add(blind);

  outlineTree(g);
  return g;
}
