/**
 * Key-value persistence behind an async interface, so the backing store can change
 * without touching game code: localStorage today; Capacitor Preferences in a native
 * app, or a cloud profile once accounts exist.
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Browser localStorage, with every access guarded (private mode, blocked storage...). */
export class LocalStore implements KeyValueStore {
  constructor(private readonly prefix = 'glg:') {}

  async get(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(this.prefix + key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(this.prefix + key, value);
    } catch {
      // Storage full or unavailable: the game keeps working, progress just isn't kept.
    }
  }

  async remove(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(this.prefix + key);
    } catch {
      /* ignore */
    }
  }
}

/** In-memory store (tests, or a fallback when nothing else is available). */
export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}
