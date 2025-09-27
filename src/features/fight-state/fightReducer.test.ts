import { describe, expect, it } from 'vitest';

import { bossMap, bossSequenceMap, charmMap, DEFAULT_BOSS_ID } from '../../data';
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

describe('fightReducer sequence management', () => {
  const masterSequence = bossSequenceMap.get('pantheon-of-the-master');

  if (!masterSequence) {
    throw new Error('Expected pantheon-of-the-master sequence to be defined for tests');
  }

  const firstStage = masterSequence.entries[0];
  const secondStage = masterSequence.entries[1];

  if (!firstStage || !secondStage) {
    throw new Error('Expected pantheon-of-the-master sequence to have multiple stages');
  }

  it('clears progress across all stages when resetting the sequence', () => {
    let state = createInitialState();

    state = fightReducer(state, {
      type: 'startSequence',
      sequenceId: masterSequence.id,
    });

    state = fightReducer(state, {
      type: 'logAttack',
      id: 'stage-0-hit',
      label: 'Stage 0 Hit',
      damage: Math.max(1, Math.floor(firstStage.target.hp / 2)),
      category: 'nail',
      timestamp: 1_000,
    });

    state = fightReducer(state, { type: 'advanceSequence' });

    state = fightReducer(state, {
      type: 'logAttack',
      id: 'stage-1-hit',
      label: 'Stage 1 Hit',
      damage: Math.max(1, Math.floor(secondStage.target.hp / 3)),
      category: 'nail',
      timestamp: 2_000,
    });

    expect(state.sequenceIndex).toBe(1);
    expect(state.damageLog).toHaveLength(1);
    expect(state.activeSequenceId).toBe(masterSequence.id);

    const reset = fightReducer(state, { type: 'resetSequence' });

    expect(reset.activeSequenceId).toBe(masterSequence.id);
    expect(reset.sequenceIndex).toBe(0);
    expect(reset.damageLog).toHaveLength(0);
    expect(reset.redoStack).toHaveLength(0);
    expect(reset.fightEndTimestamp).toBeNull();
    expect(reset.fightManuallyEnded).toBe(false);
    expect(reset.selectedBossId).toBe(firstStage.target.id);

    const sequencePrefix = `${masterSequence.id}#`;

    expect(
      Object.keys(reset.sequenceLogs).some((key) => key.startsWith(sequencePrefix)),
    ).toBe(false);
    expect(
      Object.keys(reset.sequenceRedoStacks).some((key) => key.startsWith(sequencePrefix)),
    ).toBe(false);
    expect(
      Object.keys(reset.sequenceFightEndTimestamps).some((key) =>
        key.startsWith(sequencePrefix),
      ),
    ).toBe(false);
    expect(
      Object.keys(reset.sequenceManualEndFlags).some((key) =>
        key.startsWith(sequencePrefix),
      ),
    ).toBe(false);
  });
});
