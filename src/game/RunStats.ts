/** Counters for the current run, used by missions (Phase 7) and the Case File. */
export class RunStats {
  distance = 0;
  pennies = 0;
  sovereigns = 0;
  tokens = 0;
  jumps = 0;
  rolls = 0;
  /** Distinct buses Jack has stood on top of. */
  busesTopped = 0;
  stumbles = 0;
  puddles = 0;
  powerUps = 0;
  /** Seconds spent flying with the Helicopter Tail. */
  flightTime = 0;
  /** Obstacles sent flying by the Black Cab Dash. */
  smashed = 0;

  reset(): void {
    this.distance = 0;
    this.pennies = 0;
    this.sovereigns = 0;
    this.tokens = 0;
    this.jumps = 0;
    this.rolls = 0;
    this.busesTopped = 0;
    this.stumbles = 0;
    this.puddles = 0;
    this.powerUps = 0;
    this.flightTime = 0;
    this.smashed = 0;
  }
}
