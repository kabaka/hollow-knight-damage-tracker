import { DEFAULT_CUSTOM_HP, bossMap } from '../../../data';
import { cloneAggregates } from './aggregates';
import type { AttackEvent, DamageLogAggregates, FightState } from './types';
import { CUSTOM_BOSS_ID } from './types';
import { toSequenceStageKey, withDamageLog } from './sequence';

const getTargetHp = (state: FightState) => {
  if (state.selectedBossId === CUSTOM_BOSS_ID) {
    return Math.max(1, Math.round(state.customTargetHp));
  }
  return bossMap.get(state.selectedBossId)?.hp ?? DEFAULT_CUSTOM_HP;
};

export const resolveFightCompletion = (
  state: FightState,
  damageLog: AttackEvent[],
  aggregates: DamageLogAggregates,
  options?: {
    preserveEndTimestamp?: boolean;
  },
) => {
  const preserveEndTimestamp = options?.preserveEndTimestamp ?? false;
  const totalDamage = aggregates.totalDamage;
  const targetHp = getTargetHp(state);

  if (preserveEndTimestamp && state.fightEndTimestamp !== null) {
    return {
      fightEndTimestamp: state.fightEndTimestamp,
      fightManuallyEnded: state.fightManuallyEnded,
    };
  }

  if (state.fightManuallyEnded) {
    return {
      fightEndTimestamp: null,
      fightManuallyEnded: false,
    };
  }

  if (damageLog.length === 0) {
    return {
      fightEndTimestamp: null,
      fightManuallyEnded: false,
    };
  }

  if (totalDamage >= targetHp) {
    const lastEvent = damageLog[damageLog.length - 1];
    return {
      fightEndTimestamp: lastEvent.timestamp,
      fightManuallyEnded: false,
    };
  }

  return {
    fightEndTimestamp: null,
    fightManuallyEnded: false,
  };
};

export const applyLogUpdate = (
  state: FightState,
  damageLog: AttackEvent[],
  aggregates: DamageLogAggregates,
  redoStack: AttackEvent[],
  fightCompletion: { fightEndTimestamp: number | null; fightManuallyEnded: boolean },
  fightStart: { timestamp: number | null; manuallyStarted: boolean },
): FightState => {
  const baseState = withDamageLog(state, damageLog, aggregates);

  if (!state.activeSequenceId) {
    return {
      ...baseState,
      redoStack,
      fightEndTimestamp: fightCompletion.fightEndTimestamp,
      fightManuallyEnded: fightCompletion.fightManuallyEnded,
      fightStartTimestamp: fightStart.timestamp,
      fightManuallyStarted: fightStart.manuallyStarted,
    };
  }

  const key = toSequenceStageKey(state.activeSequenceId, state.sequenceIndex);
  return {
    ...baseState,
    redoStack,
    fightEndTimestamp: fightCompletion.fightEndTimestamp,
    fightManuallyEnded: fightCompletion.fightManuallyEnded,
    fightStartTimestamp: fightStart.timestamp,
    fightManuallyStarted: fightStart.manuallyStarted,
    sequenceLogs: {
      ...state.sequenceLogs,
      [key]: damageLog,
    },
    sequenceLogAggregates: {
      ...state.sequenceLogAggregates,
      [key]: cloneAggregates(aggregates),
    },
    sequenceRedoStacks: {
      ...state.sequenceRedoStacks,
      [key]: redoStack,
    },
    sequenceFightStartTimestamps: {
      ...state.sequenceFightStartTimestamps,
      [key]: fightStart.timestamp,
    },
    sequenceManualStartFlags: {
      ...state.sequenceManualStartFlags,
      [key]: fightStart.manuallyStarted,
    },
    sequenceFightEndTimestamps: {
      ...state.sequenceFightEndTimestamps,
      [key]: fightCompletion.fightEndTimestamp,
    },
    sequenceManualEndFlags: {
      ...state.sequenceManualEndFlags,
      [key]: fightCompletion.fightManuallyEnded,
    },
  };
};
