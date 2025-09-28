import { useMemo } from 'react';

import {
  bossSequenceMap,
  getSequenceConditionValues,
  resolveSequenceEntries,
  type BossSequence,
  type BossSequenceEntry,
} from '../../data';
import { useFightStateSelector } from './FightStateContext';

type SequenceLabels = {
  sequenceName: string;
  stageLabel: string | null;
  stageNumber: number;
};

export interface SequenceContextValue {
  activeSequenceId: string | null;
  activeSequence: BossSequence | undefined;
  sequenceIndex: number;
  sequenceEntries: BossSequenceEntry[];
  sequenceConditionValues: Record<string, boolean>;
  cappedSequenceIndex: number;
  currentSequenceEntry: BossSequenceEntry | undefined;
  labels: SequenceLabels | null;
  isSequenceActive: boolean;
  hasPreviousSequenceStage: boolean;
  hasNextSequenceStage: boolean;
}

const buildLabels = (
  sequence: BossSequence,
  entries: BossSequenceEntry[],
  sequenceIndex: number,
): SequenceLabels => {
  const stage = entries.at(sequenceIndex) ?? null;

  return {
    sequenceName: sequence.name,
    stageLabel: stage?.target.bossName ?? null,
    stageNumber: sequenceIndex + 1,
  } satisfies SequenceLabels;
};

export const useSequenceContext = (): SequenceContextValue => {
  const activeSequenceId = useFightStateSelector((state) => state.activeSequenceId);
  const sequenceIndex = useFightStateSelector((state) => state.sequenceIndex);
  const sequenceConditions = useFightStateSelector((state) => state.sequenceConditions);

  return useMemo<SequenceContextValue>(() => {
    if (!activeSequenceId) {
      return {
        activeSequenceId,
        activeSequence: undefined,
        sequenceIndex,
        sequenceEntries: [],
        sequenceConditionValues: {},
        cappedSequenceIndex: 0,
        currentSequenceEntry: undefined,
        labels: null,
        isSequenceActive: false,
        hasPreviousSequenceStage: false,
        hasNextSequenceStage: false,
      } satisfies SequenceContextValue;
    }

    const activeSequence = bossSequenceMap.get(activeSequenceId);
    if (!activeSequence) {
      return {
        activeSequenceId,
        activeSequence: undefined,
        sequenceIndex,
        sequenceEntries: [],
        sequenceConditionValues: {},
        cappedSequenceIndex: 0,
        currentSequenceEntry: undefined,
        labels: null,
        isSequenceActive: false,
        hasPreviousSequenceStage: false,
        hasNextSequenceStage: false,
      } satisfies SequenceContextValue;
    }

    const overrides = sequenceConditions[activeSequenceId] ?? undefined;
    const sequenceEntries = resolveSequenceEntries(activeSequence, overrides);
    const sequenceConditionValues = getSequenceConditionValues(activeSequence, overrides);
    const cappedSequenceIndex = sequenceEntries.length
      ? Math.min(Math.max(sequenceIndex, 0), sequenceEntries.length - 1)
      : 0;
    const currentSequenceEntry =
      sequenceEntries.length > 0 ? sequenceEntries[cappedSequenceIndex] : undefined;
    const labels = buildLabels(activeSequence, sequenceEntries, sequenceIndex);

    return {
      activeSequenceId,
      activeSequence,
      sequenceIndex,
      sequenceEntries,
      sequenceConditionValues,
      cappedSequenceIndex,
      currentSequenceEntry,
      labels,
      isSequenceActive: true,
      hasPreviousSequenceStage: cappedSequenceIndex > 0,
      hasNextSequenceStage: cappedSequenceIndex < sequenceEntries.length - 1,
    } satisfies SequenceContextValue;
  }, [activeSequenceId, sequenceConditions, sequenceIndex]);
};
