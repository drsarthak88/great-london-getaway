import { describe, expect, it } from 'vitest';
import { Chase } from '../src/game/Chase';
import { CONFIG } from '../src/config';

const D = CONFIG.detective;

function run(c: Chase, seconds: number): void {
  for (let t = 0; t < seconds; t += 1 / 60) c.update(1 / 60);
}

describe('Chase', () => {
  it('starts far behind and out of view by default', () => {
    const c = new Chase();
    expect(c.gap).toBe(D.farGap);
    expect(c.visible).toBe(false);
  });

  it('closes in while pulled close, then drops back out of view', () => {
    const c = new Chase();
    c.pullClose(3);
    run(c, 2.5);
    expect(c.isClose).toBe(true);
    expect(c.gap).toBeLessThan(D.closeGap + 0.3);
    expect(c.visible).toBe(true);
    run(c, 6);
    expect(c.isClose).toBe(false);
    expect(c.visible).toBe(false);
  });

  it('extends rather than shortens an existing close window', () => {
    const c = new Chase();
    c.pullClose(5);
    c.pullClose(1);
    run(c, 3);
    expect(c.isClose).toBe(true);
  });
});
