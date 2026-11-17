import { CONFIG } from '../config';
import { Renderer } from '../render/Renderer';
import { Input, type Action } from '../input/Input';
import { World } from './World';
import { Player } from '../entities/Player';
import { CameraRig } from './CameraRig';
import { speedAt } from './Difficulty';
import { Hud } from '../ui/Hud';

export type GameState = 'ready' | 'running' | 'paused';

/**
 * Top-level game: owns the loop, the state machine and every subsystem.
 * One update per animation frame with a clamped delta; nothing in update()
 * allocates, so the garbage collector stays quiet during a run.
 */
export class Game {
  readonly renderer: Renderer;
  readonly input: Input;
  readonly world: World;
  readonly player: Player;
  readonly cameraRig: CameraRig;
  readonly hud: Hud;

  state: GameState = 'ready';
  /** Track distance travelled this run, in world units (1 unit ~ 1 metre). */
  distance = 0;
  speed = 0;
  /** Seconds spent running this run (drives the speed ramp). */
  runTime = 0;
  /** Simulation speed multiplier (Tea Time power-up later halves it). */
  timeScale = 1;

  private lastTime = -1;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.world = new World(this.renderer.scene);
    this.player = new Player(this.renderer.scene);
    this.cameraRig = new CameraRig(this.renderer.camera);
    this.hud = new Hud(uiRoot, () => this.pause(), () => this.resume());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });

    this.reset();
    this.renderer.renderer.setAnimationLoop(this.frame);
  }

  reset(): void {
    this.distance = 0;
    this.speed = 0;
    this.runTime = 0;
    this.world.reset();
    this.player.reset();
    this.cameraRig.reset();
    this.state = 'ready';
    this.hud.setDistance(0);
    this.hud.showPrompt(true);
    this.hud.showPaused(false);
  }

  start(): void {
    if (this.state !== 'ready') return;
    this.state = 'running';
    this.hud.showPrompt(false);
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.hud.showPaused(true);
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.hud.showPaused(false);
  }

  private frame = (time: number): void => {
    const rawDt = this.lastTime < 0 ? 0 : (time - this.lastTime) / 1000;
    this.lastTime = time;
    const dt = Math.min(rawDt, CONFIG.render.maxDt);

    this.player.controller.clearEvents();
    this.input.drain(this.handleAction);

    if (this.state === 'running') this.update(dt * this.timeScale);

    this.player.sync(this.state === 'running' ? dt * this.timeScale : 0, this.speed);
    this.cameraRig.update(dt, this.player.controller.x, this.player.controller.y, this.renderer.portrait);
    this.renderer.render();
  };

  private update(dt: number): void {
    this.runTime += dt;
    this.speed = speedAt(this.runTime);
    this.distance += this.speed * dt;
    this.player.controller.update(dt);
    this.world.update(this.distance);
    this.hud.setDistance(this.distance);
  }

  private handleAction = (a: Action): void => {
    switch (this.state) {
      case 'ready':
        if (a === 'tap' || a === 'jump') this.start();
        return;
      case 'paused':
        if (a === 'pause' || a === 'tap') this.resume();
        return;
      case 'running': {
        const c = this.player.controller;
        if (a === 'left') c.move(-1);
        else if (a === 'right') c.move(1);
        else if (a === 'jump') c.jump();
        else if (a === 'roll') c.roll();
        else if (a === 'pause') this.pause();
        return;
      }
    }
  };
}
