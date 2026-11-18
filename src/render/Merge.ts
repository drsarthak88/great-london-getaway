import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toonVertexColors } from './ToonMaterials';

/**
 * Draw-call reduction by merging. Plain single-colour toon parts are baked into one
 * mesh with per-vertex colours and a single shared material; textured, glowing or
 * see-through parts are merged per material. A double-decker built from ~60
 * primitives becomes 4-5 draw calls (plus outlines).
 *
 * Meshes flagged `userData.keep = true` (and anything under them) are left alone.
 * `userData.noOutline` is preserved by keeping those parts in their own merged mesh.
 * Add outline hulls after merging.
 */

type ToonLike = THREE.Material & {
  map?: THREE.Texture | null;
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  vertexColors?: boolean;
};

/** Can this material be replaced by a vertex colour? */
function isPlain(mat: ToonLike): boolean {
  if (!(mat as THREE.MeshToonMaterial).isMeshToonMaterial) return false;
  if (mat.map || mat.vertexColors || mat.transparent || (mat.opacity ?? 1) < 1) return false;
  const e = mat.emissive;
  return !e || (e.r === 0 && e.g === 0 && e.b === 0) || mat.emissiveIntensity === 0;
}

const tmp = new THREE.Matrix4();

/** Clone a mesh's geometry into `space`, non-indexed, with only the attributes we need. */
function bake(m: THREE.Mesh, toSpace: THREE.Matrix4, keepUv: boolean, color: THREE.Color | null): THREE.BufferGeometry {
  const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
  for (const name of Object.keys(g.attributes)) {
    if (name === 'position' || name === 'normal' || (name === 'uv' && keepUv)) continue;
    g.deleteAttribute(name);
  }
  g.clearGroups();
  g.applyMatrix4(tmp.multiplyMatrices(toSpace, m.matrixWorld));
  if (color) {
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = color.r;
      c[i * 3 + 1] = color.g;
      c[i * 3 + 2] = color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  return g;
}

function hasKeptAncestor(o: THREE.Object3D, stop: THREE.Object3D): boolean {
  let p = o.parent;
  while (p && p !== stop) {
    if (p.userData.keep) return true;
    p = p.parent;
  }
  return false;
}

/** Merge a list of meshes (all expressed relative to `owner`) and add the results to it. */
function mergeInto(owner: THREE.Object3D, meshes: THREE.Mesh[]): void {
  owner.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(owner.matrixWorld).invert();
  // Buckets: vertex-colour (outlined / not outlined) and per-material.
  const vc: [THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], []];
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const m of meshes) {
    const mat = m.material as ToonLike;
    if (isPlain(mat)) {
      vc[m.userData.noOutline ? 1 : 0].push(bake(m, inv, false, mat.color!));
    } else {
      let list = byMat.get(mat);
      if (!list) byMat.set(mat, (list = []));
      list.push(bake(m, inv, !!mat.map, null));
    }
    m.removeFromParent();
  }
  vc.forEach((geos, i) => {
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, toonVertexColors());
    mesh.name = 'merged';
    if (i === 1) mesh.userData.noOutline = true;
    owner.add(mesh);
  });
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = 'merged';
    owner.add(mesh);
  }
}

/** Collapse a whole static model into as few meshes as possible, owned by `root`. */
export function mergeStatic(root: THREE.Object3D): THREE.Object3D {
  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.keep || Array.isArray(m.material) || m.name === 'outline') return;
    if (hasKeptAncestor(m, root)) return;
    meshes.push(m);
  });
  mergeInto(root, meshes);
  return root;
}

/**
 * For animated rigs: merge the meshes hanging directly off each joint, so every joint
 * keeps moving independently but costs one or two draw calls instead of a dozen.
 */
export function mergeRig(root: THREE.Object3D): THREE.Object3D {
  const owners: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) owners.push(o);
  });
  for (const owner of owners) {
    const direct = owner.children.filter((c) => {
      const m = c as THREE.Mesh;
      return m.isMesh && m.children.length === 0 && !m.userData.keep && !Array.isArray(m.material);
    }) as THREE.Mesh[];
    if (direct.length > 1) mergeInto(owner, direct);
  }
  return root;
}
