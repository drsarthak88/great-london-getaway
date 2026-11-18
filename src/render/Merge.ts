import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Collapse a static model into one mesh per material. A double-decker built from ~40
 * primitives becomes a handful of draw calls, which matters when several are on screen.
 *
 * Meshes flagged `userData.keep = true` (e.g. spinning wheels) are left untouched.
 * Outline hulls should be added after merging.
 */
export function mergeStatic(root: THREE.Object3D): THREE.Object3D {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const victims: THREE.Mesh[] = [];

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.keep || Array.isArray(m.material)) return;
    if (hasKeptAncestor(m, root)) return;
    const mat = m.material as THREE.Material & { map?: THREE.Texture | null };
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    // Only textured materials need UVs; dropping them elsewhere lets any shapes merge.
    for (const name of Object.keys(g.attributes)) {
      if (name === 'position' || name === 'normal' || (name === 'uv' && mat.map)) continue;
      g.deleteAttribute(name);
    }
    g.clearGroups();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    let list = buckets.get(mat);
    if (!list) buckets.set(mat, (list = []));
    list.push(g);
    victims.push(m);
  });

  for (const m of victims) m.removeFromParent();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = 'merged';
    root.add(mesh);
  }
  return root;
}

function hasKeptAncestor(o: THREE.Object3D, root: THREE.Object3D): boolean {
  let p = o.parent;
  while (p && p !== root) {
    if (p.userData.keep) return true;
    p = p.parent;
  }
  return false;
}
