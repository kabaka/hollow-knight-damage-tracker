import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  sanitizeAttackEvents,
} from './persistence';
import * as persistenceModule from './persistence';
import { FightStateProvider, useFightState } from './FightStateContext';
import type { FightState } from './fightReducer';

const createPersistSpy = () => {
  const states: FightState[] = [];
  const spy = vi
    .spyOn(persistenceModule, 'persistStateToStorage')
    .mockImplementation((state: FightState) => {
      states.push(state);
    });
  const getLastPersistedState = (): FightState | undefined =>
    states.length > 0 ? states[states.length - 1] : undefined;
  return { spy, getLastPersistedState } as const;
};

describe('fight-state persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('converts legacy advanced categories to modern equivalents', () => {
    const events = sanitizeAttackEvents(
      [
        {
          id: 'great-slash',
          label: 'Great Slash',
          damage: 100,
          category: 'advanced',
          timestamp: 1,
        },
        {
          id: 'vengeful-spirit-upgrade',
          label: 'Shade Soul',
          damage: 30,
          category: 'advanced',
          timestamp: 2,
        },
      ],
      [],
    );

    expect(events).toEqual([
      expect.objectContaining({ id: 'great-slash', category: 'nail-art' }),
      expect.objectContaining({ id: 'vengeful-spirit-upgrade', category: 'spell' }),
    ]);
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
            'vengeful-spirit': 'none',
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
        fightEndTimestamp: 'not-a-number',
        fightManuallyEnded: 'nope',
        sequenceFightEndTimestamps: {
          [toSequenceStageKey(sequence.id, 0)]: '42',
          invalid: 'value',
        },
        sequenceManualEndFlags: {
          [toSequenceStageKey(sequence.id, 0)]: 'true',
          invalid: 'maybe',
        },
      } satisfies Record<string, unknown>,
      fallback,
    );

    expect(merged.customTargetHp).toBe(200);
    expect(merged.build.nailUpgradeId).toBe('pure-nail');
    expect(merged.build.activeCharmIds).toEqual(['shaman-stone']);
    expect(merged.build.notchLimit).toBe(MAX_NOTCH_LIMIT);
    expect(merged.build.spellLevels['desolate-dive']).toBe('upgrade');
    expect(merged.build.spellLevels['vengeful-spirit']).toBe('none');
    expect(Object.values(merged.build.spellLevels)).toContain('base');

    expect(merged.damageLog).toHaveLength(1);
    expect(merged.damageLog[0]).toMatchObject({
      id: 'stage-hit',
      label: 'Stage Hit',
      damage: 50,
    });
    expect(merged.redoStack).toHaveLength(1);
    expect(merged.fightEndTimestamp).toBe(42);
    expect(merged.fightManuallyEnded).toBe(true);

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
    expect(merged.sequenceFightEndTimestamps[stageKey]).toBe(42);
    expect(merged.sequenceManualEndFlags[stageKey]).toBe(true);
    expect(
      merged.sequenceConditions['pantheon-of-the-sage']?.['include-grey-prince-zote'],
    ).toBe(true);
    const sageConditions = merged.sequenceConditions['pantheon-of-the-sage'] ?? {};
    expect(Object.prototype.hasOwnProperty.call(sageConditions, 'bogus')).toBe(false);
  });

  it('restores persisted state from localStorage when payloads are valid', () => {
    const fallback = ensureSequenceState(ensureSpellLevels(createInitialState()));

    const persisted = {
      version: 4,
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
        fightEndTimestamp: null,
        fightManuallyEnded: false,
        sequenceFightEndTimestamps: {},
        sequenceManualEndFlags: {},
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
    expect(parsed.version).toBe(4);
    expect(parsed.state).toBeTruthy();
  });

  it('batches persistence writes when updates occur rapidly', () => {
    const { spy: persistSpy, getLastPersistedState } = createPersistSpy();
    vi.useFakeTimers();

    try {
      const { result, unmount } = renderHook(() => useFightState(), {
        wrapper: FightStateProvider,
      });

      act(() => {
        result.current.actions.setCustomTargetHp(1111);
        result.current.actions.setCustomTargetHp(2222);
        result.current.actions.setCustomTargetHp(3333);
      });

      expect(persistSpy).not.toHaveBeenCalled();

      act(() => {
        vi.runAllTimers();
      });

      expect(persistSpy).toHaveBeenCalledTimes(1);
      expect(getLastPersistedState()?.customTargetHp).toBe(3333);

      persistSpy.mockClear();

      act(() => {
        unmount();
      });

      expect(persistSpy).toHaveBeenCalledTimes(1);
      expect(getLastPersistedState()?.customTargetHp).toBe(3333);
    } finally {
      vi.useRealTimers();
      persistSpy.mockRestore();
    }
  });

  it('flushes pending persistence immediately when fights end', () => {
    const { spy: persistSpy, getLastPersistedState } = createPersistSpy();
    vi.useFakeTimers();

    try {
      const { result } = renderHook(() => useFightState(), {
        wrapper: FightStateProvider,
      });

      act(() => {
        result.current.actions.logAttack({
          id: 'nail-hit',
          label: 'Nail Hit',
          damage: 10,
          category: 'nail',
          timestamp: Date.now(),
        });
      });

      expect(persistSpy).not.toHaveBeenCalled();

      act(() => {
        result.current.actions.endFight();
      });

      expect(persistSpy).toHaveBeenCalledTimes(1);
      const lastPersistState = getLastPersistedState();
      expect(lastPersistState).toBeDefined();
      if (lastPersistState) {
        expect(typeof lastPersistState.fightEndTimestamp).toBe('number');
      }

      act(() => {
        vi.runAllTimers();
      });

      expect(persistSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
      persistSpy.mockRestore();
    }
  });

  it('flushes pending persistence when the page is hidden or unloading', () => {
    const { spy: persistSpy } = createPersistSpy();
    vi.useFakeTimers();

    const originalVisibility = Object.getOwnPropertyDescriptor(
      document,
      'visibilityState',
    );

    const setVisibilityState = (value: DocumentVisibilityState) => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => value,
      });
    };

    try {
      const { result } = renderHook(() => useFightState(), {
        wrapper: FightStateProvider,
      });

      act(() => {
        result.current.actions.logAttack({
          id: 'nail-hit',
          label: 'Nail Hit',
          damage: 10,
          category: 'nail',
          timestamp: Date.now(),
        });
      });

      expect(persistSpy).not.toHaveBeenCalled();

      act(() => {
        setVisibilityState('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(persistSpy).toHaveBeenCalledTimes(1);

      persistSpy.mockClear();

      act(() => {
        result.current.actions.setCustomTargetHp(7777);
      });

      expect(persistSpy).not.toHaveBeenCalled();

      act(() => {
        setVisibilityState('visible');
        window.dispatchEvent(new Event('pagehide'));
      });

      expect(persistSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
      persistSpy.mockRestore();
      if (originalVisibility) {
        Object.defineProperty(document, 'visibilityState', originalVisibility);
      } else {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => 'visible',
        });
      }
    }
  });
});
