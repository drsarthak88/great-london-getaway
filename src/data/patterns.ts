import type { ObstacleKind } from '../game/ObstacleTypes';

/**
 * Hand-made obstacle patterns. Each pattern uses three "slots" that the spawner maps
 * onto the three lanes in a random order, so one design gives six layouts.
 * `at` is the distance from the pattern's start; for oncoming vehicles it is where
 * they meet the player. Every pattern must leave a way through (see tests/patterns).
 */
export type Slot = 0 | 1 | 2;

export interface PatternItem {
  kind: ObstacleKind;
  slot: Slot;
  at: number;
  /** Drives toward the player instead of being parked. */
  oncoming?: boolean;
}

export interface PatternCoins {
  slot: Slot;
  at: number;
  count: number;
  /** Peak height of an arc (for coins you collect by jumping). */
  arc?: number;
  /** Hang low (for coins you collect by rolling under something). */
  low?: boolean;
}

export interface Pattern {
  id: string;
  length: number;
  /** Difficulty level at which this pattern starts appearing. */
  minLevel: number;
  weight: number;
  items: PatternItem[];
  coins: PatternCoins[];
}

export const PATTERNS: Pattern[] = [
  {
    id: 'barrier',
    length: 10,
    minLevel: 0,
    weight: 3,
    items: [{ kind: 'barrier', slot: 0, at: 5 }],
    coins: [{ slot: 0, at: 0.4, count: 5, arc: 1.7 }],
  },
  {
    id: 'twoBarriers',
    length: 8,
    minLevel: 0,
    weight: 2,
    items: [
      { kind: 'barrier', slot: 0, at: 4 },
      { kind: 'barrier', slot: 1, at: 4 },
    ],
    coins: [{ slot: 2, at: 0, count: 4 }],
  },
  {
    id: 'mindTheGap',
    length: 8,
    minLevel: 0,
    weight: 2,
    items: [{ kind: 'sign', slot: 0, at: 4 }],
    coins: [{ slot: 0, at: 1.8, count: 3, low: true }],
  },
  {
    id: 'busPair',
    length: 11,
    minLevel: 0,
    weight: 3,
    items: [
      { kind: 'bus', slot: 0, at: 0 },
      { kind: 'bus', slot: 1, at: 0 },
    ],
    coins: [{ slot: 2, at: 0, count: 5 }],
  },
  {
    id: 'cabHop',
    length: 12,
    minLevel: 0,
    weight: 2,
    items: [
      { kind: 'cab', slot: 0, at: 2 },
      { kind: 'cab', slot: 1, at: 7 },
    ],
    coins: [{ slot: 0, at: 2, count: 2 }],
  },
  {
    id: 'guardAndBox',
    length: 6,
    minLevel: 0,
    weight: 2,
    items: [
      { kind: 'guard', slot: 0, at: 3 },
      { kind: 'phoneBox', slot: 1, at: 3 },
    ],
    coins: [{ slot: 2, at: 0, count: 3 }],
  },
  {
    id: 'puddles',
    length: 8,
    minLevel: 0,
    weight: 1,
    items: [
      { kind: 'puddle', slot: 0, at: 2 },
      { kind: 'puddle', slot: 1, at: 3 },
    ],
    coins: [{ slot: 2, at: 0, count: 4 }],
  },
  {
    id: 'coinLine',
    length: 16,
    minLevel: 0,
    weight: 2,
    items: [],
    coins: [{ slot: 0, at: 0, count: 7 }],
  },
  {
    id: 'busTrain',
    length: 26,
    minLevel: 1,
    weight: 3,
    items: [
      { kind: 'ramp', slot: 0, at: 0 },
      { kind: 'bus', slot: 0, at: 5 },
      { kind: 'bus', slot: 0, at: 15 },
      { kind: 'bus', slot: 1, at: 4 },
    ],
    coins: [{ slot: 0, at: 1, count: 10 }],
  },
  {
    id: 'oncomingBus',
    length: 14,
    minLevel: 1,
    weight: 2,
    items: [{ kind: 'bus', slot: 0, at: 4, oncoming: true }],
    coins: [{ slot: 1, at: 0, count: 6 }],
  },
  {
    id: 'oncomingCab',
    length: 10,
    minLevel: 1,
    weight: 2,
    items: [
      { kind: 'cab', slot: 0, at: 4, oncoming: true },
      { kind: 'barrier', slot: 1, at: 5 },
    ],
    coins: [{ slot: 2, at: 0, count: 4 }],
  },
  {
    id: 'mixedThree',
    length: 8,
    minLevel: 1,
    weight: 2,
    items: [
      { kind: 'barrier', slot: 0, at: 4 },
      { kind: 'sign', slot: 1, at: 4 },
      { kind: 'postBox', slot: 2, at: 4 },
    ],
    coins: [{ slot: 1, at: 2, count: 3, low: true }],
  },
  {
    id: 'pigeons',
    length: 8,
    minLevel: 1,
    weight: 2,
    items: [
      { kind: 'pigeons', slot: 0, at: 4 },
      { kind: 'pigeons', slot: 1, at: 4 },
    ],
    coins: [{ slot: 0, at: 2.4, count: 3, low: true }],
  },
  {
    id: 'postPhone',
    length: 6,
    minLevel: 1,
    weight: 2,
    items: [
      { kind: 'postBox', slot: 0, at: 3 },
      { kind: 'phoneBox', slot: 1, at: 3 },
      { kind: 'sign', slot: 2, at: 3 },
    ],
    coins: [{ slot: 0, at: -0.1, count: 4, arc: 1.6 }],
  },
  {
    // Two barriers in one lane, far enough apart to jump each separately at any speed.
    id: 'roadworks',
    length: 30,
    minLevel: 2,
    weight: 2,
    items: [
      { kind: 'barrier', slot: 0, at: 1 },
      { kind: 'barrier', slot: 0, at: 26 },
      { kind: 'sign', slot: 1, at: 13 },
      { kind: 'phoneBox', slot: 2, at: 13 },
    ],
    coins: [
      { slot: 0, at: -2.25, count: 4, arc: 1.7 },
      { slot: 0, at: 22.75, count: 4, arc: 1.7 },
    ],
  },
  {
    id: 'busBridge',
    length: 22,
    minLevel: 2,
    weight: 2,
    items: [
      { kind: 'ramp', slot: 0, at: 0 },
      { kind: 'bus', slot: 0, at: 5 },
      { kind: 'bus', slot: 1, at: 7, oncoming: true },
      { kind: 'bus', slot: 2, at: 2 },
    ],
    coins: [{ slot: 0, at: 1, count: 6 }],
  },
  {
    id: 'guardSlalom',
    length: 16,
    minLevel: 2,
    weight: 2,
    items: [
      { kind: 'guard', slot: 0, at: 0 },
      { kind: 'guard', slot: 1, at: 7 },
      { kind: 'guard', slot: 2, at: 14 },
    ],
    coins: [{ slot: 2, at: 0, count: 3 }],
  },
  {
    id: 'busZigzag',
    length: 22,
    minLevel: 3,
    weight: 2,
    items: [
      { kind: 'bus', slot: 0, at: 0 },
      { kind: 'bus', slot: 1, at: 11 },
      { kind: 'barrier', slot: 2, at: 5 },
      { kind: 'sign', slot: 2, at: 15 },
    ],
    coins: [{ slot: 1, at: 0, count: 4 }],
  },
  {
    id: 'doubleOncoming',
    length: 14,
    minLevel: 3,
    weight: 1,
    items: [
      { kind: 'bus', slot: 0, at: 4, oncoming: true },
      { kind: 'cab', slot: 1, at: 6, oncoming: true },
      { kind: 'pigeons', slot: 2, at: 5 },
    ],
    coins: [{ slot: 2, at: 3.2, count: 2, low: true }],
  },
];
