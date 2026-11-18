/**
 * Game events for audio, effects and (later) analytics or achievements. Emitted as a
 * type plus an optional detail string, so frequent events (coins) allocate nothing.
 */
export type GameEventType =
  | 'chime'
  | 'zone'
  | 'landmark'
  | 'powerup'
  | 'powerEnd'
  | 'coin'
  | 'jump'
  | 'land'
  | 'roll'
  | 'lane'
  | 'stumble'
  | 'crash'
  | 'fall'
  | 'caught'
  | 'shield'
  | 'puddle'
  | 'smash'
  | 'bark'
  | 'mission'
  | 'continue'
  | 'start'
  | 'pause'
  | 'resume'
  | 'gameover'
  | 'reset';

export type GameListener = (type: GameEventType, detail: string) => void;

export class Events {
  private readonly listeners: GameListener[] = [];

  on(fn: GameListener): void {
    this.listeners.push(fn);
  }

  emit(type: GameEventType, detail = ''): void {
    for (let i = 0; i < this.listeners.length; i++) this.listeners[i](type, detail);
  }
}
