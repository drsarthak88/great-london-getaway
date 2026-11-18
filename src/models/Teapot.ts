import * as THREE from 'three';
import { CONFIG } from '../config';
import { toon } from '../render/ToonMaterials';
import { outlineTree } from '../render/Outline';

/** The stolen Golden Teapot, built from primitives (used in the intro and on Jack's back later). */
export function buildTeapot(): THREE.Group {
  const g = new THREE.Group();
  const gold = toon(CONFIG.colors.gold, { emissive: 0x6b4500, emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), gold);
  body.scale.set(1, 0.8, 1);
  g.add(body);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  lid.position.y = 0.42;
  g.add(lid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), gold);
  knob.position.y = 0.76;
  g.add(knob);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.6, 12), gold);
  spout.position.set(0.7, 0.12, 0);
  spout.rotation.z = -0.9;
  g.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.06, 10, 20, Math.PI * 1.2), gold);
  handle.position.set(-0.6, 0.05, 0);
  handle.rotation.z = Math.PI * 0.4;
  g.add(handle);
  outlineTree(g);
  return g;
}
