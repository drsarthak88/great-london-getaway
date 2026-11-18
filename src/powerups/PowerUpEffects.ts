import * as THREE from 'three';
import type { PowerUps } from './PowerUps';
import type { Player } from '../entities/Player';
import { buildBrolly, buildCorgi, buildHelmet, buildRotor, buildSpring, buildSteam, buildTeacup, type CorgiModel } from '../models/PowerUpModels';
import { buildCab } from '../models/Cab';
import { damp } from '../utils/math';

/**
 * The look of each active power-up: things attached to Jack's rig (rotor, spring,
 * brolly, helmet) and things that follow him around the scene (teacup, cab, steam,
 * corgi). Purely visual; the gameplay lives in Game + PowerUps.
 */
export class PowerUpEffects {
  private readonly rotor = buildRotor();
  private readonly spring = buildSpring();
  private readonly brolly = buildBrolly();
  private readonly helmet = buildHelmet();
  private readonly teacup = buildTeacup();
  private readonly cab = buildCab();
  private readonly steam = buildSteam();
  private readonly corgi: CorgiModel = buildCorgi();
  private time = 0;
  private corgiX = 0;
  private corgiPhase = 0;
  private barkTimer = 0;
  private springSquash = 1;

  constructor(
    scene: THREE.Scene,
    private readonly player: Player,
    private readonly powers: PowerUps,
  ) {
    const rig = player.rig;
    // Rotor sits on the tip of the tail.
    const tip = rig.tail[rig.tail.length - 1];
    this.rotor.position.y = 0.22;
    tip.add(this.rotor);
    // The spring replaces the tail, bouncing between hips and road.
    this.spring.position.set(0, 0.05, 0.2);
    rig.hips.add(this.spring);
    // Brolly is held aloft in the right paw.
    this.brolly.position.y = -0.02;
    rig.handR.add(this.brolly);
    rig.hatMount.add(this.helmet);
    this.helmet.position.y = -0.12;

    this.cab.scale.setScalar(0.72);
    for (const o of [this.teacup, this.cab, this.steam.root, this.corgi.root]) scene.add(o);
    this.hideAll();
  }

  reset(): void {
    this.hideAll();
    this.barkTimer = 0;
    this.corgiX = this.player.controller.x + 1;
  }

  /** Woof! (the corgi barks Inspector Bones back). */
  bark(): void {
    this.barkTimer = 0.6;
  }

  private hideAll(): void {
    for (const o of [this.rotor, this.spring, this.brolly, this.helmet, this.teacup, this.cab, this.steam.root, this.corgi.root]) o.visible = false;
    this.player.rig.tail[0].visible = true;
  }

  /**
   * Called after the player's pose has been applied, so these overrides win.
   * `speed` drives trotting and wheel spin.
   */
  update(dt: number, speed: number): void {
    this.time += dt;
    const p = this.powers;
    const c = this.player.controller;
    const rig = this.player.rig;
    const px = this.player.root.position.x;
    const py = this.player.root.position.y;

    // --- Helicopter Tail: tail straightens straight up and the rotor whirls.
    const heli = p.isActive('helicopter');
    this.rotor.visible = heli;
    if (heli) {
      rig.tail[0].rotation.set(-1.9, 0, 0);
      for (let i = 1; i < rig.tail.length; i++) rig.tail[i].rotation.set(0, 0, 0);
      this.rotor.rotation.y += dt * 38;
    }

    // --- Spring Tail: the tail becomes a coil that squashes on landing.
    const spring = p.isActive('spring');
    this.spring.visible = spring;
    rig.tail[0].visible = !spring;
    if (spring) {
      if (c.justLanded) this.springSquash = 0.35;
      const target = c.grounded ? 0.55 + 0.08 * Math.sin(this.time * 18) : 0.85;
      this.springSquash = damp(this.springSquash, target, 9, dt);
      this.spring.scale.set(1, this.springSquash, 1);
    }

    // --- Brolly Glide: hold the umbrella high.
    const brolly = p.isActive('brolly');
    this.brolly.visible = brolly;
    if (brolly) {
      rig.shoulderR.rotation.set(2.95, 0, 0.12);
      rig.elbowR.rotation.x = 0.15;
    }

    // --- Bobby's Helmet.
    this.helmet.visible = p.isActive('helmet');

    // --- Teacup Magnet: the cup bobs and circles above Jack's shoulder.
    const magnet = p.isActive('magnet');
    this.teacup.visible = magnet;
    if (magnet) {
      const a = this.time * 2.4;
      this.teacup.position.set(px + Math.cos(a) * 0.75, py + 2.0 + Math.sin(this.time * 4) * 0.12, Math.sin(a) * 0.5);
      this.teacup.rotation.set(0.25 * Math.sin(this.time * 3), a, 0.15);
    }

    // --- Black Cab Dash: Jack pops out of the sunroof, the cab rocks along.
    const cab = p.isActive('cabDash');
    this.cab.visible = cab;
    if (cab) {
      this.cab.position.set(px, c.groundY, 0.15);
      // The cab model faces +z (oncoming); Jack's cab drives away from the camera.
      this.cab.rotation.set(Math.sin(this.time * 20) * 0.015, Math.PI - c.vx * 0.03, c.vx * 0.015);
      rig.root.position.y = 0.08;
      rig.thighL.visible = rig.thighR.visible = false;
    } else {
      rig.root.position.y = 0;
      rig.thighL.visible = rig.thighR.visible = true;
    }

    // --- Tea Time: steam swirls around him.
    const tea = p.isActive('teaTime');
    this.steam.root.visible = tea;
    if (tea) {
      this.steam.root.position.set(px, py, 0);
      this.steam.update(this.time);
    }

    // --- Corgi Pal: trots alongside, on whichever side has room.
    const corgi = p.isActive('corgi');
    this.corgi.root.visible = corgi;
    if (corgi) {
      const side = c.lane >= 1 ? -1 : 1;
      this.corgiX = damp(this.corgiX, px + side * 0.95, 6, dt);
      this.corgiPhase += dt * (8 + speed * 0.4);
      if (this.barkTimer > 0) this.barkTimer = Math.max(0, this.barkTimer - dt);
      this.corgi.root.position.set(this.corgiX, c.grounded ? c.y : c.groundY, 0.5);
      this.corgi.update(this.corgiPhase, this.barkTimer > 0 ? Math.abs(Math.sin(this.barkTimer * 20)) : 0);
    }
  }
}
