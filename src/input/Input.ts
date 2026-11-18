import { CONFIG } from '../config';
import { SwipeDetector } from './SwipeDetector';

export type Action = 'left' | 'right' | 'jump' | 'roll' | 'tap' | 'pause';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ArrowDown: 'roll',
  KeyS: 'roll',
  Escape: 'pause',
  KeyP: 'pause',
};

const SWIPE_TO_ACTION = { left: 'left', right: 'right', up: 'jump', down: 'roll' } as const;

/**
 * Collects keyboard and swipe input into a small queue the game drains once per frame,
 * so every press is handled exactly once and in order, even at low frame rates.
 */
export class Input {
  private readonly queue: Action[] = [];
  private readonly swipe: SwipeDetector;
  private pointerId: number | null = null;

  constructor(private readonly target: HTMLElement) {
    this.swipe = new SwipeDetector(CONFIG.input.swipeMinPx, CONFIG.input.tapMaxMs);
    window.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    window.addEventListener('blur', this.onPointerCancel);
  }

  /** Drain queued actions into `handler`, oldest first. */
  drain(handler: (a: Action) => void): void {
    for (let i = 0; i < this.queue.length; i++) handler(this.queue[i]);
    this.queue.length = 0;
  }

  /** Inject an action (used by on-screen buttons and automated tests). */
  push(a: Action): void {
    if (this.queue.length < 16) this.queue.push(a);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
    window.removeEventListener('blur', this.onPointerCancel);
  }

  private updateThreshold(): void {
    const short = Math.min(window.innerWidth, window.innerHeight);
    this.swipe.threshold = Math.max(CONFIG.input.swipeMinPx, short * CONFIG.input.swipeFraction);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Don't steal keys from form controls in menus.
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return;
    const action = KEYMAP[e.code];
    if (!action) {
      if (e.code === 'Enter') this.push('tap');
      return;
    }
    e.preventDefault();
    if (e.repeat) return;
    this.push(action);
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.pointerId !== null) return; // ignore extra fingers
    this.pointerId = e.pointerId;
    this.updateThreshold();
    this.swipe.begin(e.clientX, e.clientY, e.timeStamp);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    const dir = this.swipe.move(e.clientX, e.clientY);
    if (dir) this.push(SWIPE_TO_ACTION[dir]);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    const res = this.swipe.end(e.clientX, e.clientY, e.timeStamp);
    if (res === 'tap') this.push('tap');
    else if (res) this.push(SWIPE_TO_ACTION[res]);
  };

  private onPointerCancel = (): void => {
    this.pointerId = null;
    this.swipe.cancel();
  };
}
