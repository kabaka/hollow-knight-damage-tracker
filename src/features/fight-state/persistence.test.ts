import { beforeEach, describe, expect, it } from 'vitest';

import { bossSequenceMap } from '../../data';
import {
  CUSTOM_BOSS_ID,
  MAX_NOTCH_LIMIT,
  createInitialState,
  ensureSequenceState,
  ensureSpellLevels,
  toSequenceStageKey,
} from './fightReducer';
import {
  STORAGE_KEY,
  mergePersistedState,
  persistStateToStorage,
  restorePersistedState,
} from './persistence';

describe('fight-state persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('sanitizes persisted payloads before merging them into state', () => {
    const fallback = ensureSequenceState(ensureSpellLevels(createInitialState()));
    const sequence = bossSequenceMap.get('pantheon-of-the-master');
    if (!sequence) {
      throw new Error('Missing pantheon fixture for persistence test');
    }

    const merged = mergePersistedState(
      {
        selectedBossId: 1234,
        customTargetHp: '200.2',
        build: {
          nailUpgradeId: 'pure-nail',
          activeCharmIds: ['shaman-stone', 'shaman-stone', 17],
          spellLevels: {
            'desolate-dive': 'upgrade',
            invalid: 'nope',
          },
          notchLimit: 50,
        },
        damageLog: [
          {
            id: 'spell-entry',
            label: 'Spell Entry',
            damage: '30',
            category: 'spell',
            timestamp: '10',
            soulCost: '33',
          },
          { id: 42 },
        ],
        redoStack: [
          {
            id: 'redo-entry',
            label: 'Redo Entry',
            damage: '20',
            category: 'advanced',
            timestamp: '11',
          },
        ],
        activeSequenceId: sequence.id,
        sequenceIndex: -5,
        sequenceLogs: {
          [toSequenceStageKey(sequence.id, 0)]: [
            {
              id: 'stage-hit',
              label: 'Stage Hit',
              damage: '50',
              category: 'nail',
              timestamp: '12',
            },
          ],
        },
        sequenceRedoStacks: {
          [toSequenceStageKey(sequence.id, 0)]: [
            {
              id: 'stage-redo',
              label: 'Stage Redo',
              damage: '15',
              category: 'nail',
              timestamp: '13',
            },
          ],
        },
        sequenceConditions: {
          'pantheon-of-the-sage': {
            'include-grey-prince-zote': 'true',
            bogus: 'maybe',
          },
          broken: 'nope',
        },
      } satisfies Record<string, unknown>,
      fallback,
    );

    expect(merged.customTargetHp).toBe(200);
    expect(merged.build.nailUpgradeId).toBe('pure-nail');
    expect(merged.build.activeCharmIds).toEqual(['shaman-stone']);
    expect(merged.build.notchLimit).toBe(MAX_NOTCH_LIMIT);
    expect(merged.build.spellLevels['desolate-dive']).toBe('upgrade');
    expect(Object.values(merged.build.spellLevels)).toContain('base');

    expect(merged.damageLog).toHaveLength(1);
    expect(merged.damageLog[0]).toMatchObject({
      id: 'stage-hit',
      label: 'Stage Hit',
      damage: 50,
    });
    expect(merged.redoStack).toHaveLength(1);

    expect(merged.activeSequenceId).toBe(sequence.id);
    expect(merged.sequenceIndex).toBe(0);

    const stageKey = toSequenceStageKey(sequence.id, 0);
    expect(merged.sequenceLogs[stageKey]).toHaveLength(1);
    expect(merged.sequenceLogs[stageKey][0]).toMatchObject({
      id: 'stage-hit',
      damage: 50,
      category: 'nail',
    });
    expect(merged.sequenceRedoStacks[stageKey]).toHaveLength(1);
    expect(
      merged.sequenceConditions['pantheon-of-the-sage']?.['include-grey-prince-zote'],
    ).toBe(true);
    const sageConditions = merged.sequenceConditions['pantheon-of-the-sage'] ?? {};
    expect(Object.prototype.hasOwnProperty.call(sageConditions, 'bogus')).toBe(false);
  });

  it('restores persisted state from localStorage when payloads are valid', () => {
    const fallback = ensureSequenceState(ensureSpellLevels(createInitialState()));

    const persisted = {
      version: 2,
      state: {
        selectedBossId: CUSTOM_BOSS_ID,
        customTargetHp: 4242,
        build: {
          nailUpgradeId: 'coiled-nail',
          activeCharmIds: ['shaman-stone'],
          spellLevels: { 'howling-wraiths': 'upgrade' },
          notchLimit: 4,
        },
        damageLog: [],
        redoStack: [],
        activeSequenceId: null,
        sequenceIndex: 0,
        sequenceLogs: {},
        sequenceRedoStacks: {},
        sequenceConditions: {},
      },
    } satisfies Record<string, unknown>;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));

    const restored = restorePersistedState(fallback);
    expect(restored.selectedBossId).toBe(CUSTOM_BOSS_ID);
    expect(restored.customTargetHp).toBe(4242);
    expect(restored.build.nailUpgradeId).toBe('coiled-nail');
    expect(restored.build.spellLevels['howling-wraiths']).toBe('upgrade');
    expect(restored.build.notchLimit).toBe(4);
  });

  it('ignores malformed or incompatible persisted payloads', () => {
    const fallback = ensureSequenceState(ensureSpellLevels(createInitialState()));

    expect(restorePersistedState(fallback)).toEqual(fallback);

    window.localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(restorePersistedState(fallback)).toEqual(fallback);

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, state: { selectedBossId: 'broken' } }),
    );
    expect(restorePersistedState(fallback)).toEqual(fallback);
  });

  it('persists serialized state payloads to localStorage', () => {
    const state = ensureSequenceState(ensureSpellLevels(createInitialState()));

    persistStateToStorage(state);

    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    if (!stored) {
      throw new Error('Expected persisted payload');
    }

    const parsed = JSON.parse(stored) as { version: number; state: unknown };
    expect(parsed.version).toBe(2);
    expect(parsed.state).toBeTruthy();
  });
});
