import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * Owns the WebGL renderer, the scene, its sky and lights, and the main camera.
 * Handles resizing (including portrait/landscape FOV) in one place.
 */
export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  portrait = false;
  private resizeListeners: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.render.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = makeSkyTexture();
    this.scene.fog = new THREE.Fog(CONFIG.colors.skyBottom, CONFIG.render.fogNear, CONFIG.render.fogFar);

    this.camera = new THREE.PerspectiveCamera(CONFIG.render.fov, 1, CONFIG.render.near, CONFIG.render.far);

    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a7f70, 1.15));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.position.set(5, 10, 4);
    this.scene.add(this.sun);

    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    this.resize();
  }

  onResize(fn: () => void): void {
    this.resizeListeners.push(fn);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.portrait = h > w;
    this.camera.aspect = w / h;
    this.camera.fov = this.portrait ? CONFIG.render.fovPortrait : CONFIG.render.fov;
    this.camera.updateProjectionMatrix();
    for (const fn of this.resizeListeners) fn();
  };
}

function makeSkyTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#a9d4f0');
  grad.addColorStop(0.55, '#f3dfe6');
  grad.addColorStop(1, '#fbe3c4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
