import { describe, expect, it } from 'vitest';

import { charmMap } from '../../data';
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
