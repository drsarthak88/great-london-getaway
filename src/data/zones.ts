/**
 * The eight London zones a run cycles through. Pure data: palettes (deliberately bright
 * and cheerful), landmark placements (distance into the zone and side of the road),
 * scenery flags and obstacle-pattern weight tweaks.
 */
export type LandmarkId =
  | 'parliament'
  | 'bigBen'
  | 'londonEye'
  | 'towerOfLondon'
  | 'towerBridge'
  | 'buckingham'
  | 'victoriaMemorial'
  | 'nelson'
  | 'piccadilly'
  | 'baker221b'
  | 'stPauls'
  | 'camden'
  | 'nottingHill';

export type BackdropId = 'bigBen' | 'eye' | 'shard' | 'gherkin' | 'dome' | 'bridge';

export interface LandmarkPlacement {
  id: LandmarkId;
  /** Distance into the zone of the landmark's centre. */
  at: number;
  /** -1 left of the road, 1 right, 0 spanning the road. */
  side: -1 | 0 | 1;
  /** Length along the road it occupies (terraces are cleared to make room). */
  length: number;
}

export interface ZoneDef {
  id: string;
  name: string;
  /** Sky gradient (top, horizon) and fog colour. */
  sky: [number, number];
  fog: number;
  /** Bright facade colours for the terraces. */
  buildings: number[];
  doors: number[];
  road: number;
  pavement: number;
  /** Ground beyond the pavements (grass in park zones). */
  ground: number;
  landmarks: LandmarkPlacement[];
  /** Stretches of river replacing the terraces: [from, to] per side, in zone distance. */
  river?: { left?: [number, number]; right?: [number, number] };
  /** The road crosses a bridge: towers over the road and bascule gaps to jump. */
  bridge?: { from: number; to: number; towers: number[]; gaps: number[] };
  /** Lollipop trees instead of terraces (parks). */
  trees?: boolean;
  /** Bright billboard screens on the buildings over [from, to]. */
  billboards?: [number, number];
  /** Striped market stalls along the pavement over [from, to]. */
  stalls?: [number, number];
  /** Victorian gas lamps (lanterns glow). */
  gasLamps?: boolean;
  /** Inspector Bones knows these streets: he is faster here. */
  detectiveBoost?: boolean;
  /** Pattern weight multipliers by pattern id (0 removes a pattern). */
  patternWeights?: Record<string, number>;
  backdrop: BackdropId[];
}

const DOORS = [0xe63946, 0x2a9d8f, 0x1d4ed8, 0xffb703, 0x7b2cbf, 0x16a34a];

export const ZONES: ZoneDef[] = [
  {
    id: 'westminster',
    name: 'Westminster',
    sky: [0x3fb6ff, 0xfff0b8],
    fog: 0xffe8c4,
    buildings: [0xffc93c, 0xff6b3d, 0xfff1d0, 0x46b5ff, 0x4cc96f, 0xffa94d],
    doors: DOORS,
    road: 0x8a8fa8,
    pavement: 0xf2e4c4,
    ground: 0xe8d6b0,
    landmarks: [
      { id: 'parliament', at: 90, side: -1, length: 96 },
      { id: 'bigBen', at: 165, side: -1, length: 28 },
    ],
    backdrop: ['eye'],
  },
  {
    id: 'southBank',
    name: 'South Bank',
    sky: [0x34c3ff, 0xffe3f1],
    fog: 0xffe1ee,
    buildings: [0xff4d6d, 0xffc93c, 0x2ec4b6, 0xff8fb1, 0x7bd389, 0xffffff],
    doors: DOORS,
    road: 0x8f8fb0,
    pavement: 0xf6e7d0,
    ground: 0xe9d9bb,
    landmarks: [{ id: 'londonEye', at: 200, side: 1, length: 70 }],
    river: { right: [0, 480] },
    backdrop: ['bigBen', 'dome'],
  },
  {
    id: 'towerBridge',
    name: 'Tower Bridge',
    sky: [0x2fa8ff, 0xd8f6ff],
    fog: 0xd6f2ff,
    buildings: [0xffc93c, 0xff6b3d, 0x46b5ff, 0xfff1d0, 0x4cc96f],
    doors: DOORS,
    road: 0x8a8fa8,
    pavement: 0xf2e4c4,
    ground: 0x8fd16a,
    landmarks: [
      { id: 'towerOfLondon', at: 80, side: -1, length: 60 },
      { id: 'towerBridge', at: 275, side: 0, length: 210 },
    ],
    river: { left: [160, 390], right: [160, 390] },
    bridge: { from: 170, to: 380, towers: [210, 340], gaps: [255, 298] },
    patternWeights: { oncomingBus: 0, oncomingCab: 0, busBridge: 0, doubleOncoming: 0 },
    backdrop: ['shard'],
  },
  {
    id: 'buckingham',
    name: 'Buckingham Palace & The Mall',
    sky: [0x45b7ff, 0xfff4c2],
    fog: 0xfff0c8,
    buildings: [0xfff1d0, 0xffe08a, 0xffffff],
    doors: DOORS,
    road: 0xe2483d,
    pavement: 0xf6ecd6,
    ground: 0x6fd35b,
    trees: true,
    landmarks: [
      { id: 'victoriaMemorial', at: 210, side: -1, length: 36 },
      { id: 'buckingham', at: 290, side: 1, length: 110 },
    ],
    patternWeights: { guardAndBox: 4, guardSlalom: 4 },
    backdrop: ['bigBen'],
  },
  {
    id: 'trafalgar',
    name: 'Trafalgar Square & Piccadilly Circus',
    sky: [0x3aa8ff, 0xffe0b0],
    fog: 0xffdcb8,
    buildings: [0xffd166, 0xff6b3d, 0x06d6a0, 0x118ab2, 0xef476f, 0xfff1d0],
    doors: DOORS,
    road: 0x8a8fa8,
    pavement: 0xf2e4c4,
    ground: 0xe8d6b0,
    landmarks: [
      { id: 'nelson', at: 110, side: -1, length: 50 },
      { id: 'piccadilly', at: 320, side: 1, length: 30 },
    ],
    billboards: [250, 400],
    backdrop: ['bigBen', 'eye'],
  },
  {
    id: 'bakerStreet',
    name: 'Baker Street',
    sky: [0x4aa3ff, 0xffe6c8],
    fog: 0xffe2c6,
    buildings: [0xd9542f, 0xf28c28, 0xe0b23a, 0xc0392b, 0x8cc63f],
    doors: [0x16a34a, 0xe63946, 0x1d4ed8, 0x111111, 0xffb703],
    road: 0x86889e,
    pavement: 0xefdfc0,
    ground: 0xe4d2ac,
    gasLamps: true,
    detectiveBoost: true,
    landmarks: [{ id: 'baker221b', at: 220, side: 1, length: 14 }],
    backdrop: ['dome'],
  },
  {
    id: 'stPauls',
    name: "St Paul's & the City",
    sky: [0x38b0ff, 0xe8fbff],
    fog: 0xe2f6ff,
    buildings: [0x46b5ff, 0xffffff, 0x2ec4b6, 0xffc93c, 0xff6b3d, 0x9bf6ff],
    doors: DOORS,
    road: 0x8a8fa8,
    pavement: 0xf2e4c4,
    ground: 0xe8d6b0,
    landmarks: [{ id: 'stPauls', at: 180, side: -1, length: 80 }],
    backdrop: ['shard', 'gherkin'],
  },
  {
    id: 'camden',
    name: 'Camden & Notting Hill',
    sky: [0x3fc1ff, 0xffe1f5],
    fog: 0xffdff2,
    buildings: [0xff5fa2, 0x7ed957, 0xffd93b, 0x5ec8ff, 0xff8a3d, 0xb47cff, 0x2ec4b6],
    doors: [0xffffff, 0x111111, 0xffd93b, 0xe63946, 0x1d4ed8],
    road: 0x8f8aa8,
    pavement: 0xf8e6d8,
    ground: 0xeedcc4,
    stalls: [60, 230],
    landmarks: [
      { id: 'camden', at: 140, side: 0, length: 20 },
      { id: 'nottingHill', at: 340, side: 0, length: 60 },
    ],
    backdrop: ['shard'],
  },
];
