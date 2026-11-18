/** Game events other systems (audio, missions) can listen to. */
export type GameEvent =
  | { type: 'chime' }
  | { type: 'zone'; zone: string }
  | { type: 'landmark'; id: string }
  | { type: 'powerup'; kind: string }
  | { type: 'coin'; kind: string }
  | { type: 'jump' }
  | { type: 'roll' }
  | { type: 'stumble' }
  | { type: 'caught' };

export class Events {
  private readonly listeners: ((e: GameEvent) => void)[] = [];

  on(fn: (e: GameEvent) => void): void {
    this.listeners.push(fn);
  }

  emit(e: GameEvent): void {
    for (const fn of this.listeners) fn(e);
  }
}
