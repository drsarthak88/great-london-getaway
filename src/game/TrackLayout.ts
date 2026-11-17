/**
 * Pure bookkeeping for the endless track: a fixed ring of chunks, each covering
 * [start, start + length) in track distance. When a chunk falls far enough behind
 * the player it jumps to the front of the queue. No allocation after construction.
 */
export class TrackLayout {
  readonly starts: number[];
  private frontStart: number;

  constructor(
    readonly count: number,
    readonly length: number,
    readonly recycleBehind: number,
    /** Track distance where the first chunk begins (negative puts road behind the start line). */
    readonly origin = -20,
  ) {
    this.starts = new Array<number>(count);
    for (let i = 0; i < count; i++) this.starts[i] = origin + i * length;
    this.frontStart = origin + (count - 1) * length;
  }

  reset(): void {
    for (let i = 0; i < this.count; i++) this.starts[i] = this.origin + i * this.length;
    this.frontStart = this.origin + (this.count - 1) * this.length;
  }

  /**
   * Move chunks that are behind `distance` to the front. Calls `onRecycle(index, newStart)`
   * for each moved chunk so the view can re-dress it.
   */
  update(distance: number, onRecycle: (index: number, start: number) => void): void {
    for (let i = 0; i < this.count; i++) {
      // Loop: after a long hitch a chunk might need to leapfrog more than once.
      while (this.starts[i] + this.length < distance - this.recycleBehind) {
        this.frontStart += this.length;
        this.starts[i] = this.frontStart;
        onRecycle(i, this.frontStart);
      }
    }
  }

  /** Furthest track distance currently covered by road. */
  get end(): number {
    return this.frontStart + this.length;
  }
}
