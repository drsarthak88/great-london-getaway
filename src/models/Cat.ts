import * as THREE from 'three';
import { CONFIG } from '../config';
import { toon, toonMap } from '../render/ToonMaterials';
import { stripeTexture } from '../render/Textures';
import { outlineTree } from '../render/Outline';
import { mergeRig } from '../render/Merge';
import { createRig, type BipedRig } from './Biped';
import { buildTeapot } from './Teapot';

/**
 * Marmalade Jack: a cheeky ginger tomcat in a burglar's striped jumper and a bandit
 * mask, with the Golden Teapot strapped to his back. Built entirely from primitives.
 *
 * Proportions are chunky-cartoon: big head, short legs. Feet at y = 0, facing -z.
 */
export interface CatRig extends BipedRig {
  /** Where hats and accessories attach (top of the head). */
  hatMount: THREE.Group;
  /** Where the scarf/collar sits (base of the neck). */
  neckMount: THREE.Group;
  teapot: THREE.Group;
}

export const CAT_HIP_HEIGHT = 0.52;

const C = {
  ginger: CONFIG.colors.ginger,
  darkGinger: 0xb85f17,
  cream: 0xfff1d6,
  pink: 0xf28c9b,
  ink: CONFIG.colors.ink,
  white: 0xffffff,
  iris: 0x7bc043,
  strap: 0x7a4a26,
};

export function buildCat(): CatRig {
  const ginger = toon(C.ginger);
  const dark = toon(C.darkGinger);
  const cream = toon(C.cream);
  const pink = toon(C.pink);
  const ink = toon(C.ink);
  const jumper = toonMap(stripeTexture(0x2d2a33, 0xf2ead8, 8));

  const rig = createRig({
    hipHeight: CAT_HIP_HEIGHT,
    hipWidth: 0.26,
    shoulderY: 0.47,
    shoulderWidth: 0.6,
    neckY: 0.64,
    arm: { upper: 0.13, lower: 0.12, radius: 0.07, upperMat: jumper, lowerMat: ginger },
    leg: { upper: 0.16, lower: 0.14, radius: 0.085, upperMat: ginger, lowerMat: ginger },
  });

  // --- Torso: striped jumper with a fluffy cream bib peeking out at the neck.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.2, 6, 16), jumper);
  torso.position.y = 0.3;
  torso.scale.set(1, 1, 0.9);
  rig.torso.add(torso);
  const bib = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), cream);
  bib.position.set(0, 0.56, -0.13);
  bib.scale.set(1.2, 0.7, 0.8);
  rig.torso.add(bib);

  // Satchel strap across the chest and the Golden Teapot riding on his back.
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.028, 6, 24), toon(C.strap));
  strap.position.y = 0.32;
  strap.rotation.set(Math.PI / 2, 0.75, 0);
  strap.scale.set(1, 0.92, 1);
  rig.torso.add(strap);
  const teapot = buildTeapot();
  teapot.scale.setScalar(0.36);
  teapot.position.set(0, 0.38, 0.33);
  teapot.rotation.set(0.15, Math.PI / 2, 0);
  rig.torso.add(teapot);

  // --- Paws and feet.
  for (const hand of [rig.handL, rig.handR]) {
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), cream);
    hand.add(paw);
  }
  for (const foot of [rig.footL, rig.footR]) {
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), cream);
    paw.scale.set(1, 0.7, 1.45);
    paw.position.set(0, -0.01, -0.05);
    foot.add(paw);
  }

  // --- Head.
  const headScale = new THREE.Vector3(1.1, 0.95, 1);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.33, 24, 18), ginger);
  skull.position.y = 0.27;
  skull.scale.copy(headScale);
  rig.head.add(skull);

  // Tabby stripes on the crown (very visible from the chase camera behind him).
  for (let i = -1; i <= 1; i++) {
    const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.26, 3, 6), dark);
    stripe.position.set(i * 0.11, 0.55, 0.06);
    stripe.rotation.set(Math.PI / 2 - 0.35, 0, i * 0.15);
    stripe.userData.noOutline = true;
    rig.head.add(stripe);
  }

  // Bandit mask: a band of sphere wrapped round the eyes, with ribbon tails at the back.
  const mask = new THREE.Mesh(
    new THREE.SphereGeometry(0.336, 28, 6, 0, Math.PI * 2, Math.PI * 0.38, Math.PI * 0.16),
    ink,
  );
  mask.position.copy(skull.position);
  mask.scale.copy(headScale);
  mask.userData.noOutline = true;
  rig.head.add(mask);
  for (const side of [-1, 1]) {
    const ribbon = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.2, 3, 6), ink);
    ribbon.position.set(side * 0.07, 0.24, 0.36);
    ribbon.rotation.set(0.5, 0, side * 0.55);
    ribbon.scale.set(1, 1, 0.45);
    rig.head.add(ribbon);
  }

  // Ears with pink insides.
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.27, 10), ginger);
    ear.position.set(side * 0.2, 0.55, 0.02);
    ear.rotation.z = -side * 0.35;
    rig.head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.17, 8), pink);
    inner.position.set(side * 0.195, 0.53, -0.035);
    inner.rotation.set(-0.1, 0, -side * 0.35);
    inner.userData.noOutline = true;
    rig.head.add(inner);
  }

  // Face: cream muzzle, pink nose, big eyes peeping through the mask, a cheeky grin.
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10), cream);
  muzzle.position.set(0, 0.16, -0.25);
  muzzle.scale.set(1.35, 0.8, 0.9);
  rig.head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 6), pink);
  nose.position.set(0, 0.22, -0.385);
  nose.scale.set(1.3, 0.8, 1);
  rig.head.add(nose);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 10), toon(C.white));
    eye.position.set(side * 0.125, 0.315, -0.27);
    eye.scale.set(1, 1.15, 0.7);
    rig.head.add(eye);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), toon(C.iris));
    iris.position.set(side * 0.12, 0.31, -0.318);
    iris.scale.set(1, 1.2, 0.5);
    iris.userData.noOutline = true;
    rig.head.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), ink);
    pupil.position.set(side * 0.118, 0.31, -0.338);
    pupil.scale.set(0.8, 1.4, 0.5);
    pupil.userData.noOutline = true;
    rig.head.add(pupil);
    // Whiskers.
    for (let k = -1; k <= 1; k++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 4), ink);
      w.position.set(side * 0.27, 0.17 + k * 0.035, -0.3);
      w.rotation.z = Math.PI / 2 + k * 0.18 * side;
      w.userData.noOutline = true;
      rig.head.add(w);
    }
  }
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 12, Math.PI), ink);
  grin.position.set(0.02, 0.13, -0.36);
  grin.rotation.set(0.25, 0, Math.PI + 0.15);
  grin.userData.noOutline = true;
  rig.head.add(grin);

  // --- Tail: a chain of ringed segments that curls up behind him.
  const tailMount = new THREE.Group();
  tailMount.position.set(0, 0.06, 0.22);
  tailMount.rotation.x = 1.9;
  rig.hips.add(tailMount);
  let parent: THREE.Object3D = tailMount;
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const seg = new THREE.Group();
    seg.position.y = i === 0 ? 0 : 0.15;
    const r = 0.07 - i * 0.004;
    const geo = new THREE.CapsuleGeometry(r, 0.11, 3, 8).translate(0, 0.075, 0);
    seg.add(new THREE.Mesh(geo, i % 2 === 0 ? ginger : dark));
    parent.add(seg);
    rig.tail.push(seg);
    parent = seg;
  }
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), cream);
  tip.position.y = 0.17;
  parent.add(tip);

  const hatMount = new THREE.Group();
  hatMount.position.y = 0.58;
  rig.head.add(hatMount);
  const neckMount = new THREE.Group();
  neckMount.position.y = 0.6;
  rig.torso.add(neckMount);

  mergeRig(rig.root);
  outlineTree(rig.root, CONFIG.render.characterOutline);
  return { ...rig, hatMount, neckMount, teapot };
}
