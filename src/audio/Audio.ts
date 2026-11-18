import type { GameEventType } from '../game/Events';

/**
 * All sound is synthesised with the Web Audio API: no audio files to download.
 *
 * - Sound effects are short procedural blips, sweeps, noise bursts and bells.
 * - Music is an original, bouncy music-hall tune (8 bars, C major) played by a
 *   lookahead scheduler, with a gentler variant for menus.
 * - Big Ben plays the Westminster Quarters (1793, public domain) on synthesised bells.
 *
 * Browsers only allow audio after a user gesture, so the context is created/resumed
 * on the first tap or key press.
 */

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

// ---- Music data (original) ----
const _ = null;
/** Melody, one row per bar, eighth notes (MIDI numbers; null = rest). */
const MELODY: (number | null)[][] = [
  [76, _, 79, 76, 72, _, 76, 79],
  [81, _, 79, 77, 81, _, 84, _],
  [79, 76, 79, 84, 83, 81, 79, _],
  [74, _, 79, _, 83, 81, 79, 77],
  [76, _, 79, 76, 84, _, 83, 84],
  [81, 79, 77, 81, 84, _, 81, _],
  [79, 77, 76, 74, 71, 74, 79, _],
  [84, _, 79, _, 72, _, _, _],
];
/** Chord for each bar: [bass root, chord tones]. */
const CHORDS: [number, number[]][] = [
  [48, [60, 64, 67]],
  [53, [60, 65, 69]],
  [48, [60, 64, 67]],
  [43, [62, 67, 71]],
  [48, [60, 64, 67]],
  [53, [60, 65, 69]],
  [43, [62, 67, 71]],
  [48, [60, 64, 67]],
];

/** Westminster Quarters, bells in E major: G#4, F#4, E4, B3. */
const BELLS = [415.3, 369.99, 329.63, 246.94];
const QUARTERS = [
  [0, 1, 2, 3],
  [2, 0, 1, 3],
];

type MusicMode = 'off' | 'menu' | 'run';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private musicVol = 0.7;
  private sfxVol = 0.8;
  private mode: MusicMode = 'off';
  private step = 0;
  private nextTime = 0;
  /** Tempo multiplier (Tea Time slows the band down). */
  private tempo = 1;
  private loops = new Map<string, { stop: () => void }>();
  private paused = false;

  constructor() {
    const unlock = () => {
      this.ensure();
      void this.ctx?.resume();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  /** True once the browser has allowed sound. */
  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  private ensure(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    // A gentle compressor keeps busy moments from clipping.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 18000;
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.musicFilter).connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.applyVolumes();
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    window.setInterval(() => this.schedule(), 25);
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVol = music;
    this.sfxVol = sfx;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const m = this.mode === 'off' ? 0 : this.musicVol * (this.mode === 'menu' ? 0.32 : 0.42) * (this.paused ? 0.35 : 1);
    this.musicBus.gain.setTargetAtTime(m, t, 0.15);
    this.sfxBus.gain.setTargetAtTime(this.sfxVol, t, 0.05);
    this.musicFilter.frequency.setTargetAtTime(this.paused ? 900 : this.tempo < 1 ? 2400 : 18000, t, 0.2);
  }

  setMusic(mode: MusicMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.step = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.1;
    this.applyVolumes();
  }

  // ------------------------------------------------------------------ music

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || this.mode === 'off' || ctx.state !== 'running') return;
    const bpm = (this.mode === 'menu' ? 104 : 138) * this.tempo;
    const eighth = 60 / bpm / 2;
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, eighth);
      this.nextTime += eighth;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(step: number, t: number, eighth: number): void {
    const bar = Math.floor(step / 8);
    const i = step % 8;
    const [root, chord] = CHORDS[bar];
    const run = this.mode === 'run';
    // Oom-pah bass and off-beat chord stabs.
    if (i % 4 === 0) this.note(midi(i === 0 ? root : root + 7), t, eighth * 1.6, 'triangle', 0.32, this.musicBus);
    if (i % 4 === 2) for (const n of chord) this.note(midi(n), t, eighth * 0.7, 'square', 0.035, this.musicBus);
    // Melody (an octave lower and softer in the menus).
    const m = MELODY[bar][i];
    if (m !== null) this.note(midi(run ? m : m - 12), t, eighth * 0.9, run ? 'square' : 'triangle', run ? 0.07 : 0.11, this.musicBus);
    if (!run) return;
    // Drums: kick on the beat, snare on the back beat, hats on the off-beats.
    if (i === 0 || i === 4) this.kick(t);
    if (i === 2 || i === 6) this.hit(t, 0.09, 1800, 'highpass', 0.12, this.musicBus);
    if (i % 2 === 1) this.hit(t, 0.03, 7000, 'highpass', 0.05, this.musicBus);
  }

  private kick(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.17);
  }

  // ------------------------------------------------------------------ primitives

  /** A single tone with optional pitch slide. */
  private note(freq: number, t: number, dur: number, type: OscillatorType, vol: number, out: AudioNode, slideTo?: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** A filtered noise burst (whooshes, splashes, crunches, hats). */
  private hit(t: number, dur: number, freq: number, type: BiquadFilterType, vol: number, out: AudioNode, sweepTo?: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** A struck bell: a fundamental plus slightly inharmonic partials, long decay. */
  private bell(freq: number, t: number, vol: number): void {
    const partials: [number, number][] = [
      [0.5, 0.5],
      [1, 1],
      [1.19, 0.6],
      [1.5, 0.35],
      [2, 0.4],
      [2.52, 0.2],
      [3.01, 0.12],
    ];
    for (const [ratio, amp] of partials) this.note(freq * ratio, t, 2.6 / Math.sqrt(ratio), 'sine', vol * amp, this.sfxBus);
  }

  private seq(freqs: number[], t: number, gap: number, dur: number, type: OscillatorType, vol: number): void {
    freqs.forEach((f, i) => this.note(f, t + i * gap, dur, type, vol, this.sfxBus));
  }

  /** A continuous effect while a power-up lasts (rotor, engine). */
  private loop(name: string, build: (ctx: AudioContext, out: AudioNode) => () => void): void {
    if (!this.ctx || this.loops.has(name)) return;
    const stop = build(this.ctx, this.sfxBus);
    this.loops.set(name, { stop });
  }

  private endLoop(name: string): void {
    this.loops.get(name)?.stop();
    this.loops.delete(name);
  }

  stopLoops(): void {
    for (const k of [...this.loops.keys()]) this.endLoop(k);
  }

  // ------------------------------------------------------------------ public sounds

  /** Westminster Quarters on bells (two changes), ducking the music under them. */
  chime(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + 0.05;
    let t = t0;
    for (const change of QUARTERS) {
      for (const b of change) {
        this.bell(BELLS[b], t, 0.16);
        t += 0.62;
      }
      t += 0.6;
    }
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.12, t0, 0.2);
    this.musicBus.gain.setTargetAtTime(this.mode === 'off' ? 0 : this.musicVol * 0.42, t, 0.6);
  }

  click(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.note(1400, this.ctx.currentTime, 0.04, 'triangle', 0.12, this.sfxBus);
  }

  /** React to a game event. */
  onEvent = (type: GameEventType, detail: string): void => {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.005;
    const S = this.sfxBus;
    switch (type) {
      case 'coin':
        if (detail === 'sovereign') this.seq([1047, 1319, 1568, 2093], t, 0.045, 0.12, 'triangle', 0.18);
        else if (detail === 'token') {
          this.bell(1568, t, 0.12);
          this.bell(2093, t + 0.12, 0.1);
        } else {
          this.note(988, t, 0.06, 'square', 0.08, S);
          this.note(1319, t + 0.055, 0.12, 'square', 0.08, S);
        }
        break;
      case 'jump':
        if (detail === 'big') this.note(180, t, 0.35, 'sine', 0.3, S, 820);
        else this.note(320, t, 0.14, 'triangle', 0.2, S, 720);
        break;
      case 'land':
        this.note(detail === 'big' ? 110 : 150, t, detail === 'big' ? 0.22 : 0.1, 'sine', detail === 'big' ? 0.45 : 0.22, S, 50);
        this.hit(t, 0.08, 900, 'lowpass', 0.12, S);
        break;
      case 'roll':
        this.hit(t, 0.28, 2600, 'bandpass', 0.22, S, 400);
        break;
      case 'lane':
        this.hit(t, 0.09, 3000, 'highpass', 0.07, S);
        break;
      case 'stumble':
        this.note(520, t, 0.28, 'square', 0.12, S, 140);
        this.note(130, t, 0.12, 'sine', 0.3, S, 60);
        break;
      case 'crash':
        this.note(200, t, 0.3, 'sine', 0.5, S, 50);
        this.hit(t, 0.25, 1200, 'lowpass', 0.4, S);
        break;
      case 'fall':
      case 'puddle':
        this.hit(t, type === 'fall' ? 0.7 : 0.3, 1800, 'lowpass', type === 'fall' ? 0.45 : 0.25, S, 300);
        this.note(600, t, 0.12, 'sine', 0.12, S, 1400);
        break;
      case 'caught': {
        // A cartoon police whistle: two pitches trilling fast.
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        o.frequency.value = 2600;
        lfo.frequency.value = 28;
        depth.gain.value = 160;
        lfo.connect(depth).connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.13, t + 0.03);
        g.gain.setValueAtTime(0.13, t + 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        o.connect(g).connect(S);
        o.start(t);
        lfo.start(t);
        o.stop(t + 0.72);
        lfo.stop(t + 0.72);
        this.stopLoops();
        break;
      }
      case 'shield':
        this.bell(620, t, 0.14);
        this.note(900, t, 0.3, 'square', 0.06, S, 300);
        break;
      case 'smash':
        this.hit(t, 0.35, 2200, 'bandpass', 0.35, S, 300);
        this.note(160, t, 0.15, 'sine', 0.3, S, 60);
        break;
      case 'bark':
        for (const k of [0, 0.18]) {
          this.note(640, t + k, 0.11, 'square', 0.12, S, 300);
          this.hit(t + k, 0.08, 900, 'bandpass', 0.12, S);
        }
        break;
      case 'mission':
        this.seq([523, 659, 784, 1047], t, 0.09, 0.22, 'triangle', 0.2);
        this.seq([1568, 2093], t + 0.4, 0.06, 0.2, 'sine', 0.1);
        break;
      case 'zone':
        this.seq([784, 988, 1175], t, 0.11, 0.25, 'triangle', 0.13);
        break;
      case 'continue':
        this.seq([392, 523, 659, 784, 1047], t, 0.07, 0.2, 'square', 0.09);
        break;
      case 'gameover':
        // A cheeky "wah-wah-waaah".
        this.note(392, t, 0.35, 'sawtooth', 0.07, S, 370);
        this.note(370, t + 0.38, 0.35, 'sawtooth', 0.07, S, 349);
        this.note(349, t + 0.76, 0.8, 'sawtooth', 0.07, S, 300);
        break;
      case 'chime':
        this.chime();
        break;
      case 'powerup':
        this.seq([523, 784, 1047], t, 0.06, 0.15, 'square', 0.08);
        this.powerSound(detail, t + 0.2);
        break;
      case 'powerEnd':
        this.endLoop(detail);
        if (detail === 'teaTime') this.setTempo(1);
        this.note(700, t, 0.25, 'triangle', 0.1, S, 300);
        break;
      case 'start':
        this.setMusic('run');
        break;
      case 'reset':
        // Quitting mid-power-up must not leave a rotor or engine humming on the menu.
        this.stopLoops();
        this.setTempo(1);
        this.paused = false;
        this.applyVolumes();
        break;
      case 'pause':
        this.paused = true;
        this.applyVolumes();
        break;
      case 'resume':
        this.paused = false;
        this.applyVolumes();
        break;
      default:
        break;
    }
  };

  private setTempo(k: number): void {
    this.tempo = k;
    this.applyVolumes();
  }

  /** The signature sound of each power-up. */
  private powerSound(kind: string, t: number): void {
    const S = this.sfxBus;
    switch (kind) {
      case 'helicopter':
        this.loop('helicopter', (ctx, out) => {
          // Chopped noise: a rotor going "wup-wup-wup".
          const src = ctx.createBufferSource();
          src.buffer = this.noise;
          src.loop = true;
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 500;
          const g = ctx.createGain();
          g.gain.value = 0.0;
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 14;
          const depth = ctx.createGain();
          depth.gain.value = 0.18;
          lfo.connect(depth).connect(g.gain);
          src.connect(f).connect(g).connect(out);
          src.start();
          lfo.start();
          return () => {
            g.gain.cancelScheduledValues(0);
            depth.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
            src.stop(ctx.currentTime + 0.4);
            lfo.stop(ctx.currentTime + 0.4);
          };
        });
        break;
      case 'spring':
        this.note(160, t, 0.45, 'sine', 0.25, S, 900);
        break;
      case 'brolly':
        this.hit(t, 0.3, 400, 'bandpass', 0.25, S, 3000);
        this.note(900, t + 0.28, 0.08, 'square', 0.1, S);
        break;
      case 'magnet':
        for (let i = 0; i < 6; i++) this.note(1200 + (i % 2) * 300, t + i * 0.05, 0.08, 'sine', 0.08, S);
        break;
      case 'helmet':
        this.bell(700, t, 0.12);
        break;
      case 'cabDash':
        // Honk honk! then an engine rumble while it lasts.
        for (const k of [0, 0.22]) {
          this.note(349, t + k, 0.16, 'square', 0.09, S);
          this.note(440, t + k, 0.16, 'square', 0.09, S);
        }
        this.loop('cabDash', (ctx, out) => {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = 55;
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 300;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.5);
          o.connect(f).connect(g).connect(out);
          o.start();
          return () => {
            g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
            o.stop(ctx.currentTime + 0.5);
          };
        });
        break;
      case 'teaTime':
        // A kettle coming to the boil, and the band slows right down.
        this.note(1100, t, 0.9, 'sine', 0.1, S, 2600);
        this.hit(t, 0.9, 5000, 'highpass', 0.05, S);
        this.setTempo(0.6);
        break;
      case 'corgi':
        // The bark itself comes from the 'bark' event.
        break;
    }
  }
}
