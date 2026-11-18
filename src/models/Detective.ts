import * as THREE from 'three';
import { CONFIG } from '../config';
import { toon, toonMap } from '../render/ToonMaterials';
import { checkTexture } from '../render/Textures';
import { outlineTree } from '../render/Outline';
import { mergeRig } from '../render/Merge';
import { createRig, type BipedRig } from './Biped';

/**
 * Inspector Hemlock Bones: a bumbling Victorian-style detective in a deerstalker, a
 * checked Inverness cape and a long coat, waving a giant magnifying glass. An original
 * character in public-domain 1890s dress. Feet at y = 0, facing -z.
 */
export interface DetectiveRig extends BipedRig {
  magnifier: THREE.Group;
}

export const DETECTIVE_HIP_HEIGHT = 0.9;

const C = {
  skin: 0xf2c9a0,
  nose: 0xe8a283,
  tash: 0x6b4426,
  trousers: 0x4a4038,
  shoes: 0x3a2618,
  coat: 0x8a6a4a,
  coatLine1: 0x5a4030,
  coatLine2: 0xd8b98a,
  hat: 0xb08a5a,
  hatLine1: 0x6e5236,
  hatLine2: 0xf0dcb0,
  brass: 0xd9a63a,
  lens: 0xbfe6f5,
  handle: 0x5b3a1e,
  ink: 0x2b2118,
};

export function buildDetective(): DetectiveRig {
  const skin = toon(C.skin);
  const coat = toonMap(checkTexture(C.coat, C.coatLine1, C.coatLine2, 5));
  const hatMat = toonMap(checkTexture(C.hat, C.hatLine1, C.hatLine2, 4));
  const trousers = toon(C.trousers);
  const ink = toon(C.ink);

  const rig = createRig({
    hipHeight: DETECTIVE_HIP_HEIGHT,
    hipWidth: 0.3,
    shoulderY: 0.74,
    shoulderWidth: 0.68,
    neckY: 0.95,
    arm: { upper: 0.25, lower: 0.23, radius: 0.085, upperMat: coat, lowerMat: coat },
    leg: { upper: 0.33, lower: 0.31, radius: 0.1, upperMat: trousers, lowerMat: trousers },
  });

  // --- Long coat, flared skirt and the shoulder cape of the Inverness.
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.38, 6, 16), coat);
  body.position.y = 0.42;
  body.scale.set(1, 1, 0.85);
  rig.torso.add(body);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.43, 0.55, 18, 1, true), coat);
  skirt.position.y = -0.08;
  rig.hips.add(skirt);
  const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.5, 0.48, 20, 1, false), coat);
  cape.position.y = 0.72;
  rig.torso.add(cape);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.12, 14), coat);
  collar.position.y = 0.98;
  rig.torso.add(collar);
  for (let i = 0; i < 3; i++) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), toon(C.brass));
    button.position.set(0, 0.42 - i * 0.16, -0.27);
    button.userData.noOutline = true;
    rig.torso.add(button);
  }

  // --- Hands, shoes.
  for (const hand of [rig.handL, rig.handR]) {
    hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), skin));
  }
  for (const foot of [rig.footL, rig.footR]) {
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), toon(C.shoes));
    shoe.scale.set(1, 0.6, 1.7);
    shoe.position.set(0, -0.02, -0.08);
    foot.add(shoe);
  }

  // --- Head: big nose, bushy moustache and eyebrows, beady eyes.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 16), skin);
  head.position.y = 0.22;
  head.scale.set(1, 1.08, 1);
  rig.head.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), toon(C.nose));
  nose.position.set(0, 0.2, -0.28);
  nose.scale.set(0.9, 1, 1.1);
  rig.head.add(nose);
  for (const side of [-1, 1]) {
    const tash = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), toon(C.tash));
    tash.position.set(side * 0.1, 0.1, -0.25);
    tash.rotation.set(0, 0, side * 1.15);
    rig.head.add(tash);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), ink);
    eye.position.set(side * 0.095, 0.28, -0.245);
    eye.userData.noOutline = true;
    rig.head.add(eye);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.1, 3, 6), toon(C.tash));
    brow.position.set(side * 0.1, 0.345, -0.235);
    brow.rotation.z = Math.PI / 2 - side * 0.25;
    rig.head.add(brow);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin);
    ear.position.set(side * 0.27, 0.22, 0);
    ear.scale.set(0.6, 1, 0.8);
    rig.head.add(ear);
  }

  // --- Deerstalker: checked dome, peaks front and back, ear flaps tied on top.
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.285, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
  crown.position.y = 0.37;
  crown.scale.set(1, 0.9, 1.05);
  rig.head.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 22, 1, true), hatMat);
  band.position.y = 0.37;
  band.scale.set(1, 1, 1.05);
  rig.head.add(band);
  for (const dir of [-1, 1]) {
    const peak = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
    peak.position.set(0, 0.37, dir * 0.27);
    peak.scale.set(0.95, 0.18, 0.7);
    peak.rotation.x = dir * -0.25;
    rig.head.add(peak);
  }
  for (const side of [-1, 1]) {
    const flap = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.1, 3, 6), hatMat);
    flap.position.set(side * 0.14, 0.6, 0);
    flap.rotation.z = side * 0.9;
    flap.scale.set(1, 1, 0.5);
    rig.head.add(flap);
  }
  const bow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toon(C.hatLine1));
  bow.position.y = 0.65;
  rig.head.add(bow);

  // --- The giant magnifying glass, held in the right hand.
  const magnifier = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.24, 8), toon(C.handle));
  handle.position.y = -0.1;
  magnifier.add(handle);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 24), toon(C.brass));
  rim.position.y = -0.4;
  rim.rotation.x = Math.PI / 2;
  magnifier.add(rim);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.015, 24), toon(C.lens, { opacity: 0.55, emissive: 0x6fb7d6, emissiveIntensity: 0.25 }));
  lens.position.y = -0.4;
  lens.userData.noOutline = true;
  magnifier.add(lens);
  rig.handR.add(magnifier);

  mergeRig(rig.root);
  outlineTree(rig.root, CONFIG.render.characterOutline);
  return { ...rig, magnifier };
}
