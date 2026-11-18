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
  private toastTimer = 0;

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
      <div class="hud-toast" role="status" aria-live="polite" hidden></div>
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
