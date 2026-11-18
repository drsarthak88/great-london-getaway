import type { RunStats } from '../game/RunStats';

/**
 * Missions come in sets of three. Finishing a whole set raises the score multiplier
 * by one for all future runs. `run` missions must be done within a single run;
 * `total` missions add up across runs.
 */
export type StatKey = Exclude<keyof RunStats, 'reset'>;

export interface MissionDef {
  id: string;
  text: string;
  stat: StatKey;
  target: number;
  scope: 'run' | 'total';
}

export const MISSION_SETS: MissionDef[][] = [
  [
    { id: 's1a', text: 'Collect 50 pennies', stat: 'pennies', target: 50, scope: 'total' },
    { id: 's1b', text: 'Jump 10 times in one run', stat: 'jumps', target: 10, scope: 'run' },
    { id: 's1c', text: 'Run 500 m in one run', stat: 'distance', target: 500, scope: 'run' },
  ],
  [
    { id: 's2a', text: 'Collect 200 pennies', stat: 'pennies', target: 200, scope: 'total' },
    { id: 's2b', text: 'Jump on 5 buses', stat: 'busesTopped', target: 5, scope: 'total' },
    { id: 's2c', text: 'Roll 8 times in one run', stat: 'rolls', target: 8, scope: 'run' },
  ],
  [
    { id: 's3a', text: 'Fly past Big Ben', stat: 'bigBenFlights', target: 1, scope: 'total' },
    { id: 's3b', text: 'Use 3 power-ups in one run', stat: 'powerUps', target: 3, scope: 'run' },
    { id: 's3c', text: 'Reach Tower Bridge', stat: 'zoneReached', target: 2, scope: 'run' },
  ],
  [
    { id: 's4a', text: 'Collect 5 gold sovereigns', stat: 'sovereigns', target: 5, scope: 'total' },
    { id: 's4b', text: 'Smash 5 things in a Black Cab Dash', stat: 'smashed', target: 5, scope: 'total' },
    { id: 's4c', text: 'Run 1,500 m in one run', stat: 'distance', target: 1500, scope: 'run' },
  ],
  [
    { id: 's5a', text: 'Collect 500 pennies', stat: 'pennies', target: 500, scope: 'total' },
    { id: 's5b', text: 'Jump on 5 buses in one run', stat: 'busesTopped', target: 5, scope: 'run' },
    { id: 's5c', text: 'Reach Buckingham Palace', stat: 'zoneReached', target: 3, scope: 'run' },
  ],
];

/** After the hand-made sets, missions keep coming with growing targets. */
export function missionSet(index: number): MissionDef[] {
  if (index < MISSION_SETS.length) return MISSION_SETS[index];
  const k = index - MISSION_SETS.length + 1;
  return [
    { id: `g${index}a`, text: `Collect ${300 + k * 200} pennies`, stat: 'pennies', target: 300 + k * 200, scope: 'total' },
    { id: `g${index}b`, text: `Run ${(1500 + k * 500).toLocaleString('en-GB')} m in one run`, stat: 'distance', target: 1500 + k * 500, scope: 'run' },
    { id: `g${index}c`, text: `Jump on ${5 + k * 3} buses`, stat: 'busesTopped', target: 5 + k * 3, scope: 'total' },
  ];
}
