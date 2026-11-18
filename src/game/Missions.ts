import { missionSet, type MissionDef } from '../data/missions';
import type { MissionState } from '../profile/Profile';
import type { RunStats } from './RunStats';

/**
 * Tracks the current set of three missions against the run in progress. Pure logic:
 * reads RunStats, writes only to the MissionState it was given.
 */
export class MissionTracker {
  constructor(private readonly state: MissionState) {}

  get set(): MissionDef[] {
    return missionSet(this.state.setIndex);
  }

  isDone(m: MissionDef): boolean {
    return this.state.done.includes(m.id);
  }

  /** Progress toward a mission, including the run in progress. */
  progress(m: MissionDef, run: RunStats | null): number {
    if (this.isDone(m)) return m.target;
    const now = run ? (run[m.stat] as number) : 0;
    const p = m.scope === 'run' ? now : (this.state.totals[m.id] ?? 0) + now;
    return Math.min(m.target, Math.floor(p));
  }

  /**
   * Check the run so far; returns missions that have just been completed (usually
   * none, so this allocates nothing in the common case).
   */
  check(run: RunStats): MissionDef[] | null {
    let fresh: MissionDef[] | null = null;
    for (const m of this.set) {
      if (this.isDone(m)) continue;
      if (this.progress(m, run) >= m.target) {
        this.state.done.push(m.id);
        (fresh ??= []).push(m);
      }
    }
    return fresh;
  }

  /**
   * At the end of a run: bank 'total' progress, and if all three are done move on to
   * the next set. Returns true when a set was completed (the multiplier went up).
   */
  commitRun(run: RunStats): boolean {
    this.check(run);
    for (const m of this.set) {
      if (m.scope === 'total' && !this.isDone(m)) this.state.totals[m.id] = (this.state.totals[m.id] ?? 0) + (run[m.stat] as number);
    }
    if (this.set.every((m) => this.isDone(m))) {
      this.state.setIndex++;
      this.state.totals = {};
      this.state.done = [];
      return true;
    }
    return false;
  }
}
