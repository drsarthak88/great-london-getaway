import type { KeyValueStore } from './Storage';

export interface ScoreEntry {
  score: number;
  distance: number;
  /** ISO date. */
  date: string;
  name?: string;
}

/**
 * Leaderboard behind an interface: a local top-10 today, an online board shared with
 * friends once there are accounts and a server.
 */
export interface Leaderboard {
  submit(entry: ScoreEntry): Promise<number>;
  top(n: number): Promise<ScoreEntry[]>;
}

export class LocalLeaderboard implements Leaderboard {
  constructor(private readonly store: KeyValueStore, private readonly size = 10) {}

  private async read(): Promise<ScoreEntry[]> {
    try {
      const raw = JSON.parse((await this.store.get('scores')) ?? '[]');
      return Array.isArray(raw) ? raw.filter((e) => e && typeof e.score === 'number') : [];
    } catch {
      return [];
    }
  }

  /** Returns the entry's rank (1-based), or 0 if it didn't make the board. */
  async submit(entry: ScoreEntry): Promise<number> {
    const list = await this.read();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const kept = list.slice(0, this.size);
    await this.store.set('scores', JSON.stringify(kept));
    const rank = kept.indexOf(entry);
    return rank < 0 ? 0 : rank + 1;
  }

  async top(n: number): Promise<ScoreEntry[]> {
    return (await this.read()).slice(0, n);
  }
}
