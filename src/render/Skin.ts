import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toonVertexColors } from './ToonMaterials';
import { outlineTree } from './Outline';

/**
 * Turn a character built from many primitives hung on joint Groups into a handful of
 * SkinnedMeshes driven by a Skeleton: every joint Group becomes a Bone, every mesh is
 * baked (in its rest pose) into one geometry rigidly bound to the bone it hung from.
 *
 * Animation code keeps working unchanged (it rotates the same named joints, which are
 * now Bones), but the character costs a few draw calls instead of dozens.
 *
 * Sub-trees flagged `userData.keep` (e.g. the teapot, already merged and outlined) are
 * re-attached to their parent bone untouched.
 */
type ToonLike = THREE.Material & { map?: THREE.Texture | null; color?: THREE.Color; emissive?: THREE.Color; emissiveIntensity?: number; transparent?: boolean };

export function skinRig<T extends { root: THREE.Object3D }>(rig: T, outline: number): T {
  const oldRoot = rig.root;
  oldRoot.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(oldRoot.matrixWorld).invert();

  const boneOf = new Map<THREE.Object3D, THREE.Bone>();
  const bones: THREE.Bone[] = [];
  const kept: [THREE.Object3D, THREE.Object3D][] = [];
  const meshes: THREE.Mesh[] = [];

  const newRoot = new THREE.Group();
  newRoot.name = oldRoot.name;

  // Mirror the joint hierarchy as bones.
  const visit = (node: THREE.Object3D, parentBone: THREE.Object3D): void => {
    for (const child of [...node.children]) {
      if (child.userData.keep) {
        kept.push([child, node]);
        continue;
      }
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (mesh.children.length) kept.push([mesh, node]);
        else meshes.push(mesh);
        continue;
      }
      const bone = new THREE.Bone();
      bone.name = child.name;
      bone.position.copy(child.position);
      bone.quaternion.copy(child.quaternion);
      bone.scale.copy(child.scale);
      parentBone.add(bone);
      boneOf.set(child, bone);
      bones.push(bone);
      visit(child, bone);
    }
  };
  // The root itself is a bone too, so meshes hung directly on it are bound.
  const rootBone = new THREE.Bone();
  newRoot.add(rootBone);
  boneOf.set(oldRoot, rootBone);
  bones.unshift(rootBone);
  visit(oldRoot, rootBone);

  // Bake meshes into root space with skin indices, grouped by material kind.
  const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; noOutline: boolean }>();
  const tmp = new THREE.Matrix4();
  for (const m of meshes) {
    const mat = m.material as ToonLike;
    const textured = !!mat.map || !!mat.transparent;
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && !(k === 'uv' && textured)) geo.deleteAttribute(k);
    geo.clearGroups();
    geo.applyMatrix4(tmp.multiplyMatrices(toRoot, m.matrixWorld));
    const n = geo.attributes.position.count;
    const boneIndex = bones.indexOf(boneOf.get(m.parent!)!);
    const idx = new Uint16Array(n * 4);
    const wts = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      idx[i * 4] = boneIndex;
      wts[i * 4] = 1;
    }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(wts, 4));
    let key: string;
    let bucketMat: THREE.Material;
    if (textured) {
      key = `tex:${mat.uuid}`;
      bucketMat = mat;
    } else {
      key = m.userData.noOutline ? 'vc:plain' : 'vc:outlined';
      bucketMat = toonVertexColors();
      const c = mat.color!.clone();
      if (mat.emissive && mat.emissiveIntensity) c.add(mat.emissive.clone().multiplyScalar(mat.emissiveIntensity * 0.6));
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        col[i * 3] = Math.min(1, c.r);
        col[i * 3 + 1] = Math.min(1, c.g);
        col[i * 3 + 2] = Math.min(1, c.b);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { mat: bucketMat, geos: [], noOutline: key === 'vc:plain' || !!m.userData.noOutline }));
    b.geos.push(geo);
  }

  newRoot.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  for (const b of buckets.values()) {
    const geo = mergeGeometries(b.geos, false);
    if (!geo) continue;
    const sm = new THREE.SkinnedMesh(geo, b.mat);
    sm.frustumCulled = false;
    sm.userData.noOutline = b.noOutline;
    newRoot.add(sm);
    sm.bind(skeleton);
  }

  // Re-attach kept sub-trees to their bones, keeping their local transforms.
  for (const [obj, parent] of kept) boneOf.get(parent)!.add(obj);

  outlineTree(newRoot, outline);

  // Point the rig's joint references at the new bones.
  const r = rig as Record<string, unknown>;
  for (const key of Object.keys(r)) {
    const v = r[key];
    if (v instanceof THREE.Object3D && boneOf.has(v)) r[key] = boneOf.get(v);
    else if (Array.isArray(v)) r[key] = v.map((x) => (x instanceof THREE.Object3D && boneOf.has(x) ? boneOf.get(x) : x));
  }
  r.root = newRoot;
  return rig;
}

/** Hide a bone and everything bound below it (bones can't be made invisible directly). */
export function setBoneVisible(bone: THREE.Object3D, visible: boolean): void {
  const s = visible ? 1 : 1e-4;
  if (bone.scale.x !== s) bone.scale.setScalar(s);
}
