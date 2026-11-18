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

/**
 * World size of one screen pixel per unit of view distance. Outlines never get thinner
 * than this, so distant ones don't break up into dotted dashes. Updated on resize.
 */
const minPixel = { value: 0.0012 };

export function setOutlinePixelSize(fovDegrees: number, drawingBufferHeight: number): void {
  minPixel.value = (2 * Math.tan((fovDegrees * Math.PI) / 360)) / Math.max(1, drawingBufferHeight);
}

export function getOutlineMaterial(thickness: number = CONFIG.render.outlineThickness): THREE.ShaderMaterial {
  let mat = materials.get(thickness);
  if (!mat) {
    mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uThickness: { value: thickness },
          uColor: { value: new THREE.Color(CONFIG.colors.ink) },
        },
      ]),
      vertexShader: /* glsl */ `
        uniform float uThickness;
        uniform float uMinPixel;
        #include <common>
        #include <skinning_pars_vertex>
        #include <fog_pars_vertex>
        void main() {
          #include <beginnormal_vertex>
          #include <skinbase_vertex>
          #include <skinnormal_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          // Push along the object-space normal, corrected for non-uniform scale.
          vec3 n = normalize(objectNormal);
          vec3 scale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
          #ifdef USE_INSTANCING
            scale *= vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          #endif
          // Keep the line at least ~1.3 screen pixels wide however far away it is.
          vec4 viewPos = modelViewMatrix * vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            viewPos = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
          #endif
          float width = max(uThickness, -viewPos.z * uMinPixel * 1.3);
          transformed += n * width / max(scale, vec3(1e-4));
          #include <project_vertex>
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        #include <fog_pars_fragment>
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
          #include <colorspace_fragment>
          // Ink fades into fog and distance like everything else.
          #include <fog_fragment>
        }
      `,
      side: THREE.BackSide,
      fog: true,
    });
    mat.uniforms.uMinPixel = minPixel;
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
  if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
    // Follow the same skeleton so the outline bends with the character.
    const src = mesh as THREE.SkinnedMesh;
    const sk = new THREE.SkinnedMesh(src.geometry, mat);
    sk.frustumCulled = false;
    hull = sk;
    hull.name = 'outline';
    mesh.add(hull);
    sk.bind(src.skeleton, src.bindMatrix);
    return hull;
  } else if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
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
    if (!(o as THREE.Mesh).isMesh || o.name === 'outline' || o.userData.noOutline) return;
    // Already outlined (e.g. a sub-model that outlined itself): don't double up.
    if (o.children.some((c) => c.name === 'outline')) return;
    targets.push(o as THREE.Mesh);
  });
  for (const m of targets) addOutline(m, thickness);
}
