import { describe, expect, it } from 'vitest';

import { bossSequenceMap, resolveSequenceEntries } from '../../data';
import {
  CUSTOM_BOSS_ID,
  createInitialState,
  fightReducer,
  toSequenceStageKey,
} from './fightReducer';

describe('fightReducer', () => {
  it('logs attacks with generated identifiers and maintains undo/redo stacks', () => {
    const initial = createInitialState();
    const timestamp = 1700000000000;

    const logged = fightReducer(initial, {
      type: 'logAttack',
      id: 'slash',
      label: 'Slash',
      damage: 15,
      category: 'nail',
      timestamp,
    });

    expect(logged.damageLog).toHaveLength(1);
    expect(logged.damageLog[0]).toMatchObject({
      id: `slash-${timestamp}`,
      label: 'Slash',
      damage: 15,
      category: 'nail',
      timestamp,
    });
    expect(logged.redoStack).toHaveLength(0);

    const undone = fightReducer(logged, { type: 'undoLastAttack' });
    expect(undone.damageLog).toHaveLength(0);
    expect(undone.redoStack).toHaveLength(1);
    expect(undone.redoStack[0]?.label).toBe('Slash');

    const redone = fightReducer(undone, { type: 'redoLastAttack' });
    expect(redone.damageLog).toHaveLength(1);
    expect(redone.redoStack).toHaveLength(0);
  });

  it('persists logs per sequence stage when navigating between bosses', () => {
    const sequence = bossSequenceMap.get('pantheon-of-the-master');
    if (!sequence) {
      throw new Error('Missing pantheon fixture for reducer test');
    }

    const firstStage = sequence.entries[0];
    const secondStage = sequence.entries[1];
    if (!firstStage || !secondStage) {
      throw new Error('Sequence must contain at least two stages for reducer test');
    }

    const initial = createInitialState();
    const started = fightReducer(initial, {
      type: 'startSequence',
      sequenceId: sequence.id,
    });

    expect(started.activeSequenceId).toBe(sequence.id);
    expect(started.selectedBossId).toBe(firstStage.target.id);

    const completion = fightReducer(started, {
      type: 'logAttack',
      id: 'finisher',
      label: 'Finisher',
      damage: firstStage.target.hp,
      category: 'nail',
      timestamp: 1700000001000,
    });

    const stageKey = toSequenceStageKey(sequence.id, 0);
    expect(completion.sequenceLogs[stageKey]).toHaveLength(1);

    const advanced = fightReducer(completion, { type: 'advanceSequence' });
    expect(advanced.sequenceIndex).toBe(1);
    expect(advanced.selectedBossId).toBe(secondStage.target.id);
    expect(advanced.damageLog).toHaveLength(0);

    const rewound = fightReducer(advanced, { type: 'rewindSequence' });
    expect(rewound.sequenceIndex).toBe(0);
    expect(rewound.selectedBossId).toBe(firstStage.target.id);
    expect(rewound.damageLog).toHaveLength(1);
    expect(rewound.damageLog[0]?.damage).toBe(firstStage.target.hp);
  });

  it('sets custom boss when updating custom HP and exits active sequences', () => {
    const sequence = bossSequenceMap.get('pantheon-of-the-master');
    if (!sequence) {
      throw new Error('Missing pantheon fixture for reducer test');
    }

    const initial = fightReducer(createInitialState(), {
      type: 'startSequence',
      sequenceId: sequence.id,
    });

    expect(initial.activeSequenceId).toBe(sequence.id);

    const updated = fightReducer(initial, { type: 'setCustomTargetHp', hp: 4321 });
    expect(updated.selectedBossId).toBe(CUSTOM_BOSS_ID);
    expect(updated.activeSequenceId).toBeNull();
    expect(updated.customTargetHp).toBe(4321);
  });

  it('updates resolved stages when toggling conditional sequence fights', () => {
    const sequence = bossSequenceMap.get('pantheon-of-the-sage');
    if (!sequence) {
      throw new Error('Missing sage pantheon fixture for reducer test');
    }

    const condition = sequence.conditions[0];
    if (!condition) {
      throw new Error('Missing conditional stage definition for reducer test');
    }

    const started = fightReducer(createInitialState(), {
      type: 'startSequence',
      sequenceId: sequence.id,
    });

    const defaultEntries = resolveSequenceEntries(
      sequence,
      started.sequenceConditions[sequence.id],
    );
    expect(
      defaultEntries.some((entry) => entry.target.bossName === 'Grey Prince Zote'),
    ).toBe(false);

    const enabled = fightReducer(started, {
      type: 'setSequenceCondition',
      sequenceId: sequence.id,
      conditionId: condition.id,
      enabled: true,
    });

    expect(enabled.sequenceConditions[sequence.id]?.[condition.id]).toBe(true);

    const resolvedEntries = resolveSequenceEntries(
      sequence,
      enabled.sequenceConditions[sequence.id],
    );

    expect(
      resolvedEntries.some((entry) => entry.target.bossName === 'Grey Prince Zote'),
    ).toBe(true);
    expect(resolvedEntries.length).toBeGreaterThan(defaultEntries.length);
    expect(enabled.selectedBossId).toBe(resolvedEntries[0]?.target.id);
  });
});
