import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import './style.css';
import { CONFIG } from './config';
import { toon } from './render/ToonMaterials';
import { outlineTree } from './render/Outline';

/**
 * Phase 1 bootstrap: a toon-shaded diorama (the Golden Teapot on a London street)
 * proving the renderer, cel shading, outlines, paper grain and resize handling work.
 * Phase 2 replaces this with the real Game loop.
 */

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLDivElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.maxPixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = makeSkyTexture();
scene.fog = new THREE.Fog(CONFIG.colors.skyBottom, 30, 90);

const camera = new THREE.PerspectiveCamera(CONFIG.render.fov, 1, CONFIG.render.near, CONFIG.render.far);
camera.position.set(0, 3.2, 7.5);
camera.lookAt(0, 1.2, 0);

scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a7f70, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(4, 8, 5);
scene.add(sun);

// --- Road -------------------------------------------------------------------
const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 120), toon(CONFIG.colors.ground));
road.rotation.x = -Math.PI / 2;
road.position.z = -50;
scene.add(road);
const dashGeo = new THREE.PlaneGeometry(0.15, 1.6);
const dashMat = toon(0xf5f0e0);
for (let lane = -1; lane <= 1; lane += 2) {
  for (let i = 0; i < 30; i++) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(lane * 1.25, 0.01, 4 - i * 4);
    scene.add(dash);
  }
}
const pavementGeo = new RoundedBoxGeometry(3, 0.3, 120, 2, 0.1);
for (const side of [-1, 1]) {
  const pavement = new THREE.Mesh(pavementGeo, toon(0xcfc6b4));
  pavement.position.set(side * 6, 0.15, -50);
  scene.add(pavement);
}

// --- Golden Teapot (placeholder hero prop) ----------------------------------
const teapot = buildTeapot();
teapot.position.set(0, 1.1, 0);
scene.add(teapot);

// --- A chunky red double-decker silhouette for scale --------------------------
const bus = new THREE.Group();
const busBody = new THREE.Mesh(new RoundedBoxGeometry(2.2, 3.2, 7, 3, 0.35), toon(CONFIG.colors.busRed));
busBody.position.y = 1.9;
bus.add(busBody);
for (const y of [1.6, 2.9]) {
  const windows = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.6, 6.2, 2, 0.12), toon(0x2d3e50));
  windows.position.y = y;
  bus.add(windows);
}
for (const z of [-2.3, 2.3]) {
  for (const x of [-1.05, 1.05]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), toon(0x222222));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.45, z);
    bus.add(wheel);
  }
}
bus.position.set(-2.5, 0, -14);
outlineTree(bus);
scene.add(bus);

// --- Title overlay ----------------------------------------------------------
uiRoot.innerHTML = `
  <div class="splash">
    <h1>The Great London Getaway</h1>
    <p>Marmalade Jack has pinched the Golden Teapot&hellip; the chase is coming soon!</p>
  </div>
`;

// --- Resize & loop ----------------------------------------------------------
function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Pull the camera back in portrait so the lanes still fit.
  camera.fov = w < h ? 72 : CONFIG.render.fov;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const timer = new THREE.Timer();
renderer.setAnimationLoop(() => {
  timer.update();
  const t = timer.getElapsed();
  if (!reducedMotion) {
    teapot.rotation.y = t * 0.8;
    teapot.position.y = 1.1 + Math.sin(t * 2) * 0.12;
    bus.position.z = -14 + Math.sin(t * 0.5) * 2;
  }
  renderer.render(scene, camera);
});

// --- Builders ---------------------------------------------------------------
function buildTeapot(): THREE.Group {
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

function makeSkyTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#a9d4f0');
  grad.addColorStop(0.6, '#f3dfe6');
  grad.addColorStop(1, '#fbe3c4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
