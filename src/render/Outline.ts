import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * Inverted-hull outlines: a second copy of the mesh drawn back-faces-only in flat ink,
 * with each vertex pushed out along its normal. Looks best on rounded geometry
 * (spheres, capsules, RoundedBoxGeometry) whose normals are continuous.
 *
 * One shared ShaderMaterial per thickness keeps the cost to a single extra draw per mesh.
 */

const materials = new Map<number, THREE.ShaderMaterial>();

export function getOutlineMaterial(thickness: number = CONFIG.render.outlineThickness): THREE.ShaderMaterial {
  let mat = materials.get(thickness);
  if (!mat) {
    mat = new THREE.ShaderMaterial({
      uniforms: {
        uThickness: { value: thickness },
        uColor: { value: new THREE.Color(CONFIG.colors.ink) },
      },
      vertexShader: /* glsl */ `
        uniform float uThickness;
        #include <common>
        void main() {
          #include <beginnormal_vertex>
          #include <begin_vertex>
          // Push along the object-space normal, corrected for non-uniform scale.
          vec3 n = normalize(objectNormal);
          vec3 scale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
          #ifdef USE_INSTANCING
            scale *= vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          #endif
          transformed += n * uThickness / max(scale, vec3(1e-4));
          #include <project_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
          #include <colorspace_fragment>
        }
      `,
      side: THREE.BackSide,
    });
    materials.set(thickness, mat);
  }
  return mat;
}

/**
 * Attach an outline hull as a child of `mesh`. Returns the hull so callers can toggle it.
 * The hull shares the source geometry, so it costs no extra memory.
 */
export function addOutline(mesh: THREE.Mesh, thickness?: number): THREE.Mesh {
  const mat = getOutlineMaterial(thickness);
  let hull: THREE.Mesh;
  if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
    // Share the instance matrices so the hull always follows its source instances.
    const src = mesh as THREE.InstancedMesh;
    const inst = new THREE.InstancedMesh(src.geometry, mat, src.count);
    inst.instanceMatrix = src.instanceMatrix;
    inst.frustumCulled = src.frustumCulled;
    hull = inst;
  } else {
    hull = new THREE.Mesh(mesh.geometry, mat);
  }
  hull.name = 'outline';
  hull.castShadow = false;
  hull.receiveShadow = false;
  hull.raycast = () => {};
  mesh.add(hull);
  return hull;
}

/** Recompute bounds for an instanced mesh and its outline hull after moving instances. */
export function refreshInstancedBounds(mesh: THREE.InstancedMesh): void {
  mesh.computeBoundingSphere();
  for (const c of mesh.children) {
    if ((c as THREE.InstancedMesh).isInstancedMesh) {
      const hull = c as THREE.InstancedMesh;
      hull.count = mesh.count;
      hull.boundingSphere = mesh.boundingSphere;
      hull.boundingBox = null;
    }
  }
}

/** Outline every mesh under `root` (skipping existing hulls). */
export function outlineTree(root: THREE.Object3D, thickness?: number): void {
  const targets: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.name !== 'outline' && !o.userData.noOutline) targets.push(o as THREE.Mesh);
  });
  for (const m of targets) addOutline(m, thickness);
}
