import { CONFIG } from '../config';
import { Renderer } from '../render/Renderer';
import { Input, type Action } from '../input/Input';
import { World } from './World';
import { Player } from '../entities/Player';
import { Detective } from '../entities/Detective';
import { ObstacleViews } from '../entities/ObstacleViews';
import { CoinViews } from '../entities/CoinViews';
import { CameraRig } from './CameraRig';
import { speedAt } from './Difficulty';
import { Track, type Coin } from './Track';
import { classifyHit, groundHeight, platformUnder, type PlayerBox } from './Collision';
import { collectCoins } from './Coins';
import { Score } from './Score';
import { RunStats } from './RunStats';
import { Hud } from '../ui/Hud';
import { damp } from '../utils/math';
import { PowerUps, POWER_NAMES, type PowerKind } from '../powerups/PowerUps';
import { PowerUpEffects } from '../powerups/PowerUpEffects';
import { PowerUpViews } from '../powerups/PowerUpViews';
import { magnetPull } from '../powerups/Magnet';
import type { Obstacle } from './ObstacleTypes';
import * as THREE from 'three';
import { Sky } from '../models/Sky';
import { LandmarkViews } from '../entities/LandmarkViews';
import { WeatherFx } from '../entities/WeatherFx';
import { Weather } from './Weather';
import { Events } from './Events';
import { ZONES } from '../data/zones';
import { POSTCARDS } from '../data/facts';
import { ZONE_LENGTH, zoneBlend, zoneEntered, zoneIndexAt } from './Zones';
import { CONTINUE_COST, multiplierFor, type Profile } from '../profile/Profile';
import { MissionTracker } from './Missions';
import type { MissionDef } from '../data/missions';
import { pickFact } from '../data/facts';

export interface RunSummary {
  score: number;
  best: number;
  newBest: boolean;
  coins: number;
  distance: number;
  tokens: number;
  multiplier: number;
  /** A "Did you know?" fact for the Case File. */
  fact: string;
  /** Mission set finished this run (the multiplier goes up next run). */
  setCompleted: boolean;
  reason: 'crash' | 'stumbles' | null;
}

/** How the game talks to the menus (title, pause, continue, Case File). */
export interface GameHooks {
  onPause(): void;
  /** The catch scene finished: offer a second chance if `canContinue`, else end the run. */
  onCatchEnd(canContinue: boolean): void;
  onRunEnd(summary: RunSummary): void;
  onMission(m: MissionDef): void;
  /** Keyboard/tap input while not running (title, Case File...). */
  onMenuAction(a: Action): void;
  /** Save the profile. */
  persist(): void;
}

export type GameState = 'ready' | 'running' | 'paused' | 'caught' | 'gameover';

/**
 * Top-level game: owns the loop, the state machine and every subsystem.
 * One update per animation frame with a clamped delta; nothing in update()
 * allocates, so the garbage collector stays quiet during a run.
 */
export class Game {
  readonly renderer: Renderer;
  readonly input: Input;
  readonly world: World;
  readonly track = new Track();
  readonly obstacleViews: ObstacleViews;
  readonly coinViews: CoinViews;
  readonly player: Player;
  readonly detective: Detective;
  readonly cameraRig: CameraRig;
  readonly hud: Hud;
  readonly score = new Score();
  readonly stats = new RunStats();
  readonly powers = new PowerUps();
  readonly powerEffects: PowerUpEffects;
  readonly powerViews: PowerUpViews;
  readonly sky: Sky;
  readonly landmarks: LandmarkViews;
  readonly weather = new Weather();
  readonly weatherFx: WeatherFx;
  readonly events = new Events();
  readonly profile: Profile;
  missions: MissionTracker;
  hooks: GameHooks | null = null;
  /** The one second chance this run has been used. */
  continued = false;
  /** Index of the zone Jack is in. */
  zone = 0;

  state: GameState = 'ready';
  /** Track distance travelled this run, in world units (1 unit ~ 1 metre). */
  distance = 0;
  speed = 0;
  /** Seconds spent running this run (drives the speed ramp). */
  runTime = 0;
  /** Simulation speed multiplier (Tea Time power-up later halves it). */
  timeScale = 1;
  best = 0;
  /** Debug: `?god` makes Jack un-catchable (for automated playtests). */
  godMode = false;
  /** How the last run ended. */
  endReason: 'crash' | 'stumbles' | null = null;

  private lastTime = -1;
  private seed = 1;
  /** Seconds of post-stumble invulnerability left. */
  private grace = 0;
  private slowTimer = 0;
  private catchTimer = 0;
  /** Seconds since Game Over (taps are ignored briefly so a swipe can't skip it). */
  private overTimer = 0;
  private wasRolling = false;
  /** Seconds of full invulnerability left (helicopter landing, helmet, end of cab dash). */
  private safeTimer = 0;
  /** Jack fell through a raised bascule on Tower Bridge. */
  private fellIn = false;
  private prevDistance = -1;
  private readonly blend = { a: 0, b: 0, t: 0 };
  private readonly cTop = new THREE.Color();
  private readonly cBottom = new THREE.Color();
  private readonly cFog = new THREE.Color();
  private readonly cTmp = new THREE.Color();
  private readonly prevBox: PlayerBox = { x: 0, y: 0, d: 0, halfW: CONFIG.player.halfWidth, halfD: CONFIG.player.halfDepth, height: CONFIG.player.standHeight };
  private readonly curBox: PlayerBox = { x: 0, y: 0, d: 0, halfW: CONFIG.player.halfWidth, halfD: CONFIG.player.halfDepth, height: CONFIG.player.standHeight };

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, profile: Profile) {
    this.profile = profile;
    this.missions = new MissionTracker(profile.missions);
    this.best = profile.best;
    const params = new URLSearchParams(location.search);
    this.godMode = params.has('god');
    if (params.has('seed')) this.seed = Number(params.get('seed')) || 1;
    else this.seed = (Date.now() % 100000) + 1;

    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.world = new World(this.renderer.scene);
    this.obstacleViews = new ObstacleViews(this.renderer.scene, this.track.obstacles);
    this.coinViews = new CoinViews(this.renderer.scene, this.track.coins);
    this.player = new Player(this.renderer.scene);
    this.detective = new Detective(this.renderer.scene);
    this.powerEffects = new PowerUpEffects(this.renderer.scene, this.player, this.powers);
    this.powerViews = new PowerUpViews(this.renderer.scene, this.track.coins);
    this.powers.onEnd = this.onPowerEnd;
    this.sky = new Sky(this.renderer.scene);
    this.landmarks = new LandmarkViews(this.renderer.scene);
    this.landmarks.onAppear = (id) => {
      const card = POSTCARDS[id];
      this.hud.showPostcard(card.title, card.facts[Math.floor(Math.random() * card.facts.length)]);
      this.events.emit({ type: 'landmark', id });
    };
    this.landmarks.onPass = (id) => {
      if (id !== 'bigBen') return;
      this.events.emit({ type: 'chime' });
      if (this.state === 'running' && this.player.controller.flying) this.stats.bigBenFlights++;
    };
    this.weatherFx = new WeatherFx(this.renderer.scene);
    this.track.weather = this.weather;
    this.cameraRig = new CameraRig(this.renderer.camera);
    this.hud = new Hud(uiRoot, () => this.pause());

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
    this.grace = 0;
    this.slowTimer = 0;
    this.catchTimer = 0;
    this.wasRolling = false;
    this.safeTimer = 0;
    this.timeScale = 1;
    document.getElementById('app')?.classList.remove('tea-time');
    this.endReason = null;
    this.powers.reset();
    this.weather.reset(this.seed);
    this.track.reset(this.seed++);
    this.landmarks.reset();
    this.fellIn = false;
    this.prevDistance = -1;
    this.zone = 0;
    this.sky.setBackdrop(ZONES[0].backdrop);
    this.track.update(0, 0, CONFIG.speed.start);
    this.obstacleViews.reset();
    this.score.reset(multiplierFor(this.profile));
    this.stats.reset();
    this.continued = false;
    this.powers.levels = this.profile.upgrades;
    this.missions = new MissionTracker(this.profile.missions);
    this.applySettings();
    this.world.reset();
    this.player.reset();
    this.player.setOutfit(this.profile.equipped);
    this.powerEffects.reset();
    // On the start screen Bones is just behind Jack, about to give chase.
    this.detective.reset(CONFIG.detective.closeGap + 1.2);
    this.cameraRig.reset();
    this.state = 'ready';
    this.hud.update(0, 0, 0, this.score.multiplier, 0);
    this.hud.setVisible(false);
    this.hud.showGotYou(false);
    this.hud.clearPopups();
    this.updateEnvironment(0);
  }

  start(): void {
    if (this.state !== 'ready') return;
    this.state = 'running';
    this.player.showcase = false;
    this.hud.setVisible(true);
    this.detective.chase.pullClose(CONFIG.detective.startChaseTime);
  }

  restart(): void {
    this.reset();
    this.start();
  }

  /** Back to the title screen. */
  quitToTitle(): void {
    this.reset();
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.hooks?.onPause();
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
  }

  /** Apply the player's settings (reduced motion, colour-blind palette). */
  applySettings(): void {
    const s = this.profile.settings;
    this.cameraRig.reducedMotion = s.reducedMotion;
    document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
    document.documentElement.classList.toggle('colour-blind', s.colourBlind);
  }

  /** Teapot Tokens available for a second chance: saved ones plus any picked up this run. */
  get tokensAvailable(): number {
    return this.profile.tokens + this.score.tokens;
  }

  /** Spend Teapot Tokens to escape Bones's grip and keep running (once per run). */
  continueRun(): boolean {
    if (this.state !== 'caught' || this.continued || this.tokensAvailable < CONTINUE_COST) return false;
    // Spend tokens picked up this run first, then saved ones.
    let cost = CONTINUE_COST;
    const fromRun = Math.min(this.score.tokens, cost);
    this.score.tokens -= fromRun;
    cost -= fromRun;
    this.profile.tokens -= cost;
    this.continued = true;
    // Clear the road just ahead, put Jack back on his feet, and send Bones packing.
    for (const o of this.track.obstacles) if (o.active && o.d < this.distance + 45 && o.far > this.distance - 5) o.active = false;
    const c = this.player.controller;
    const lane = c.lane;
    const x = c.x;
    const y = this.fellIn ? 0 : c.y;
    const ground = this.fellIn ? 0 : c.groundY;
    this.fellIn = false;
    this.detective.chase.knockBack();
    this.detective.chase.gap = CONFIG.detective.farGap;
    this.safeTimer = 3;
    this.player.reset();
    this.player.setOutfit(this.profile.equipped);
    Object.assign(c, { lane, prevLane: lane, x, y, groundY: ground, grounded: true, vy: 0 });
    this.player.flinch(3);
    this.hud.showGotYou(false);
    this.hud.toast('Second chance! Run, Jack, run!');
    this.speed = speedAt(this.runTime) * 0.6;
    this.state = 'running';
    this.hooks?.persist();
    return true;
  }

  /** Finish the run: bank coins and tokens, update best and missions, save. */
  endRun(): void {
    if (this.state !== 'caught') return;
    this.state = 'gameover';
    this.overTimer = 0;
    this.hud.showGotYou(false);
    this.hud.setVisible(false);
    const p = this.profile;
    const score = this.score.total;
    const newBest = score > p.best;
    if (newBest) p.best = score;
    this.best = p.best;
    p.bestDistance = Math.max(p.bestDistance, Math.floor(this.distance));
    p.coins += this.score.coins;
    p.tokens += this.score.tokens;
    p.totals.runs++;
    p.totals.distance += Math.floor(this.distance);
    p.totals.coins += this.score.coins;
    const setCompleted = this.missions.commitRun(this.stats);
    const fact = pickFact(p.factIndex++);
    this.hooks?.persist();
    this.hooks?.onRunEnd({
      score,
      best: p.best,
      newBest,
      coins: this.score.coins,
      distance: Math.floor(this.distance),
      tokens: this.score.tokens,
      multiplier: this.score.multiplier,
      fact,
      setCompleted,
      reason: this.endReason,
    });
  }

  /** Debug/test helper: jump the run ahead to `d` with fresh obstacles just in front. */
  debugSkipTo(d: number): void {
    this.weather.reset(this.seed);
    this.track.reset(this.seed++);
    this.landmarks.reset();
    this.fellIn = false;
    this.prevDistance = -1;
    this.zone = 0;
    this.sky.setBackdrop(ZONES[0].backdrop);
    this.track.nextD = d + 25;
    this.distance = d;
    this.runTime = (Math.min(CONFIG.speed.max, CONFIG.speed.start + d / 40) - CONFIG.speed.start) / CONFIG.speed.accel;
    this.track.update(0, d, speedAt(this.runTime));
    this.weather.update(d);
    this.prevDistance = d;
    this.enterZone(zoneIndexAt(d));
  }

  private frame = (time: number): void => {
    const rawDt = this.lastTime < 0 ? 0 : (time - this.lastTime) / 1000;
    this.lastTime = time;
    const dt = Math.min(rawDt, CONFIG.render.maxDt);

    this.player.controller.clearEvents();
    this.input.drain(this.handleAction);

    // Power-up timers run on real time, so Tea Time doesn't stretch itself.
    if (this.state === 'running') this.powers.update(dt);
    const simDt = dt * this.timeScale;
    if (this.state === 'running') this.update(simDt);
    else if (this.state === 'caught') this.updateCatch(simDt);
    else if (this.state === 'gameover') this.overTimer += dt;

    const running = this.state === 'running';
    const caught = this.state === 'caught' || this.state === 'gameover';
    const animDt = this.state === 'paused' ? 0 : simDt;
    this.player.sync(animDt, this.speed, running, caught);
    this.powerEffects.update(animDt, this.speed);
    if (caught) this.detective.catchUp(animDt, this.player.controller.x);
    else this.detective.update(animDt, this.player.controller.x, this.speed, running);
    this.obstacleViews.update(animDt, this.distance);
    this.coinViews.update(animDt, this.distance);
    this.powerViews.update(animDt, this.distance);
    this.world.update(this.distance, animDt);
    this.landmarks.update(animDt, this.distance, this.prevDistance < 0 ? this.distance : this.prevDistance);
    this.updateEnvironment(animDt);
    this.prevDistance = this.distance;
    const pc = this.player.controller;
    // The camera rises with flight and follows Spring/Brolly jumps more closely so
    // Jack stays in frame at the top of those big arcs.
    const camGround = pc.flying ? pc.y : pc.grounded ? pc.y : pc.groundY;
    const bigJumps = this.powers.isActive('spring') || this.powers.isActive('brolly');
    this.cameraRig.update(dt, pc.x, pc.y, this.renderer.portrait, camGround, bigJumps ? 0.55 : undefined);
    // HUD timers (toasts, postcards) run on real time, even when frames are slow.
    this.hud.update(Math.min(rawDt, 0.25), this.score.total, this.score.coins, this.score.multiplier, this.distance);
    this.hud.setPowers(this.powers);
    if (running) this.hud.setChase(this.detective.chase.gap, this.detective.chase.stumbleTimer > 0);
    this.sky.update(dt, this.renderer.camera);
    this.renderer.render();
  };

  private update(dt: number): void {
    const c = this.player.controller;

    // --- Forward motion (puddles slow you briefly).
    this.runTime += dt;
    if (this.slowTimer > 0) this.slowTimer = Math.max(0, this.slowTimer - dt);
    const dash = this.powers.isActive('cabDash');
    const target = speedAt(this.runTime) * (dash ? CONFIG.powerups.cabSpeed : this.slowTimer > 0 ? CONFIG.stumble.puddleSlow : 1);
    this.speed = damp(this.speed || target, target, 6, dt);
    const step = this.speed * dt;
    const prevD = this.distance;
    this.distance += step;
    this.score.addDistance(step);
    this.stats.distance = this.distance;

    this.weather.update(this.distance);
    const entered = zoneEntered(prevD, this.distance);
    if (entered >= 0) this.enterZone(entered);
    this.track.update(dt, this.distance, this.speed);
    if (dash) this.cabSteer();
    if (c.flying) this.stats.flightTime += dt;

    // --- Movement: find the surface underfoot (road, ramp or roof), then move.
    this.fillBox(this.prevBox, c.x, c.y, prevD, c.height);
    c.groundY = groundHeight(this.track.obstacles, c.x, this.distance, c.y, prevD);
    c.update(dt);
    this.fillBox(this.curBox, c.x, c.y, this.distance, c.height);

    if (c.justJumped) this.stats.jumps++;
    if (c.rolling && !this.wasRolling) this.stats.rolls++;
    this.wasRolling = c.rolling;
    if (c.grounded && c.y > 0.5) {
      const top = platformUnder(this.track.obstacles, c.x, this.distance, c.y);
      if (top && !top.stoodOn) {
        top.stoodOn = true;
        if (top.kind === 'bus') this.stats.busesTopped++;
      }
    }

    // --- Collisions.
    if (this.grace > 0) this.grace = Math.max(0, this.grace - dt);
    if (this.safeTimer > 0) this.safeTimer = Math.max(0, this.safeTimer - dt);
    const obstacles = this.track.obstacles;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (!o.active) continue;
      const hit = classifyHit(o, this.prevBox, this.curBox);
      if (hit === 'none') continue;
      if (dash) {
        // Black Cab Dash: invincible, and anything smashable goes flying.
        if (o.spec.smashable) this.knock(o);
        continue;
      }
      if (hit === 'fall') {
        if (this.godMode || this.safeTimer > 0) continue;
        if (this.powers.consumeShield()) {
          this.safeTimer = CONFIG.powerups.shieldGrace;
          this.hud.toast('Phew! The helmet saved you from a dip in the Thames!');
          continue;
        }
        this.fellIn = true;
        this.cameraRig.shake(0.6);
        this.beginCatch('crash');
        this.hud.toast('Splash! Into the Thames!', 2);
        return;
      }
      if (hit === 'puddle') {
        o.hit = true;
        this.slowTimer = CONFIG.stumble.puddleTime;
        this.stats.puddles++;
        this.hud.toast('Splash!', 0.8);
        continue;
      }
      if (this.godMode || this.safeTimer > 0) continue;
      if (hit !== 'crash' && this.grace > 0) continue;
      // Bobby's Helmet takes the knock instead of Jack.
      if (this.powers.consumeShield()) {
        if (hit === 'stumble') o.hit = true;
        this.safeTimer = CONFIG.powerups.shieldGrace;
        this.player.flinch(CONFIG.powerups.shieldGrace);
        this.cameraRig.shake(0.35);
        this.hud.toast('Phew! The helmet took the knock!');
        continue;
      }
      if (hit === 'crash') {
        this.player.bonk();
        this.cameraRig.shake(0.9);
        this.beginCatch('crash');
        return;
      }
      if (hit === 'stumble') o.hit = true;
      else c.bounceBack();
      if (this.stumble()) return;
    }

    // --- Coins (the Teacup Magnet pulls them in first).
    if (this.powers.isActive('magnet')) magnetPull(this.track.coins, c.x, c.y + 0.8, this.distance, dt);
    collectCoins(this.track.coins, c.x, c.y, c.height, this.distance, this.onCoin);

    // --- Missions.
    this.stats.zoneReached = Math.floor(this.distance / ZONE_LENGTH);
    const done = this.missions.check(this.stats);
    if (done) {
      for (const m of done) {
        this.hud.toast(`Mission complete: ${m.text}!`, 2.6);
        this.hooks?.onMission(m);
      }
    }
  }

  /** Black Cab Dash: send a smashable obstacle flying. */
  private knock(o: Obstacle): void {
    o.knocked = true;
    o.hit = true;
    this.stats.smashed++;
    this.score.addDistance(10);
    this.cameraRig.shake(0.2);
  }

  /**
   * Black Cab Dash auto-steering: smashable things are driven straight through, but
   * if something heavy (a bus, a guard...) is coming up in this lane, swerve to a
   * lane that is clear of heavy things. If none is, the cab just phases through.
   */
  private cabSteer(): void {
    const c = this.player.controller;
    if (c.x !== c.lane * CONFIG.lanes.width) return; // mid-swerve
    if (!this.heavyAhead(c.lane, 4, 16)) return;
    // From the middle lane try left then right; from an outer lane, the middle.
    if (c.lane === 0) {
      if (!this.heavyAhead(-1, -3, 20)) c.move(-1);
      else if (!this.heavyAhead(1, -3, 20)) c.move(1);
    } else if (!this.heavyAhead(0, -3, 20)) {
      c.move(c.lane > 0 ? -1 : 1);
    }
  }

  private heavyAhead(lane: number, from: number, to: number): boolean {
    for (const o of this.track.obstacles) {
      if (!o.active || o.knocked || o.lane !== lane || o.spec.smashable || o.spec.trigger || o.spec.yMin > 0) continue;
      if (o.kind === 'ramp') continue;
      const ahead = o.d - this.distance;
      if (o.far - this.distance > from && ahead < to) return true;
    }
    return false;
  }

  /** Returns true if this stumble got Jack caught. */
  private stumble(): boolean {
    this.grace = CONFIG.stumble.grace;
    this.stats.stumbles++;
    this.player.flinch(CONFIG.stumble.grace);
    this.cameraRig.shake(0.45);
    if (this.detective.chase.stumble() === 'caught') {
      this.beginCatch('stumbles');
      return true;
    }
    if (this.powers.isActive('corgi')) {
      // Corgi Pal barks him back, so this stumble doesn't count against you.
      this.detective.chase.knockBack();
      this.powerEffects.bark();
      this.hud.toast('Woof! Corgi Pal chases Inspector Bones back!');
      return false;
    }
    this.hud.toast('Whoops! Inspector Bones is right behind you!');
    return false;
  }

  private onCoin = (coin: Coin): void => {
    if (coin.kind === 'power') {
      this.activatePower(coin.power);
      return;
    }
    this.score.addCoin(coin.kind);
    if (coin.kind === 'penny') this.stats.pennies++;
    else if (coin.kind === 'sovereign') this.stats.sovereigns++;
    else {
      this.stats.tokens++;
      this.hud.toast('A Teapot Token!', 1.4);
    }
  };

  private enterZone(index: number): void {
    this.zone = index;
    const z = ZONES[index];
    this.hud.showZone(z.name);
    this.sky.setBackdrop(z.backdrop);
    this.events.emit({ type: 'zone', zone: z.id });
    this.detective.chase.boost = z.detectiveBoost ? 1.7 : 1;
    if (z.detectiveBoost) this.hud.toast('Inspector Bones knows Baker Street well: he is faster here!', 3);
  }

  /**
   * Sky, fog and lighting for where Jack is: zone colours blend into the next zone,
   * fog patches thicken the air (and the lanterns glow), drizzle brings rain and,
   * once it stops, a rainbow.
   */
  private updateEnvironment(dt: number): void {
    const d = this.distance;
    zoneBlend(d, this.blend);
    const A = ZONES[this.blend.a];
    const B = ZONES[this.blend.b];
    const t = this.blend.t;
    this.cTop.setHex(A.sky[0]).lerp(this.cTmp.setHex(B.sky[0]), t);
    this.cBottom.setHex(A.sky[1]).lerp(this.cTmp.setHex(B.sky[1]), t);
    this.cFog.setHex(A.fog).lerp(this.cTmp.setHex(B.fog), t);

    const W = CONFIG.weather;
    const fog = this.weather.amount('fog', d);
    const rain = this.weather.amount('drizzle', d);
    if (fog > 0) {
      // Pea-souper: a soft lilac fog, still bright enough to be friendly.
      this.cTmp.setHex(0xd6cdf0);
      this.cFog.lerp(this.cTmp, fog);
      this.cBottom.lerp(this.cTmp, fog * 0.8);
      this.cTop.lerp(this.cTmp.setHex(0xa9b8ef), fog * 0.6);
    }
    if (rain > 0) {
      this.cTop.lerp(this.cTmp.setHex(0x7fb2e6), rain * 0.5);
      this.cBottom.lerp(this.cTmp.setHex(0xdfeaf5), rain * 0.4);
      this.cFog.lerp(this.cTmp.setHex(0xdfeaf5), rain * 0.4);
    }
    this.sky.setColors(this.cTop, this.cBottom);
    const f = this.renderer.scene.fog as THREE.Fog;
    f.color.copy(this.cFog);
    (this.renderer.scene.background as THREE.Color).copy(this.cBottom);
    f.near = CONFIG.render.fogNear + (W.fogNear - CONFIG.render.fogNear) * fog;
    f.far = CONFIG.render.fogFar + (W.fogFar - CONFIG.render.fogFar) * fog;
    this.world.lanternMat.emissiveIntensity = 0.7 + fog * 1.8;

    // A rainbow for a while after a shower has passed.
    const since = d - this.weather.lastDrizzleEnd;
    const bow = since >= 0 && since < 260 ? Math.min(1, since / 40) * Math.min(1, (260 - since) / 60) : 0;
    this.sky.setRainbow(bow);

    this.weatherFx.update(dt, rain, this.renderer.camera, this.speed);
  }

  private activatePower(kind: PowerKind): void {
    const c = this.player.controller;
    this.powers.activate(kind);
    this.stats.powerUps++;
    this.hud.toast(`${POWER_NAMES[kind]}!`, 1.6);
    const P = CONFIG.powerups;
    switch (kind) {
      case 'helicopter': {
        c.flying = true;
        c.flyHeight = P.flyHeight;
        const until = this.distance + this.speed * this.powers.timeLeft('helicopter') - 10;
        this.track.startSkyTrail(this.distance + 10, until, P.flyHeight, c.lane);
        break;
      }
      case 'spring':
        c.jumpMultiplier = P.springJump;
        break;
      case 'brolly':
        c.jumpMultiplier = P.brollyJump;
        c.gravityMultiplier = P.brollyGravity;
        break;
      case 'cabDash':
        c.driving = true;
        c.rolling = false;
        break;
      case 'teaTime':
        this.timeScale = P.teaTimeScale;
        document.getElementById('app')?.classList.add('tea-time');
        break;
      case 'corgi':
        this.detective.chase.knockBack();
        this.powerEffects.bark();
        break;
      default:
        break;
    }
  }

  private onPowerEnd = (kind: PowerKind): void => {
    const c = this.player.controller;
    switch (kind) {
      case 'helicopter':
        c.flying = false;
        this.track.stopSkyTrail();
        // A short safe window to land, wherever the flight comes down.
        this.safeTimer = Math.max(this.safeTimer, CONFIG.powerups.landingGrace);
        this.player.flinch(CONFIG.powerups.landingGrace);
        break;
      case 'spring':
      case 'brolly':
        c.jumpMultiplier = 1;
        c.gravityMultiplier = 1;
        break;
      case 'cabDash':
        c.driving = false;
        this.safeTimer = Math.max(this.safeTimer, 1.0);
        break;
      case 'teaTime':
        this.timeScale = 1;
        document.getElementById('app')?.classList.remove('tea-time');
        break;
      default:
        break;
    }
  };

  private beginCatch(reason: 'crash' | 'stumbles'): void {
    this.state = 'caught';
    this.endReason = reason;
    this.timeScale = 1;
    document.getElementById('app')?.classList.remove('tea-time');
    this.catchTimer = CONFIG.stumble.catchTime;
    if (reason === 'crash') this.speed = 0;
    this.hud.clearPopups();
    this.hud.showGotYou(true);
  }

  /** The "Got you!" scene: the world grinds to a halt while Bones grabs Jack. */
  private updateCatch(dt: number): void {
    this.speed = damp(this.speed, 0, 7, dt);
    this.distance += this.speed * dt;
    const c = this.player.controller;
    c.groundY = this.fellIn ? -6 : groundHeight(this.track.obstacles, c.x, this.distance, c.y);
    c.update(dt);
    if (this.catchTimer > 0) {
      this.catchTimer -= dt;
      if (this.catchTimer <= 0) {
        const canContinue = !this.continued && this.tokensAvailable >= CONTINUE_COST;
        if (this.hooks) this.hooks.onCatchEnd(canContinue);
        else this.endRun();
      }
    }
  }

  private fillBox(b: PlayerBox, x: number, y: number, d: number, height: number): void {
    b.x = x;
    b.y = y;
    b.d = d;
    b.height = height;
  }

  private handleAction = (a: Action): void => {
    switch (this.state) {
      case 'ready':
        if (this.hooks) this.hooks.onMenuAction(a);
        else if (a === 'tap' || a === 'jump') this.start();
        return;
      case 'paused':
      case 'caught':
        this.hooks?.onMenuAction(a);
        return;
      case 'gameover':
        if (this.overTimer > 0.8) this.hooks?.onMenuAction(a);
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
