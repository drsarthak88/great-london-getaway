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

    // The sky dome (models/Sky.ts) paints the background.
    this.scene.background = new THREE.Color(CONFIG.colors.skyBottom);
    this.scene.fog = new THREE.Fog(CONFIG.colors.skyBottom, CONFIG.render.fogNear, CONFIG.render.fogFar);

    this.camera = new THREE.PerspectiveCamera(CONFIG.render.fov, 1, CONFIG.render.near, CONFIG.render.far);

    // Bright, warm storybook lighting: a strong sky fill keeps shadows cheerful, not murky.
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xffe2c0, 1.45));
    this.sun = new THREE.DirectionalLight(0xfff6e0, 1.5);
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
