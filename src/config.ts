/**
 * All gameplay tunables live here so balancing never means hunting through files.
 * Keep values plain data (no Three.js imports) so pure logic and tests can use them.
 */
export const CONFIG = {
  render: {
    /** Cap device pixel ratio so high-DPI phones keep 60 fps. */
    maxPixelRatio: 2,
    fov: 60,
    /** Wider field of view in portrait so all three lanes stay on screen. */
    fovPortrait: 74,
    near: 0.1,
    far: 260,
    /** Number of light bands in the toon gradient ramp (3-4 reads as "storybook"). */
    toonSteps: 4,
    /** Thickness of inverted-hull outlines in world units. */
    outlineThickness: 0.035,
    /** Thinner ink line for characters, which are small on screen and seen close up. */
    characterOutline: 0.022,
    fogNear: 60,
    fogFar: 170,
    /** Largest simulation step; longer frames (tab switches, hitches) are clamped. */
    maxDt: 1 / 20,
  },

  lanes: {
    count: 3,
    /** Distance between lane centres in world units. */
    width: 2.5,
    /** Seconds to slide fully from one lane to the next. */
    changeTime: 0.14,
  },

  speed: {
    /** Forward speed in world units per second at the start of a run. */
    start: 15,
    /** Top speed reached late in a run. */
    max: 34,
    /** Units/s gained per second of running (ramps gradually). */
    accel: 0.12,
  },

  player: {
    /** Apex height of a normal jump. */
    jumpHeight: 2.1,
    /** Total airtime of a normal jump on flat ground, in seconds. */
    jumpDuration: 0.66,
    /** Downward speed when the player swipes down mid-air. */
    fastFallSpeed: 22,
    /** Seconds a roll lasts. */
    rollDuration: 0.62,
    /** Collider height standing and rolling. */
    standHeight: 1.5,
    rollHeight: 0.7,
    /** Collider half-width (x) and half-depth (z). */
    halfWidth: 0.42,
    halfDepth: 0.4,
  },

  camera: {
    height: 4.7,
    distance: 7.4,
    portraitHeight: 5.4,
    portraitDistance: 8.8,
    lookAhead: 9,
    /** How much of the player's sideways offset the camera follows (0..1). */
    followX: 0.55,
    /** Kept low so jumps clearly read as height on screen. */
    followY: 0.22,
    /** Exponential smoothing rates (per second). */
    dampX: 8,
    dampY: 5,
  },

  detective: {
    /** Gap (world units) when he is right on Jack's tail. */
    closeGap: 3.4,
    /** Sideways offset from Jack's lane so he never hides Jack from the camera. */
    sideOffset: 1.35,
    /** Gap when he has fallen back out of view behind the camera. */
    farGap: 16,
    /** Seconds he stays on Jack's heels at the start of a run. */
    startChaseTime: 2.6,
    /** How quickly he closes in / drops back (per second smoothing rate). */
    approachRate: 3.2,
    retreatRate: 0.9,
    /** He is hidden (and skipped) beyond this gap. */
    hideGap: 11,
  },

  obstacles: {
    /** Patterns are spawned until this far ahead of the player. */
    spawnAhead: 150,
    /** Track distance where the first pattern starts (a clear runway before it). */
    firstAt: 45,
    /** Minimum clear road between patterns, and extra per unit of speed. */
    gapBase: 7,
    gapPerSpeed: 0.55,
    /** Obstacles this far behind the player are recycled. */
    recycleBehind: 20,
    /** Speed of oncoming buses and cabs (track units per second). */
    oncomingBusSpeed: 8,
    oncomingCabSpeed: 10,
    /** Player feet within this of a surface's top count as "on it" (step-up allowance). */
    stepUp: 0.55,
    /** Distance per difficulty level (more and harder patterns unlock). */
    levelEvery: 450,
    maxLevel: 4,
  },

  coins: {
    /** Floating height of coins above the surface they sit on. */
    hover: 0.65,
    spacing: 2.3,
    /** Chance each spawned coin is a gold sovereign instead of a penny. */
    sovereignChance: 0.03,
    pennyValue: 1,
    sovereignValue: 10,
    /** A Teapot Token appears somewhere in each stretch of this many units. */
    tokenEvery: [650, 1100] as const,
    /** Pickup reach around the player. */
    reachX: 0.85,
    reachD: 1.0,
    spin: 3.2,
  },

  score: {
    /** Points per unit of distance, before the multiplier. */
    perMetre: 1,
    /** Points per coin value, before the multiplier. */
    perCoin: 5,
  },

  stumble: {
    /** A second stumble within this many seconds of the first gets you caught. */
    window: 10,
    /** Grace period after a stumble during which further hits are ignored. */
    grace: 0.9,
    /** Puddles slow you to this fraction of speed... */
    puddleSlow: 0.72,
    /** ...for this long. */
    puddleTime: 1.2,
    /** Length of the "Got you!" catch scene before Game Over. */
    catchTime: 2.0,
  },

  powerups: {
    /** Base durations in seconds (shop upgrades add `upgradeStep` per level). */
    duration: {
      helicopter: 10,
      spring: 10,
      brolly: 10,
      magnet: 10,
      helmet: 15,
      cabDash: 8,
      teaTime: 8,
      corgi: 12,
    },
    upgradeStep: 0.15,
    maxLevel: 5,
    /** A pickup appears somewhere in each stretch of this many units. */
    spawnEvery: [230, 380] as const,
    /** Relative pick weights; the corgi is rare. */
    weights: {
      helicopter: 1,
      spring: 1.2,
      brolly: 1,
      magnet: 1.5,
      helmet: 1.3,
      cabDash: 1,
      teaTime: 1,
      corgi: 0.35,
    },
    /** Helicopter Tail: cruising height (above bus roofs) and the safe window after landing. */
    flyHeight: 5.6,
    landingGrace: 2.4,
    /** Spring Tail jump height multiplier (3x clears a bus). */
    springJump: 3,
    /** Brolly Glide: bigger, floatier jumps and slow falls. */
    brollyJump: 1.35,
    brollyGravity: 0.38,
    /** Teacup Magnet reach (sideways, along the road) and pull speed. */
    magnetReach: 8,
    magnetAhead: 12,
    magnetSpeed: 30,
    /** Black Cab Dash speed multiplier. */
    cabSpeed: 1.55,
    /** Tea Time world speed. */
    teaTimeScale: 0.5,
    /** Grace after the helmet absorbs a hit. */
    shieldGrace: 1.4,
  },

  zones: {
    /** Length of each zone; they cycle in order. */
    length: 480,
    /** Colours blend into the next zone over this final stretch. */
    blend: 70,
  },

  weather: {
    /** Clear road between weather events (random in this range). */
    gap: [550, 950] as const,
    /** Length of a fog patch or drizzle shower. */
    length: [220, 320] as const,
    /** Fade in/out distance. */
    ramp: 45,
    /** Fog distances at full fog. */
    fogNear: 10,
    fogFar: 52,
    /** Puddle patterns are this much more likely during drizzle. */
    drizzlePuddles: 5,
  },

  world: {
    /** Length of one recycled track chunk. */
    chunkLength: 40,
    /** Number of chunks kept alive (visible distance = chunkLength * chunkCount). */
    chunkCount: 6,
    /** How far behind the player a chunk may fall before it is recycled. */
    recycleBehind: 14,
    pavementWidth: 3,
    buildingsPerSide: 5,
  },

  input: {
    /** Minimum swipe distance as a fraction of the shorter screen side. */
    swipeFraction: 0.045,
    /** Never require less than this many CSS pixels for a swipe. */
    swipeMinPx: 22,
    /** A touch shorter than this (ms) that never became a swipe counts as a tap. */
    tapMaxMs: 300,
  },

  colors: {
    skyTop: 0x3fb6ff,
    skyBottom: 0xfff0b8,
    road: 0x7d817a,
    roadMarking: 0xf5f0e0,
    pavement: 0xcfc6b4,
    kerb: 0xb3aa98,
    busRed: 0xd8392b,
    gold: 0xf0b429,
    ink: 0x2b2118,
    ginger: 0xe8862a,
    buildings: [0xff6b3d, 0xffc93c, 0x4cc96f, 0xff4d6d, 0x46b5ff, 0xfff1d0, 0xff8fb1, 0x2ec4b6],
  },
} as const;

export type GameConfig = typeof CONFIG;
