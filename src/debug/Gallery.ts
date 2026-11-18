import * as THREE from 'three';
import { Renderer } from '../render/Renderer';
import { toon } from '../render/ToonMaterials';
import { applyPose, type BipedRig } from '../models/Biped';
import { buildCat, CAT_HIP_HEIGHT } from '../models/Cat';
import { buildDetective, DETECTIVE_HIP_HEIGHT } from '../models/Detective';
import { buildBus } from '../models/Bus';
import { buildCab } from '../models/Cab';
import { CharacterAnimator, type AnimInput } from '../entities/CharacterAnimator';
import { CAT_STYLE, DETECTIVE_STYLE, holdMagnifier } from '../entities/Poses';

/**
 * Model gallery for reviewing the procedural art: open the game with `?gallery`.
 * Options: `&anim=run|idle|jump|fall|roll`, `&view=front|back|side`, `&focus=cat|detective`, `&t=<seconds>` to
 * freeze the animation at a moment (handy for screenshots).
 */
export function startGallery(canvas: HTMLCanvasElement, uiRoot: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  const anim = params.get('anim') ?? 'run';
  const view = params.get('view') ?? 'front';
  const frozen = params.has('t') ? Number(params.get('t')) : null;

  const r = new Renderer(canvas);
  const scene = r.scene;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), toon(0xcfc6b4));
  scene.add(ground);

  const cat = buildCat();
  cat.root.position.set(-1.4, 0, 2);
  scene.add(cat.root);
  const det = buildDetective();
  det.root.position.set(1.4, 0, 2);
  scene.add(det.root);
  const bus = buildBus();
  bus.position.set(-3.2, 0, -6);
  bus.rotation.y = 0.5;
  scene.add(bus);
  const cab = buildCab();
  cab.position.set(3.4, 0, -3);
  cab.rotation.y = -0.6;
  scene.add(cab);

  const turn = view === 'back' ? 0 : view === 'side' ? -Math.PI / 2 : Math.PI;
  cat.root.rotation.y = turn;
  det.root.rotation.y = turn;

  const catAnim = new CharacterAnimator(CAT_STYLE, CAT_HIP_HEIGHT);
  const detAnim = new CharacterAnimator(DETECTIVE_STYLE, DETECTIVE_HIP_HEIGHT);

  uiRoot.innerHTML = `<div class="hud-chip" style="position:absolute;left:12px;top:12px">Model gallery: ${anim} / ${view}</div>`;

  // `&focus=cat|detective` zooms in on one character.
  const focus = params.get('focus');
  if (focus === 'cat') {
    r.camera.position.set(-1.4, 1.35, 4.6);
    r.camera.lookAt(-1.4, 0.85, 2);
  } else if (focus === 'detective') {
    r.camera.position.set(1.4, 1.8, 5.6);
    r.camera.lookAt(1.4, 1.15, 2);
  } else {
    r.camera.position.set(0, 2.6, 8);
    r.camera.lookAt(0, 1.3, 0);
  }

  const input = (t: number): AnimInput => {
    const rollT = (t % 0.62) / 0.62;
    return {
      running: anim !== 'idle',
      grounded: anim === 'run' || anim === 'idle' || anim === 'roll',
      rolling: anim === 'roll',
      rollProgress: rollT,
      vy: anim === 'jump' ? 6 : anim === 'fall' ? -8 : 0,
      speed: 18,
    };
  };

  const drive = (rig: BipedRig, a: CharacterAnimator, dt: number, t: number): void => {
    const pose = a.update(dt, input(t));
    if (rig === det && (anim === 'run' || anim === 'idle')) holdMagnifier(pose, 0.85);
    applyPose(rig, pose);
    rig.hips.rotation.x = a.spin;
  };

  let t = 0;
  r.renderer.setAnimationLoop(() => {
    const dt = frozen !== null ? 0 : 1 / 60;
    if (frozen !== null) {
      // Settle the blend weights, then hold the requested moment.
      for (let i = 0; i < 90; i++) {
        drive(cat, catAnim, 1 / 60, frozen);
        drive(det, detAnim, 1 / 60, frozen);
      }
      catAnim.phase = detAnim.phase = frozen * 12;
      drive(cat, catAnim, 0, frozen);
      drive(det, detAnim, 0, frozen);
    } else {
      t += dt;
      drive(cat, catAnim, dt, t);
      drive(det, detAnim, dt, t);
    }
    r.render();
  });
}
