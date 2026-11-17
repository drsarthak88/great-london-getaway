/**
 * All gameplay tunables live here so balancing never means hunting through files.
 * Later phases extend this object; keep values plain data (no Three.js imports).
 */
export const CONFIG = {
  render: {
    /** Cap device pixel ratio so high-DPI phones keep 60 fps. */
    maxPixelRatio: 2,
    fov: 60,
    near: 0.1,
    far: 400,
    /** Number of light bands in the toon gradient ramp (3-4 reads as "storybook"). */
    toonSteps: 4,
    /** Thickness of inverted-hull outlines in world units. */
    outlineThickness: 0.035,
  },
  colors: {
    skyTop: 0xa9d4f0,
    skyBottom: 0xfbe3c4,
    ground: 0x8a8f86,
    busRed: 0xd8392b,
    gold: 0xf0b429,
    ink: 0x2b2118,
  },
} as const;

export type GameConfig = typeof CONFIG;
