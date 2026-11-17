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
    height: 4.1,
    distance: 7,
    portraitHeight: 4.9,
    portraitDistance: 8.4,
    lookAhead: 9,
    /** How much of the player's sideways offset the camera follows (0..1). */
    followX: 0.55,
    /** Kept low so jumps clearly read as height on screen. */
    followY: 0.22,
    /** Exponential smoothing rates (per second). */
    dampX: 8,
    dampY: 5,
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
    skyTop: 0xa9d4f0,
    skyBottom: 0xfbe3c4,
    road: 0x7d817a,
    roadMarking: 0xf5f0e0,
    pavement: 0xcfc6b4,
    kerb: 0xb3aa98,
    busRed: 0xd8392b,
    gold: 0xf0b429,
    ink: 0x2b2118,
    ginger: 0xe8862a,
    buildings: [0xc1674c, 0xe2c79f, 0xa9584a, 0xd9b48f, 0xb8c4c9, 0xe8d8b8, 0x9c6b5a, 0xc9a27e],
  },
} as const;

export type GameConfig = typeof CONFIG;
