import type { KeyValueStore } from '../services/Storage';
import { OUTFITS, outfitById, type OutfitSlot } from '../data/wardrobe';
import { POWER_KINDS, type PowerKind } from '../powerups/PowerUps';
import { CONFIG } from '../config';

/**
 * The player's saved progress. Versioned so future updates (accounts, cloud sync,
 * costume packs) can migrate old saves instead of wiping them.
 */
export const PROFILE_VERSION = 1;
const KEY = 'profile';

export interface Settings {
  /** 0..1 */
  music: number;
  /** 0..1 */
  sfx: number;
  reducedMotion: boolean;
  colourBlind: boolean;
  /** Short buzzes on crashes and stumbles (phones that support it). */
  vibration: boolean;
}

export interface MissionState {
  /** Index of the current mission set (also the number of sets completed). */
  setIndex: number;
  /** Running totals for 'total' missions in the current set, by mission id. */
  totals: Record<string, number>;
  /** Missions in the current set already completed. */
  done: string[];
}

export interface Profile {
  version: number;
  best: number;
  bestDistance: number;
  coins: number;
  tokens: number;
  owned: string[];
  equipped: Record<OutfitSlot, string | null>;
  upgrades: Partial<Record<PowerKind, number>>;
  settings: Settings;
  missions: MissionState;
  introSeen: boolean;
  totals: { runs: number; distance: number; coins: number };
  /** Rotates through facts so the Case File shows a new one each time. */
  factIndex: number;
  /** First-run hints already shown ("jump", "roll", "dodge", ...). */
  hints: string[];
}

export function defaultProfile(): Profile {
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return {
    version: PROFILE_VERSION,
    best: 0,
    bestDistance: 0,
    coins: 0,
    tokens: 0,
    owned: [],
    equipped: { head: null, neck: null, body: null },
    upgrades: {},
    settings: { music: 0.7, sfx: 0.8, reducedMotion: reduce, colourBlind: false, vibration: true },
    missions: { setIndex: 0, totals: {}, done: [] },
    introSeen: false,
    totals: { runs: 0, distance: 0, coins: 0 },
    factIndex: 0,
    hints: [],
  };
}

const num = (v: unknown, d: number, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);

/**
 * Turn whatever was stored (possibly old, partial or corrupted) into a valid profile.
 * Unknown fields are dropped; bad values fall back to defaults.
 */
export function migrate(raw: unknown): Profile {
  const p = defaultProfile();
  if (!raw || typeof raw !== 'object') return p;
  const r = raw as Record<string, any>;
  p.best = num(r.best, 0);
  p.bestDistance = num(r.bestDistance, 0);
  p.coins = num(r.coins, 0);
  p.tokens = num(r.tokens, 0);
  if (Array.isArray(r.owned)) p.owned = r.owned.filter((id: unknown) => typeof id === 'string' && !!outfitById(id as string));
  if (r.equipped && typeof r.equipped === 'object') {
    for (const slot of ['head', 'neck', 'body'] as OutfitSlot[]) {
      const id = r.equipped[slot];
      const item = outfitById(id);
      p.equipped[slot] = item && item.slot === slot && p.owned.includes(id) ? id : null;
    }
  }
  if (r.upgrades && typeof r.upgrades === 'object') {
    for (const k of POWER_KINDS) {
      const l = num(r.upgrades[k], 0, 0, CONFIG.powerups.maxLevel);
      if (l > 0) p.upgrades[k] = Math.floor(l);
    }
  }
  if (r.settings && typeof r.settings === 'object') {
    const s = r.settings;
    p.settings = {
      music: num(s.music, p.settings.music, 0, 1),
      sfx: num(s.sfx, p.settings.sfx, 0, 1),
      reducedMotion: bool(s.reducedMotion, p.settings.reducedMotion),
      colourBlind: bool(s.colourBlind, false),
      vibration: bool(s.vibration, true),
    };
  }
  if (r.missions && typeof r.missions === 'object') {
    p.missions.setIndex = Math.floor(num(r.missions.setIndex, 0, 0, 999));
    if (r.missions.totals && typeof r.missions.totals === 'object') {
      for (const [k, v] of Object.entries(r.missions.totals)) if (typeof v === 'number' && v >= 0) p.missions.totals[k] = v;
    }
    if (Array.isArray(r.missions.done)) p.missions.done = r.missions.done.filter((x: unknown) => typeof x === 'string');
  }
  p.introSeen = bool(r.introSeen, false);
  if (r.totals && typeof r.totals === 'object') {
    p.totals = { runs: num(r.totals.runs, 0), distance: num(r.totals.distance, 0), coins: num(r.totals.coins, 0) };
  }
  p.factIndex = Math.floor(num(r.factIndex, 0));
  if (Array.isArray(r.hints)) p.hints = r.hints.filter((h: unknown) => typeof h === 'string');
  return p;
}

export async function loadProfile(store: KeyValueStore): Promise<Profile> {
  const text = await store.get(KEY);
  if (!text) return defaultProfile();
  try {
    return migrate(JSON.parse(text));
  } catch {
    return defaultProfile();
  }
}

export async function saveProfile(store: KeyValueStore, p: Profile): Promise<void> {
  await store.set(KEY, JSON.stringify(p));
}

// ---------- shop rules (pure) ----------

export type BuyResult = 'ok' | 'owned' | 'poor' | 'unavailable';

export function buyOutfit(p: Profile, id: string): BuyResult {
  const item = outfitById(id);
  if (!item || item.pack) return 'unavailable';
  if (p.owned.includes(id)) return 'owned';
  if (p.coins < item.price) return 'poor';
  p.coins -= item.price;
  p.owned.push(id);
  p.equipped[item.slot] = id;
  return 'ok';
}

/** Equip an owned item, or take it off if it is already worn. */
export function toggleOutfit(p: Profile, id: string): boolean {
  const item = outfitById(id);
  if (!item || !p.owned.includes(id)) return false;
  p.equipped[item.slot] = p.equipped[item.slot] === id ? null : id;
  return true;
}

/** Coins to buy the next level of a power-up upgrade. */
export function upgradeCost(level: number): number {
  return [250, 500, 1000, 2000, 4000][level] ?? Infinity;
}

export function buyUpgrade(p: Profile, kind: PowerKind): BuyResult {
  const level = p.upgrades[kind] ?? 0;
  if (level >= CONFIG.powerups.maxLevel) return 'owned';
  const cost = upgradeCost(level);
  if (p.coins < cost) return 'poor';
  p.coins -= cost;
  p.upgrades[kind] = level + 1;
  return 'ok';
}

/** Score multiplier from missions: +1 for every completed set, capped at 30. */
export function multiplierFor(p: Profile): number {
  return Math.min(30, 1 + p.missions.setIndex);
}

/** Teapot Tokens needed for the one second chance per run. */
export const CONTINUE_COST = 1;

/** Shop listing helper. */
export function outfitsForSale() {
  return OUTFITS;
}
