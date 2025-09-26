import { describe, expect, it } from 'vitest';

import { bossMap, charmMap, DEFAULT_BOSS_ID } from '../../data';
import {
  MAX_NOTCH_LIMIT,
  MAX_OVERCHARM_OVERFLOW,
  MIN_NOTCH_LIMIT,
  createInitialState,
  fightReducer,
} from './fightReducer';

const getCharmCost = (id: string) => charmMap.get(id)?.cost ?? 0;

describe('fightReducer notch limits', () => {
  it('clamps charm selections to the configured notch limit', () => {
    const state = createInitialState();
    const richSelection = ['shaman-stone', 'spell-twister', 'quick-slash'];

    const withCharms = fightReducer(state, {
      type: 'setActiveCharms',
      charmIds: richSelection,
    });

    expect(withCharms.build.activeCharmIds).toEqual(richSelection);

    const tightened = fightReducer(withCharms, {
      type: 'setCharmNotchLimit',
      notchLimit: 5,
    });

    const totalCost = tightened.build.activeCharmIds.reduce(
      (total, id) => total + getCharmCost(id),
      0,
    );

    expect(totalCost).toBeLessThanOrEqual(5 + MAX_OVERCHARM_OVERFLOW);
    expect(tightened.build.activeCharmIds).toEqual(richSelection);

    const overstuffed = fightReducer(tightened, {
      type: 'setActiveCharms',
      charmIds: [...richSelection, 'lifeblood-heart'],
    });

    expect(overstuffed.build.activeCharmIds).toEqual(richSelection);
  });

  it('respects the minimum and maximum notch limits', () => {
    const state = createInitialState();

    const belowMinimum = fightReducer(state, {
      type: 'setCharmNotchLimit',
      notchLimit: 1,
    });
    expect(belowMinimum.build.notchLimit).toBe(MIN_NOTCH_LIMIT);

    const aboveMaximum = fightReducer(state, {
      type: 'setCharmNotchLimit',
      notchLimit: 30,
    });
    expect(aboveMaximum.build.notchLimit).toBe(MAX_NOTCH_LIMIT);
  });
});

describe('fightReducer fight completion tracking', () => {
  it('records fight end when damage reaches the target HP', () => {
    const state = createInitialState();
    const targetHp = bossMap.get(DEFAULT_BOSS_ID)?.hp ?? 0;

    const timestamp = 1_000;
    const completed = fightReducer(state, {
      type: 'logAttack',
      id: 'finisher',
      label: 'Finisher',
      damage: targetHp,
      category: 'nail',
      timestamp,
    });

    expect(completed.fightEndTimestamp).toBe(timestamp);
    expect(completed.fightManuallyEnded).toBe(false);
  });

  it('allows fights to be ended manually and resumes when new attacks are logged', () => {
    const state = createInitialState();
    const opened = fightReducer(state, {
      type: 'logAttack',
      id: 'opener',
      label: 'Opener',
      damage: 10,
      category: 'nail',
      timestamp: 500,
    });

    const endedManually = fightReducer(opened, {
      type: 'endFight',
      timestamp: 2_000,
    });

    expect(endedManually.fightEndTimestamp).toBe(2_000);
    expect(endedManually.fightManuallyEnded).toBe(true);

    const resumed = fightReducer(endedManually, {
      type: 'logAttack',
      id: 'follow-up',
      label: 'Follow Up',
      damage: 5,
      category: 'nail',
      timestamp: 3_000,
    });

    expect(resumed.fightEndTimestamp).toBeNull();
    expect(resumed.fightManuallyEnded).toBe(false);
  });
});
