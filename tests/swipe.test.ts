import { describe, expect, it } from 'vitest';
import { SwipeDetector } from '../src/input/SwipeDetector';

describe('SwipeDetector', () => {
  it('detects each direction once the threshold is crossed', () => {
    const cases: Array<[number, number, string]> = [
      [40, 0, 'right'],
      [-40, 5, 'left'],
      [3, -40, 'up'],
      [-5, 40, 'down'],
    ];
    for (const [dx, dy, dir] of cases) {
      const s = new SwipeDetector(30);
      s.begin(100, 100, 0);
      expect(s.move(100 + dx / 4, 100 + dy / 4)).toBeNull();
      expect(s.move(100 + dx, 100 + dy)).toBe(dir);
    }
  });

  it('fires only once per gesture', () => {
    const s = new SwipeDetector(30);
    s.begin(0, 0, 0);
    expect(s.move(50, 0)).toBe('right');
    expect(s.move(120, 0)).toBeNull();
    expect(s.end(120, 0, 100)).toBeNull();
  });

  it('reports a short, still touch as a tap', () => {
    const s = new SwipeDetector(30);
    s.begin(0, 0, 0);
    expect(s.end(4, 3, 120)).toBe('tap');
  });

  it('does not report a long press as a tap', () => {
    const s = new SwipeDetector(30, 300);
    s.begin(0, 0, 0);
    expect(s.end(0, 0, 900)).toBeNull();
  });

  it('classifies a fast flick on release when no move event crossed the threshold', () => {
    const s = new SwipeDetector(30);
    s.begin(0, 0, 0);
    expect(s.end(0, -80, 60)).toBe('up');
  });
});
