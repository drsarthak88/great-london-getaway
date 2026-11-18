import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { toon, toonMap } from '../render/ToonMaterials';
import { signTexture } from '../render/Textures';
import { mergeStatic } from '../render/Merge';
import { outlineTree } from '../render/Outline';

/**
 * A cartoon black cab: tall rounded cabin, round headlamps on the wings, chrome grille
 * and a glowing TAXI sign. Origin at ground centre, front facing +z.
 */
export const CAB_SIZE = { width: 1.9, height: 1.95, length: 4.3 } as const;

const C = {
  body: 0x26262c,
  glass: 0x3c4a5a,
  chrome: 0xc9ccd2,
  tyre: 0x1c1c20,
  lamp: 0xfff2c4,
  sign: 0xffc53a,
};

export function buildCab(): THREE.Group {
  const { width: W, length: L } = CAB_SIZE;
  const g = new THREE.Group();
  const body = toon(C.body);
  const glass = toon(C.glass);
  const chrome = toon(C.chrome);
  const front = L / 2;

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  // Lower body and the tall, rounded passenger cabin.
  add(new RoundedBoxGeometry(W, 0.85, L, 3, 0.26), body, 0, 0.72, 0);
  add(new RoundedBoxGeometry(W - 0.14, 0.82, 2.5, 3, 0.3), body, 0, 1.4, -0.3);
  // Side windows and a raked windscreen.
  add(new THREE.BoxGeometry(W - 0.1, 0.46, 2.2), glass, 0, 1.45, -0.32);
  const screen = add(new THREE.BoxGeometry(W - 0.42, 0.5, 0.06), glass, 0, 1.42, 0.97);
  screen.rotation.x = -0.32;
  add(new THREE.BoxGeometry(W - 0.42, 0.42, 0.06), glass, 0, 1.45, -1.56);

  // Chrome grille and bumpers.
  add(new THREE.BoxGeometry(0.62, 0.42, 0.06), chrome, 0, 0.8, front);
  add(new RoundedBoxGeometry(W + 0.06, 0.14, 0.2, 2, 0.05), chrome, 0, 0.36, front);
  add(new RoundedBoxGeometry(W + 0.06, 0.14, 0.2, 2, 0.05), chrome, 0, 0.36, -front);

  // Round headlamps perched on the wings.
  const lampMat = toon(C.lamp, { emissive: 0xffd27a, emissiveIntensity: 0.6 });
  for (const side of [-1, 1]) {
    const housing = add(new THREE.CylinderGeometry(0.15, 0.15, 0.18, 14).rotateX(Math.PI / 2), chrome, side * 0.66, 1.16, front - 0.3);
    housing.position.z = front - 0.3;
    add(new THREE.SphereGeometry(0.125, 12, 8).scale(1, 1, 0.4), lampMat, side * 0.66, 1.16, front - 0.2);
    // Door handles.
    add(new THREE.BoxGeometry(0.04, 0.05, 0.2), chrome, side * (W / 2 + 0.01), 0.98, -0.6);
  }

  // Wheels with chrome hubs.
  const tyreGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 16).rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.28, 10).rotateZ(Math.PI / 2);
  for (const z of [front - 0.85, -front + 0.85]) {
    for (const side of [-1, 1]) {
      add(tyreGeo, toon(C.tyre), side * (W / 2 - 0.1), 0.38, z);
      add(hubGeo, chrome, side * (W / 2 - 0.1), 0.38, z);
    }
  }

  mergeStatic(g);

  // TAXI roof sign glows, so keep it separate.
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.17, 0.24),
    toonMap(signTexture(['TAXI'], C.sign, 0x2b2118, 128, 40), { emissive: 0xffa500, emissiveIntensity: 0.35 }),
  );
  sign.position.set(0, 1.9, -0.05);
  g.add(sign);

  outlineTree(g);
  return g;
}
