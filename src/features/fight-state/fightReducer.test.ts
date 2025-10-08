import { describe, expect, it } from 'vitest';

import { bossMap, bossSequenceMap, charmMap, DEFAULT_BOSS_ID } from '../../data';
import { applyLogUpdate, resolveFightCompletion } from './reducer/actions';
import {
  appendEventAggregates,
  createEmptyAggregates,
  deriveDamageLogAggregates,
} from './reducer/aggregates';
import {
  MAX_NOTCH_LIMIT,
  MAX_OVERCHARM_OVERFLOW,
  MIN_NOTCH_LIMIT,
  clampCharmSelection,
  clampNotchLimit,
  createInitialState,
} from './reducer/build';
import { ensureSequenceState, toSequenceStageKey } from './reducer/sequence';
import type { AttackEvent, FightState } from './reducer/types';
import { fightReducer } from './fightReducer';

const getCharmCost = (id: string) => charmMap.get(id)?.cost ?? 0;

describe('fight reducer helper modules', () => {
  describe('build helpers', () => {
    it('clamps charm selections to the configured notch limit', () => {
      const richSelection = ['shaman-stone', 'spell-twister', 'quick-slash'];
      const clamped = clampCharmSelection(richSelection, 5);

      const totalCost = clamped.reduce((total, id) => total + getCharmCost(id), 0);

      expect(totalCost).toBeLessThanOrEqual(5 + MAX_OVERCHARM_OVERFLOW);
      expect(clamped).toEqual(richSelection);
    });

    it('respects the minimum and maximum notch limits', () => {
      expect(clampNotchLimit(1)).toBe(MIN_NOTCH_LIMIT);
      expect(clampNotchLimit(30)).toBe(MAX_NOTCH_LIMIT);
      expect(clampNotchLimit(7)).toBe(7);
    });
  });

  describe('aggregates helpers', () => {
    it('derives aggregates from logged events', () => {
      const events = [
        { id: 'a', label: 'A', damage: 5, category: 'nail', timestamp: 100 },
        { id: 'b', label: 'B', damage: 7, category: 'spell', timestamp: 200 },
        { id: 'c', label: 'C', damage: 3, category: 'nail-art', timestamp: 150 },
      ] satisfies AttackEvent[];

      const aggregates = deriveDamageLogAggregates(events);

      expect(aggregates.totalDamage).toBe(15);
      expect(aggregates.attacksLogged).toBe(3);
      expect(aggregates.firstAttackTimestamp).toBe(100);
      expect(aggregates.lastAttackTimestamp).toBe(200);
    });
  });

  describe('actions helpers', () => {
    it('resolves fight completion when damage reaches the target HP', () => {
      const state = createInitialState();
      const targetHp = bossMap.get(state.selectedBossId)?.hp ?? 0;
      const event: AttackEvent = {
        id: 'finisher',
        label: 'Finisher',
        damage: targetHp,
        category: 'nail',
        timestamp: 1_000,
      };
      const log = [event];
      const aggregates = appendEventAggregates(createEmptyAggregates(), event);

      const completion = resolveFightCompletion(state, log, aggregates);

      expect(completion.fightEndTimestamp).toBe(event.timestamp);
      expect(completion.fightManuallyEnded).toBe(false);
    });

    it('preserves a pre-existing completion timestamp when requested', () => {
      const state: FightState = {
        ...createInitialState(),
        fightEndTimestamp: 2_000,
        fightManuallyEnded: false,
      };
      const event: AttackEvent = {
        id: 'follow-up',
        label: 'Follow Up',
        damage: 1,
        category: 'nail',
        timestamp: 2_500,
      };
      const log = [event];
      const aggregates = appendEventAggregates(createEmptyAggregates(), event);

      const completion = resolveFightCompletion(state, log, aggregates, {
        preserveEndTimestamp: true,
      });

      expect(completion.fightEndTimestamp).toBe(2_000);
      expect(completion.fightManuallyEnded).toBe(false);
    });

    it('applies log updates across active sequence state', () => {
      const event: AttackEvent = {
        id: 'stage-event',
        label: 'Stage Event',
        damage: 10,
        category: 'nail',
        timestamp: 3_000,
      };
      const aggregates = appendEventAggregates(createEmptyAggregates(), event);
      const sequenceId = 'test-sequence';
      const state: FightState = {
        ...createInitialState(),
        activeSequenceId: sequenceId,
        sequenceIndex: 1,
      };
      const fightCompletion = {
        fightEndTimestamp: 4_000,
        fightManuallyEnded: false,
      };
      const fightStart = { timestamp: 2_000, manuallyStarted: true };

      const updated = applyLogUpdate(
        state,
        [event],
        aggregates,
        [event],
        fightCompletion,
        fightStart,
      );

      const key = toSequenceStageKey(sequenceId, 1);

      expect(updated.damageLog).toEqual([event]);
      expect(updated.damageLogAggregates).toEqual(aggregates);
      expect(updated.damageLogVersion).toBe(state.damageLogVersion + 1);
      expect(updated.redoStack).toEqual([event]);
      expect(updated.fightEndTimestamp).toBe(4_000);
      expect(updated.fightManuallyEnded).toBe(false);
      expect(updated.fightStartTimestamp).toBe(2_000);
      expect(updated.fightManuallyStarted).toBe(true);
      expect(updated.sequenceLogs[key]).toEqual([event]);
      expect(updated.sequenceLogAggregates[key]).toEqual(aggregates);
      expect(updated.sequenceRedoStacks[key]).toEqual([event]);
      expect(updated.sequenceFightStartTimestamps[key]).toBe(2_000);
      expect(updated.sequenceManualStartFlags[key]).toBe(true);
      expect(updated.sequenceFightEndTimestamps[key]).toBe(4_000);
      expect(updated.sequenceManualEndFlags[key]).toBe(false);
    });
  });
});

describe('sequence helpers', () => {
  it('clamps invalid sequence indices and reloads stored logs', () => {
    const masterSequence = bossSequenceMap.get('pantheon-of-the-master');
    if (!masterSequence) {
      throw new Error('Expected pantheon-of-the-master sequence to be defined for tests');
    }

    let state = createInitialState();
    state = fightReducer(state, {
      type: 'startSequence',
      sequenceId: masterSequence.id,
    });

    const stageDamage = Math.max(1, Math.floor(masterSequence.entries[0].target.hp / 2));
    state = fightReducer(state, {
      type: 'logAttack',
      id: 'stage-0',
      label: 'Stage 0 Hit',
      damage: stageDamage,
      category: 'nail',
      timestamp: 1_000,
    });

    const mutated: FightState = {
      ...state,
      damageLog: [],
      damageLogAggregates: deriveDamageLogAggregates([]),
      sequenceIndex: -5,
    };

    const ensured = ensureSequenceState(mutated);

    expect(ensured.sequenceIndex).toBe(0);
    expect(ensured.damageLog).toHaveLength(1);
    expect(ensured.damageLogAggregates.totalDamage).toBe(stageDamage);
  });
});

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

  it('supports manually starting fights without logging attacks', () => {
    const state = createInitialState();

    const started = fightReducer(state, { type: 'startFight', timestamp: 1_000 });

    expect(started.fightStartTimestamp).toBe(1_000);
    expect(started.fightManuallyStarted).toBe(true);
    expect(started.fightEndTimestamp).toBeNull();
    expect(started.fightManuallyEnded).toBe(false);

    const ended = fightReducer(started, { type: 'endFight', timestamp: 2_000 });

    expect(ended.fightEndTimestamp).toBe(2_000);
    expect(ended.fightManuallyEnded).toBe(true);
  });
});

describe('fightReducer sequence management', () => {
  const masterSequence = bossSequenceMap.get('pantheon-of-the-master');

  if (!masterSequence) {
    throw new Error('Expected pantheon-of-the-master sequence to be defined for tests');
  }

  if (masterSequence.entries.length < 2) {
    throw new Error('Expected pantheon-of-the-master sequence to have multiple stages');
  }

  const [firstStage, secondStage] = masterSequence.entries;

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
    expect(reset.fightStartTimestamp).toBeNull();
    expect(reset.fightManuallyStarted).toBe(false);
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
    expect(
      Object.keys(reset.sequenceFightStartTimestamps).some((key) =>
        key.startsWith(sequencePrefix),
      ),
    ).toBe(false);
    expect(
      Object.keys(reset.sequenceManualStartFlags).some((key) =>
        key.startsWith(sequencePrefix),
      ),
    ).toBe(false);
  });
});
