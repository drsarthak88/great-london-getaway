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
  /** Current and maximum render resolution scale (adaptive). */
  ratio = 1;
  private readonly maxRatio: number;
  private slowTime = 0;
  private fastTime = 0;
  private resizeListeners: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    // High-DPI phone screens are sharp enough without MSAA, which is costly on mobile GPUs.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: dpr < 2, powerPreference: 'high-performance' });
    this.maxRatio = Math.min(dpr, CONFIG.render.maxPixelRatio);
    this.ratio = this.maxRatio;
    this.renderer.setPixelRatio(this.ratio);
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

  /**
   * Adaptive resolution: if frames are consistently slow, render fewer pixels; if
   * there is plenty of headroom again, step back up. `frameSeconds` is the real frame time.
   */
  adapt(frameSeconds: number): void {
    if (frameSeconds <= 0 || frameSeconds > 0.25) return; // ignore tab switches and hitches
    const min = 0.75;
    if (frameSeconds > 1 / 45) {
      this.slowTime += frameSeconds;
      this.fastTime = 0;
      if (this.slowTime > 2 && this.ratio > min) {
        this.setRatio(Math.max(min, this.ratio - 0.25));
        this.slowTime = 0;
      }
    } else if (frameSeconds < 1 / 58) {
      this.fastTime += frameSeconds;
      this.slowTime = Math.max(0, this.slowTime - frameSeconds);
      if (this.fastTime > 6 && this.ratio < this.maxRatio) {
        this.setRatio(Math.min(this.maxRatio, this.ratio + 0.25));
        this.fastTime = 0;
      }
    }
  }

  private setRatio(r: number): void {
    this.ratio = r;
    this.renderer.setPixelRatio(r);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
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
