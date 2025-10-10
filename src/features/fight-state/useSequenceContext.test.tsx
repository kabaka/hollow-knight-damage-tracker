import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FC, PropsWithChildren } from 'react';

import { bossSequenceMap } from '../../data';
import { FightStateProvider, useFightActions } from './FightStateContext';
import { useSequenceContext } from './useSequenceContext';

const wrapper: FC<PropsWithChildren> = ({ children }) => (
  <FightStateProvider>{children}</FightStateProvider>
);

describe('useSequenceContext', () => {
  it('exposes the active sequence context and clamps the stage index', () => {
    const masterSequence = bossSequenceMap.get('pantheon-of-the-master');
    if (!masterSequence) {
      throw new Error('Missing pantheon sequence fixture for tests');
    }

    const { result } = renderHook(
      () => ({
        context: useSequenceContext(),
        actions: useFightActions(),
      }),
      { wrapper },
    );

    expect(result.current.context.isSequenceActive).toBe(false);

    act(() => {
      result.current.actions.startSequence(masterSequence.id);
    });

    expect(result.current.context.isSequenceActive).toBe(true);
    expect(result.current.context.activeSequence?.id).toBe(masterSequence.id);
    expect(result.current.context.sequenceEntries).toHaveLength(
      masterSequence.entries.length,
    );
    expect(result.current.context.cappedSequenceIndex).toBe(0);
    expect(result.current.context.currentSequenceEntry?.id).toBe(
      masterSequence.entries[0]?.id,
    );
    const expectedBindingDefaults = masterSequence.bindings.reduce<
      Record<string, boolean>
    >((acc, binding) => {
      acc[binding.id] = binding.defaultEnabled;
      return acc;
    }, {});
    expect(result.current.context.sequenceBindingValues).toEqual(expectedBindingDefaults);
    expect(result.current.context.labels?.sequenceName).toBe(masterSequence.name);
    expect(result.current.context.labels?.stageNumber).toBe(1);
    expect(result.current.context.labels?.stageLabel).toBe(
      masterSequence.entries[0]?.target.bossName,
    );

    act(() => {
      result.current.actions.setSequenceStage(masterSequence.entries.length + 3);
    });

    expect(result.current.context.sequenceIndex).toBe(masterSequence.entries.length - 1);
    expect(result.current.context.cappedSequenceIndex).toBe(
      masterSequence.entries.length - 1,
    );
    expect(result.current.context.currentSequenceEntry?.id).toBe(
      masterSequence.entries.at(-1)?.id,
    );
    expect(result.current.context.labels?.stageLabel).toBe(
      masterSequence.entries.at(-1)?.target.bossName,
    );
    expect(result.current.context.labels?.stageNumber).toBe(
      masterSequence.entries.length,
    );
    expect(result.current.context.hasNextSequenceStage).toBe(false);
    expect(result.current.context.hasPreviousSequenceStage).toBe(true);
  });

  it('resolves optional sequence entries and Pantheon-specific targets', () => {
    const hallownest = bossSequenceMap.get('pantheon-of-hallownest');
    if (!hallownest) {
      throw new Error('Missing pantheon sequence fixture for tests');
    }

    const sistersIndex = hallownest.entries.findIndex(
      (entry) => entry.target.bossName === 'Sisters of Battle',
    );
    if (sistersIndex === -1) {
      throw new Error('Failed to locate Sisters of Battle stage in test data');
    }

    const { result } = renderHook(
      () => ({
        context: useSequenceContext(),
        actions: useFightActions(),
      }),
      { wrapper },
    );

    act(() => {
      result.current.actions.startSequence(hallownest.id);
      result.current.actions.setSequenceStage(sistersIndex);
    });

    expect(result.current.context.sequenceEntries[sistersIndex]?.target.bossName).toBe(
      'Sisters of Battle',
    );
    expect(
      result.current.context.sequenceEntries[sistersIndex]?.target.version.title,
    ).toBe('Pantheon of Hallownest');
    expect(result.current.context.labels?.stageLabel).toBe('Sisters of Battle');
    const initialLength = result.current.context.sequenceEntries.length;
    expect(
      Object.hasOwn(
        result.current.context.sequenceConditionValues,
        'replace-mantis-lords',
      ),
    ).toBe(false);
    expect(result.current.context.sequenceBindingValues['nail-binding']).toBeUndefined();

    act(() => {
      result.current.actions.setSequenceCondition(
        hallownest.id,
        'include-grey-prince-zote',
        true,
      );
    });

    expect(
      result.current.context.sequenceConditionValues['include-grey-prince-zote'],
    ).toBe(true);
    expect(result.current.context.sequenceEntries.length).toBe(initialLength + 1);
    expect(
      result.current.context.sequenceEntries.some(
        (entry) => entry.target.bossName === 'Grey Prince Zote',
      ),
    ).toBe(true);

    act(() => {
      result.current.actions.setSequenceBinding(hallownest.id, 'nail-binding', true);
    });

    expect(result.current.context.sequenceBindingValues['nail-binding']).toBe(true);
  });
});
