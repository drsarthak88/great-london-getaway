import { describe, expect, it } from 'vitest';
import { buyOutfit, buyUpgrade, defaultProfile, loadProfile, migrate, multiplierFor, saveProfile, toggleOutfit, upgradeCost } from '../src/profile/Profile';
import { MemoryStore } from '../src/services/Storage';
import { LocalLeaderboard } from '../src/services/Leaderboard';
import { MissionTracker } from '../src/game/Missions';
import { RunStats } from '../src/game/RunStats';
import { MISSION_SETS, missionSet } from '../src/data/missions';
import { OUTFITS } from '../src/data/wardrobe';
import { shareMessage } from '../src/services/Share';
import { CONFIG } from '../src/config';

describe('profile save/load', () => {
  it('round-trips through a store', async () => {
    const store = new MemoryStore();
    const p = defaultProfile();
    p.coins = 1234;
    p.best = 999;
    p.introSeen = true;
    await saveProfile(store, p);
    const q = await loadProfile(store);
    expect(q.coins).toBe(1234);
    expect(q.best).toBe(999);
    expect(q.introSeen).toBe(true);
  });

  it('survives corrupted or missing saves', async () => {
    const store = new MemoryStore();
    expect((await loadProfile(store)).coins).toBe(0);
    await store.set('profile', '{not json');
    expect((await loadProfile(store)).coins).toBe(0);
  });

  it('cleans up bad values when migrating', () => {
    const p = migrate({
      coins: -50,
      tokens: 'lots',
      owned: ['flatCap', 'madeUpHat', 42],
      equipped: { head: 'flatCap', neck: 'bowler', body: 'pearlyJacket' },
      upgrades: { spring: 99, magnet: 2, nonsense: 3 },
      settings: { music: 5, sfx: -1, reducedMotion: 'yes' },
    });
    expect(p.coins).toBe(0);
    expect(p.tokens).toBe(0);
    expect(p.owned).toEqual(['flatCap']);
    expect(p.equipped).toEqual({ head: 'flatCap', neck: null, body: null });
    expect(p.upgrades).toEqual({ spring: CONFIG.powerups.maxLevel, magnet: 2 });
    expect(p.settings.music).toBe(1);
    expect(p.settings.sfx).toBe(0);
  });
});

describe('shop', () => {
  it('buys an outfit with coins, equips it, and refuses to sell it twice', () => {
    const p = defaultProfile();
    p.coins = 1000;
    expect(buyOutfit(p, 'flatCap')).toBe('ok');
    expect(p.coins).toBe(700);
    expect(p.equipped.head).toBe('flatCap');
    expect(buyOutfit(p, 'flatCap')).toBe('owned');
    expect(buyOutfit(p, 'pearlyJacket')).toBe('poor');
  });

  it('wearing a new hat replaces the old one; tapping again takes it off', () => {
    const p = defaultProfile();
    p.coins = 5000;
    buyOutfit(p, 'flatCap');
    buyOutfit(p, 'bowler');
    expect(p.equipped.head).toBe('bowler');
    toggleOutfit(p, 'flatCap');
    expect(p.equipped.head).toBe('flatCap');
    toggleOutfit(p, 'flatCap');
    expect(p.equipped.head).toBeNull();
    expect(toggleOutfit(p, 'unionScarf')).toBe(false);
  });

  it('includes all four classic outfits', () => {
    expect(OUTFITS.map((o) => o.id).sort()).toEqual(['bowler', 'flatCap', 'pearlyJacket', 'unionScarf']);
  });

  it('upgrades power-ups with rising prices up to the max level', () => {
    const p = defaultProfile();
    p.coins = 1e6;
    let spent = 0;
    for (let l = 0; l < CONFIG.powerups.maxLevel; l++) {
      spent += upgradeCost(l);
      expect(buyUpgrade(p, 'magnet')).toBe('ok');
    }
    expect(buyUpgrade(p, 'magnet')).toBe('owned');
    expect(p.upgrades.magnet).toBe(CONFIG.powerups.maxLevel);
    expect(p.coins).toBe(1e6 - spent);
    expect(upgradeCost(1)).toBeGreaterThan(upgradeCost(0));
  });
});

describe('missions', () => {
  const stats = (o: Partial<RunStats>) => Object.assign(new RunStats(), o);

  it('every set has three missions with positive targets', () => {
    for (let i = 0; i < MISSION_SETS.length + 5; i++) {
      const set = missionSet(i);
      expect(set).toHaveLength(3);
      for (const m of set) expect(m.target).toBeGreaterThan(0);
    }
  });

  it('"run" missions need it all in one run; "total" missions add up across runs', () => {
    const p = defaultProfile();
    const t = new MissionTracker(p.missions);
    // Set 1: 50 pennies total, 10 jumps in a run, 500 m in a run.
    t.commitRun(stats({ pennies: 30, jumps: 6, distance: 300 }));
    expect(t.progress(t.set[0], null)).toBe(30);
    expect(t.isDone(t.set[1])).toBe(false);
    t.commitRun(stats({ pennies: 25, jumps: 6, distance: 300 }));
    expect(t.isDone(t.set[0])).toBe(true);
    expect(t.isDone(t.set[1])).toBe(false);
  });

  it('reports a mission the moment it is completed mid-run, once', () => {
    const p = defaultProfile();
    const t = new MissionTracker(p.missions);
    const run = stats({ jumps: 9 });
    expect(t.check(run)).toBeNull();
    run.jumps = 10;
    expect(t.check(run)?.map((m) => m.id)).toEqual(['s1b']);
    expect(t.check(run)).toBeNull();
  });

  it('finishing all three raises the multiplier and moves to the next set', () => {
    const p = defaultProfile();
    const t = new MissionTracker(p.missions);
    expect(multiplierFor(p)).toBe(1);
    const levelled = t.commitRun(stats({ pennies: 60, jumps: 12, distance: 600 }));
    expect(levelled).toBe(true);
    expect(multiplierFor(p)).toBe(2);
    expect(t.set[0].id).toBe('s2a');
    expect(p.missions.done).toEqual([]);
  });
});

describe('leaderboard and sharing', () => {
  it('keeps the local top scores in order and reports rank', async () => {
    const lb = new LocalLeaderboard(new MemoryStore(), 3);
    expect(await lb.submit({ score: 100, distance: 50, date: 'a' })).toBe(1);
    expect(await lb.submit({ score: 300, distance: 50, date: 'b' })).toBe(1);
    expect(await lb.submit({ score: 200, distance: 50, date: 'c' })).toBe(2);
    expect(await lb.submit({ score: 10, distance: 5, date: 'd' })).toBe(0);
    expect((await lb.top(5)).map((e) => e.score)).toEqual([300, 200, 100]);
  });

  it('builds a friendly share message', () => {
    expect(shareMessage(12345, 678)).toContain('12,345');
  });
});

describe('Case File facts', async () => {
  const { pickFact, ALL_FACTS } = await import('../src/data/facts');
  it('rotates through every fact before repeating', () => {
    const seen = new Set<string>();
    for (let i = 0; i < ALL_FACTS.length; i++) seen.add(pickFact(i));
    expect(seen.size).toBe(ALL_FACTS.length);
    expect(pickFact(ALL_FACTS.length)).toBe(pickFact(0));
  });
});
