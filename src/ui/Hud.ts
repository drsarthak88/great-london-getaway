/**
 * Minimal Phase 2 HUD: distance readout, start prompt, pause button and pause card.
 * DOM text is only touched when the shown value changes, so the HUD costs nothing per frame.
 */
export class Hud {
  private readonly el: HTMLDivElement;
  private readonly distanceEl: HTMLSpanElement;
  private readonly prompt: HTMLDivElement;
  private readonly pauseCard: HTMLDivElement;
  private readonly pauseBtn: HTMLButtonElement;
  private shownDistance = -1;

  constructor(root: HTMLElement, onPause: () => void, onResume: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud-top">
        <div class="hud-chip"><span class="hud-label">Distance</span> <span class="hud-distance">0</span> m</div>
        <button class="hud-pause" type="button" aria-label="Pause">&#10074;&#10074;</button>
      </div>
      <div class="hud-prompt">
        <h1>The Great London Getaway</h1>
        <p class="hud-tap">Tap or press Space to run!</p>
        <p class="hud-help">Swipe or use arrow keys / WASD &middot; Up or Space to jump &middot; Down to roll</p>
      </div>
      <div class="hud-pausecard" hidden>
        <h2>Paused</h2>
        <button class="btn" type="button">Carry on</button>
      </div>
    `;
    root.appendChild(this.el);
    this.distanceEl = this.el.querySelector('.hud-distance')!;
    this.prompt = this.el.querySelector('.hud-prompt')!;
    this.pauseCard = this.el.querySelector('.hud-pausecard')!;
    this.pauseBtn = this.el.querySelector('.hud-pause')!;
    this.pauseBtn.addEventListener('click', onPause);
    this.pauseCard.querySelector('button')!.addEventListener('click', onResume);
  }

  setDistance(m: number): void {
    const v = Math.floor(m);
    if (v === this.shownDistance) return;
    this.shownDistance = v;
    this.distanceEl.textContent = String(v);
  }

  showPrompt(show: boolean): void {
    this.prompt.hidden = !show;
    this.pauseBtn.hidden = show;
  }

  showPaused(show: boolean): void {
    this.pauseCard.hidden = !show;
  }
}
