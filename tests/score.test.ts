import { describe, expect, it } from 'vitest';
import { Score } from '../src/game/Score';
import { Chase } from '../src/game/Chase';
import { collectCoins } from '../src/game/Coins';
import { Coin } from '../src/game/Track';
import { CONFIG } from '../src/config';

describe('Score', () => {
  it('scores distance plus coins, scaled by the multiplier', () => {
    const s = new Score();
    s.addDistance(100);
    expect(s.total).toBe(100 * CONFIG.score.perMetre);
    s.addCoin('penny');
    expect(s.coins).toBe(1);
    expect(s.total).toBe(100 + CONFIG.score.perCoin);
  });

  it('applies a raised multiplier only to what is earned afterwards', () => {
    const s = new Score();
    s.addDistance(100);
    s.multiplier = 3;
    s.addDistance(100);
    expect(s.total).toBe(100 + 300);
  });

  it('sovereigns are worth ten pennies and tokens are counted separately', () => {
    const s = new Score();
    expect(s.addCoin('sovereign')).toBe(10);
    expect(s.coins).toBe(10);
    s.addCoin('token');
    expect(s.tokens).toBe(1);
    expect(s.coins).toBe(10);
  });

  it('resets between runs', () => {
    const s = new Score();
    s.addDistance(50);
    s.addCoin('penny');
    s.reset(2);
    expect(s.total).toBe(0);
    expect(s.coins).toBe(0);
    expect(s.multiplier).toBe(2);
  });
});

describe('Stumble and catch', () => {
  it('a first stumble warns and brings Bones close; a second within the window catches', () => {
    const c = new Chase();
    expect(c.stumble()).toBe('warned');
    expect(c.isClose).toBe(true);
    for (let t = 0; t < 5; t += 1 / 60) c.update(1 / 60);
    expect(c.stumble()).toBe('caught');
  });

  it('a second stumble after the window has passed only warns again', () => {
    const c = new Chase();
    c.stumble();
    for (let t = 0; t < CONFIG.stumble.window + 0.5; t += 1 / 60) c.update(1 / 60);
    expect(c.stumble()).toBe('warned');
  });

  it('the start-of-run chase does not count as a stumble', () => {
    const c = new Chase();
    c.pullClose(CONFIG.detective.startChaseTime);
    expect(c.stumble()).toBe('warned');
  });

  it('knockBack (Corgi Pal) forgives the last stumble', () => {
    const c = new Chase();
    c.stumble();
    c.knockBack();
    expect(c.stumble()).toBe('warned');
  });
});

describe('collectCoins', () => {
  const coin = (x: number, y: number, d: number): Coin => Object.assign(new Coin(), { active: true, kind: 'penny', x, y, d });

  it('collects coins in reach and skips ones in other lanes or out of reach', () => {
    const coins = [coin(0, 0.65, 10), coin(2.5, 0.65, 10), coin(0, 0.65, 14), coin(0, 4.4, 10)];
    const got: Coin[] = [];
    collectCoins(coins, 0, 0, 1.5, 10.2, (c) => got.push(c));
    expect(got).toHaveLength(1);
    expect(coins[0].active).toBe(false);
    expect(coins[1].active).toBe(true);
  });

  it('collects high coins when jumping and low coins when rolling', () => {
    const high = [coin(0, 2.6, 10)];
    expect(collectCoins(high, 0, 1.6, 1.5, 10, () => {})).toBe(1);
    const low = [coin(0, 0.4, 10)];
    expect(collectCoins(low, 0, 0, 0.7, 10, () => {})).toBe(1);
  });
});
