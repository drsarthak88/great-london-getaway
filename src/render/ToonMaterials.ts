import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * Cel-shading helpers. Every lit surface in the game uses MeshToonMaterial with a
 * shared stepped gradient map so light falls off in a few flat storybook bands.
 * Materials are cached by colour so identical props share one material (fewer
 * shader programs, fewer state changes).
 */

let gradientMap: THREE.DataTexture | null = null;

/** Build (once) a 1D ramp texture with `steps` flat light bands. */
export function getToonGradient(steps: number = CONFIG.render.toonSteps): THREE.DataTexture {
  if (gradientMap) return gradientMap;
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    // Lift the darkest band so shadows stay warm and readable rather than black.
    const v = Math.round(255 * (0.35 + 0.65 * (i / (steps - 1))));
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  gradientMap = tex;
  return tex;
}

const cache = new Map<string, THREE.MeshToonMaterial>();

export interface ToonOptions {
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

/** Get a shared toon material for a colour. Do not mutate the returned material. */
export function toon(color: number, opts: ToonOptions = {}): THREE.MeshToonMaterial {
  const key = `${color}|${opts.emissive ?? 0}|${opts.emissiveIntensity ?? 1}|${opts.opacity ?? 1}`;
  let mat = cache.get(key);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({
      color,
      gradientMap: getToonGradient(),
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      transparent: opts.transparent ?? (opts.opacity !== undefined && opts.opacity < 1),
      opacity: opts.opacity ?? 1,
    });
    cache.set(key, mat);
  }
  return mat;
}

const texCache = new Map<string, THREE.MeshToonMaterial>();

/** Shared toon material with a colour map (stripes, checks, signs). */
export function toonMap(map: THREE.Texture, opts: ToonOptions & { color?: number } = {}): THREE.MeshToonMaterial {
  const key = `${map.uuid}|${opts.color ?? 0xffffff}|${opts.emissive ?? 0}|${opts.emissiveIntensity ?? 1}`;
  let mat = texCache.get(key);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({
      color: opts.color ?? 0xffffff,
      map,
      gradientMap: getToonGradient(),
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
    });
    texCache.set(key, mat);
  }
  return mat;
}

let vcMat: THREE.MeshToonMaterial | null = null;

/** Shared toon material whose colour comes from per-vertex colours (for merged meshes). */
export function toonVertexColors(): THREE.MeshToonMaterial {
  if (!vcMat) vcMat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: getToonGradient() });
  return vcMat;
}
