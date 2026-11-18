import { POWER_KINDS, POWER_NAMES, type PowerKind, type PowerUps } from '../powerups/PowerUps';

/** Tiny inline icons for the power-up timer rings (drawn in a 24x24 box). */
const POWER_ICONS: Record<PowerKind, string> = {
  helicopter: '<path d="M3 6h18M12 6v5" stroke-width="2.4"/><circle cx="12" cy="15" r="4" fill="currentColor" stroke="none"/>',
  spring: '<path d="M6 5h12M6 9h12M6 13h12M6 17h12M18 5l-12 4M18 9l-12 4M18 13l-12 4" stroke-width="1.8"/>',
  brolly: '<path d="M3 12a9 8 0 0 1 18 0zM12 12v7a2 2 0 0 1-4 0" stroke-width="2"/>',
  magnet: '<path d="M5 9h12v4a6 6 0 0 1-12 0zM17 10h2a2 2 0 0 1 0 4h-2M4 21h14" stroke-width="2"/>',
  helmet: '<path d="M6 18c0-9 2-14 6-14s6 5 6 14zM4 18h16" stroke-width="2"/><circle cx="12" cy="11" r="1.6" fill="currentColor"/>',
  cabDash: '<path d="M3 16v-4l3-4h9l3 4h3v4zM8 8V5h6v3" stroke-width="2"/><circle cx="7" cy="17" r="2" fill="currentColor"/><circle cx="17" cy="17" r="2" fill="currentColor"/>',
  teaTime: '<path d="M5 10h10v4a5 5 0 0 1-10 0zM15 11h2a2 2 0 0 1 0 4h-2M8 7c0-2 2-2 2-4M11 7c0-2 2-2 2-4" stroke-width="2"/>',
  corgi: '<path d="M4 14l2-8 3 4h6l3-4 2 8a8 6 0 0 1-16 0z" stroke-width="2"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/><circle cx="15" cy="13" r="1.2" fill="currentColor"/>',
};
const RING_LEN = 2 * Math.PI * 21;

export interface RunSummary {
  score: number;
  best: number;
  coins: number;
  distance: number;
  tokens: number;
  newBest: boolean;
}

/**
 * In-run HUD and simple overlays (Phase 7 replaces the start and game-over cards with
 * the full storybook UI). DOM text is only touched when the shown value changes.
 */
export class Hud {
  private readonly el: HTMLDivElement;
  private readonly scoreEl: HTMLElement;
  private readonly coinsEl: HTMLElement;
  private readonly multEl: HTMLElement;
  private readonly distanceEl: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly pauseCard: HTMLElement;
  private readonly pauseBtn: HTMLButtonElement;
  private readonly toastEl: HTMLElement;
  private readonly gotYou: HTMLElement;
  private readonly overCard: HTMLElement;
  private readonly overBody: HTMLElement;
  private readonly topBar: HTMLElement;
  private shown = { score: -1, coins: -1, mult: -1, distance: -1 };
  private readonly powerEls = new Map<PowerKind, { el: HTMLElement; ring: SVGCircleElement; shown: number }>();
  private toastTimer = 0;
  private readonly zoneEl: HTMLElement;
  private zoneTimer = 0;
  private readonly cardEl: HTMLElement;
  private cardTimer = 0;
  private readonly cardQueue: { title: string; fact: string }[] = [];

  constructor(root: HTMLElement, handlers: { onPause: () => void; onResume: () => void; onRestart: () => void }) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud-top">
        <div class="hud-left">
          <div class="hud-chip hud-score-chip"><span class="hud-score">0</span><span class="hud-mult" title="Score multiplier">&times;1</span></div>
          <div class="hud-sub"><span class="hud-distance">0</span> m</div>
        </div>
        <div class="hud-right">
          <div class="hud-chip hud-coins-chip"><span class="hud-penny" aria-hidden="true"></span><span class="hud-coins">0</span></div>
          <button class="hud-pause" type="button" aria-label="Pause">&#10074;&#10074;</button>
        </div>
      </div>
      <div class="hud-powers" aria-label="Active power-ups">
        ${POWER_KINDS.map(
          (k) => `<div class="hud-power hud-power-${k}" data-power="${k}" title="${POWER_NAMES[k]}" hidden>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle class="hud-power-track" cx="24" cy="24" r="21"/>
              <circle class="hud-power-ring" cx="24" cy="24" r="21" stroke-dasharray="${RING_LEN.toFixed(1)}" transform="rotate(-90 24 24)"/>
              <g transform="translate(12 12)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${POWER_ICONS[k]}</g>
            </svg>
            <span class="hud-power-name">${POWER_NAMES[k]}</span>
          </div>`,
        ).join('')}
      </div>
      <div class="hud-toast" role="status" aria-live="polite" hidden></div>
      <div class="hud-zone" aria-live="polite" hidden></div>
      <aside class="hud-postcard" aria-live="polite" hidden>
        <div class="hud-postcard-stamp" aria-hidden="true"></div>
        <div class="hud-postcard-kicker">Did you know?</div>
        <div class="hud-postcard-title"></div>
        <p class="hud-postcard-fact"></p>
      </aside>
      <div class="hud-gotyou" hidden>Got you!</div>
      <div class="hud-prompt">
        <h1>The Great London Getaway</h1>
        <p class="hud-tap">Tap or press Space to run!</p>
        <p class="hud-help">Swipe or use arrow keys / WASD &middot; Up or Space to jump &middot; Down to roll</p>
      </div>
      <div class="hud-card hud-pausecard" hidden>
        <h2>Paused</h2>
        <button class="btn" type="button" data-act="resume">Carry on</button>
      </div>
      <div class="hud-card hud-overcard" hidden>
        <h2>Caught!</h2>
        <div class="hud-over-body"></div>
        <button class="btn" type="button" data-act="restart">Run again</button>
      </div>
    `;
    root.appendChild(this.el);
    const q = <T extends HTMLElement>(sel: string) => this.el.querySelector(sel) as T;
    this.scoreEl = q('.hud-score');
    this.coinsEl = q('.hud-coins');
    this.multEl = q('.hud-mult');
    this.distanceEl = q('.hud-distance');
    this.prompt = q('.hud-prompt');
    this.pauseCard = q('.hud-pausecard');
    this.pauseBtn = q('.hud-pause');
    this.toastEl = q('.hud-toast');
    this.gotYou = q('.hud-gotyou');
    this.overCard = q('.hud-overcard');
    this.overBody = q('.hud-over-body');
    this.topBar = q('.hud-top');
    this.zoneEl = q('.hud-zone');
    this.cardEl = q('.hud-postcard');
    for (const k of POWER_KINDS) {
      const el = q<HTMLElement>(`[data-power="${k}"]`);
      this.powerEls.set(k, { el, ring: el.querySelector('.hud-power-ring') as SVGCircleElement, shown: -1 });
    }
    this.pauseBtn.addEventListener('click', handlers.onPause);
    q('[data-act="resume"]').addEventListener('click', handlers.onResume);
    q('[data-act="restart"]').addEventListener('click', handlers.onRestart);
  }

  update(dt: number, score: number, coins: number, multiplier: number, distance: number): void {
    if (score !== this.shown.score) this.scoreEl.textContent = String((this.shown.score = score));
    if (coins !== this.shown.coins) this.coinsEl.textContent = String((this.shown.coins = coins));
    if (multiplier !== this.shown.mult) this.multEl.textContent = `×${(this.shown.mult = multiplier)}`;
    const d = Math.floor(distance);
    if (d !== this.shown.distance) this.distanceEl.textContent = String((this.shown.distance = d));
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.hidden = true;
    }
    if (this.zoneTimer > 0) {
      this.zoneTimer -= dt;
      if (this.zoneTimer <= 0) this.zoneEl.hidden = true;
    }
    if (this.cardTimer > 0) {
      this.cardTimer -= dt;
      if (this.cardTimer <= 0) {
        this.cardEl.hidden = true;
        // Next postcard after a short pause.
        if (this.cardQueue.length) this.cardTimer = -0.6;
      }
    } else if (this.cardTimer < 0) {
      this.cardTimer = Math.min(0, this.cardTimer + dt);
      if (this.cardTimer === 0 && this.cardQueue.length) this.openCard(this.cardQueue.shift()!);
    } else if (this.cardQueue.length) {
      this.openCard(this.cardQueue.shift()!);
    }
  }

  /** Big storybook title as you enter a new part of London. */
  showZone(name: string): void {
    this.zoneEl.textContent = name;
    this.zoneEl.hidden = false;
    // Restart the slide-in animation.
    this.zoneEl.classList.remove('hud-zone-in');
    void this.zoneEl.offsetWidth;
    this.zoneEl.classList.add('hud-zone-in');
    this.zoneTimer = 2.8;
  }

  /** "Did you know?" postcard for a landmark (queued if one is already showing). */
  showPostcard(title: string, fact: string): void {
    if (this.cardQueue.length < 3) this.cardQueue.push({ title, fact });
  }

  private openCard(c: { title: string; fact: string }): void {
    (this.cardEl.querySelector('.hud-postcard-title') as HTMLElement).textContent = c.title;
    (this.cardEl.querySelector('.hud-postcard-fact') as HTMLElement).textContent = c.fact;
    this.cardEl.hidden = false;
    this.cardTimer = 6;
  }

  clearPopups(): void {
    this.cardQueue.length = 0;
    this.cardTimer = 0;
    this.cardEl.hidden = true;
    this.zoneTimer = 0;
    this.zoneEl.hidden = true;
  }

  /** Show a timer ring for each active power-up (DOM only touched on visible change). */
  setPowers(powers: PowerUps): void {
    for (const k of POWER_KINDS) {
      const p = this.powerEls.get(k)!;
      const f = powers.fraction(k);
      // Quantise to 1% so the DOM isn't rewritten every frame.
      const q = Math.ceil(f * 100);
      if (q === p.shown) continue;
      if ((q > 0) !== (p.shown > 0)) p.el.hidden = q <= 0;
      p.shown = q;
      p.ring.style.strokeDashoffset = String(RING_LEN * (1 - q / 100));
      p.el.classList.toggle('hud-power-low', q > 0 && q <= 20);
    }
  }

  toast(text: string, seconds = 2.2): void {
    this.toastEl.textContent = text;
    this.toastEl.hidden = false;
    this.toastTimer = seconds;
  }

  showPrompt(show: boolean): void {
    this.prompt.hidden = !show;
    this.pauseBtn.hidden = show;
    this.topBar.classList.toggle('hud-dim', show);
  }

  showPaused(show: boolean): void {
    this.pauseCard.hidden = !show;
  }

  showGotYou(show: boolean): void {
    this.gotYou.hidden = !show;
    if (show) this.pauseBtn.hidden = true;
  }

  showGameOver(summary: RunSummary | null): void {
    this.overCard.hidden = !summary;
    if (!summary) return;
    this.toastEl.hidden = true;
    this.overBody.innerHTML = `
      <dl class="hud-stats">
        <dt>Score</dt><dd>${summary.score}${summary.newBest ? ' <span class="hud-best">New best!</span>' : ''}</dd>
        <dt>Best</dt><dd>${summary.best}</dd>
        <dt>Coins</dt><dd>${summary.coins}</dd>
        <dt>Distance</dt><dd>${summary.distance} m</dd>
        <dt>Teapot Tokens</dt><dd>${summary.tokens}</dd>
      </dl>`;
  }
}
