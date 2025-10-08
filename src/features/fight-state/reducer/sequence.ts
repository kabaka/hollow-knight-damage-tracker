import { bossSequenceMap, resolveSequenceEntries } from '../../../data';
import { cloneAggregates, deriveDamageLogAggregates } from './aggregates';
import type {
  AttackEvent,
  DamageLogAggregates,
  FightState,
  ResolvedSequenceEntries,
} from './types';

export const toSequenceStageKey = (sequenceId: string, index: number) =>
  `${sequenceId}#${index}`;

export const withDamageLog = (
  state: FightState,
  damageLog: AttackEvent[],
  aggregates: DamageLogAggregates,
): FightState => ({
  ...state,
  damageLog,
  damageLogAggregates: cloneAggregates(aggregates),
  damageLogVersion: state.damageLogVersion + 1,
});

export const persistCurrentSequenceStage = (state: FightState): FightState => {
  if (!state.activeSequenceId) {
    return state;
  }

  const key = toSequenceStageKey(state.activeSequenceId, state.sequenceIndex);
  return {
    ...state,
    sequenceLogs: {
      ...state.sequenceLogs,
      [key]: [...state.damageLog],
    },
    sequenceLogAggregates: {
      ...state.sequenceLogAggregates,
      [key]: cloneAggregates(state.damageLogAggregates),
    },
    sequenceRedoStacks: {
      ...state.sequenceRedoStacks,
      [key]: [...state.redoStack],
    },
    sequenceFightStartTimestamps: {
      ...state.sequenceFightStartTimestamps,
      [key]: state.fightStartTimestamp,
    },
    sequenceManualStartFlags: {
      ...state.sequenceManualStartFlags,
      [key]: state.fightManuallyStarted,
    },
    sequenceFightEndTimestamps: {
      ...state.sequenceFightEndTimestamps,
      [key]: state.fightEndTimestamp,
    },
    sequenceManualEndFlags: {
      ...state.sequenceManualEndFlags,
      [key]: state.fightManuallyEnded,
    },
  };
};

export const filterSequenceRecords = <T>(
  records: Partial<Record<string, T>>,
  sequenceId: string,
) => {
  const prefix = `${sequenceId}#`;
  return Object.fromEntries(
    Object.entries(records).filter(([key]) => !key.startsWith(prefix)),
  ) as Partial<Record<string, T>>;
};

export const getResolvedSequenceEntries = (
  state: FightState,
  sequenceId: string,
): ResolvedSequenceEntries => {
  const sequence = bossSequenceMap.get(sequenceId);
  if (!sequence) {
    return { sequence: undefined, entries: [] };
  }
  const overrides = state.sequenceConditions[sequenceId];
  const entries = resolveSequenceEntries(sequence, overrides);
  return { sequence, entries };
};

export const loadSequenceStage = (
  state: FightState,
  sequenceId: string,
  index: number,
): FightState => {
  const { sequence, entries } = getResolvedSequenceEntries(state, sequenceId);
  if (!sequence || entries.length === 0) {
    return {
      ...state,
      activeSequenceId: null,
      sequenceIndex: 0,
    };
  }

  const clampedIndex = Math.max(0, Math.min(index, entries.length - 1));
  const key = toSequenceStageKey(sequenceId, clampedIndex);
  const storedLog = state.sequenceLogs[key] ?? [];
  const storedRedo = state.sequenceRedoStacks[key] ?? [];
  const storedStartTimestamp = state.sequenceFightStartTimestamps[key] ?? null;
  const storedManualStart = state.sequenceManualStartFlags[key] ?? false;
  const storedEndTimestamp = state.sequenceFightEndTimestamps[key] ?? null;
  const storedManualEnd = state.sequenceManualEndFlags[key] ?? false;
  const storedAggregates = state.sequenceLogAggregates[key];
  const nextTarget = entries[clampedIndex].target;

  const aggregates = storedAggregates ?? deriveDamageLogAggregates(storedLog);
  const baseState = withDamageLog(state, [...storedLog], aggregates);
  const nextSequenceLogAggregates =
    storedAggregates === undefined
      ? {
          ...state.sequenceLogAggregates,
          [key]: cloneAggregates(aggregates),
        }
      : state.sequenceLogAggregates;

  return {
    ...baseState,
    activeSequenceId: sequenceId,
    sequenceIndex: clampedIndex,
    selectedBossId: nextTarget.id,
    redoStack: [...storedRedo],
    fightStartTimestamp: storedStartTimestamp,
    fightManuallyStarted: storedManualStart,
    fightEndTimestamp: storedEndTimestamp,
    fightManuallyEnded: storedManualEnd,
    sequenceLogAggregates: nextSequenceLogAggregates,
  };
};

export const exitSequence = (state: FightState): FightState => {
  if (!state.activeSequenceId) {
    return state;
  }

  const persisted = persistCurrentSequenceStage(state);
  return {
    ...persisted,
    activeSequenceId: null,
    sequenceIndex: 0,
  };
};

export const ensureSequenceState = (state: FightState): FightState => {
  if (!state.activeSequenceId) {
    return state;
  }

  const { sequence, entries } = getResolvedSequenceEntries(state, state.activeSequenceId);
  if (!sequence || entries.length === 0) {
    return {
      ...state,
      activeSequenceId: null,
      sequenceIndex: 0,
    };
  }

  const clampedIndex = Math.max(0, Math.min(state.sequenceIndex, entries.length - 1));
  const key = toSequenceStageKey(state.activeSequenceId, clampedIndex);
  const damageLog = state.sequenceLogs[key] ?? [];
  const redoStack = state.sequenceRedoStacks[key] ?? [];
  const fightStartTimestamp = state.sequenceFightStartTimestamps[key] ?? null;
  const fightManuallyStarted = state.sequenceManualStartFlags[key] ?? false;
  const fightEndTimestamp = state.sequenceFightEndTimestamps[key] ?? null;
  const fightManuallyEnded = state.sequenceManualEndFlags[key] ?? false;
  const storedAggregates = state.sequenceLogAggregates[key];
  const aggregates = storedAggregates ?? deriveDamageLogAggregates(damageLog);
  const nextTargetId = entries[clampedIndex].target.id;

  const baseState = withDamageLog(state, [...damageLog], aggregates);
  const nextSequenceLogAggregates =
    storedAggregates === undefined
      ? {
          ...state.sequenceLogAggregates,
          [key]: cloneAggregates(aggregates),
        }
      : state.sequenceLogAggregates;

  return {
    ...baseState,
    sequenceIndex: clampedIndex,
    selectedBossId: nextTargetId,
    redoStack: [...redoStack],
    fightStartTimestamp,
    fightManuallyStarted,
    fightEndTimestamp,
    fightManuallyEnded,
    sequenceLogAggregates: nextSequenceLogAggregates,
  };
};
