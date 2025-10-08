import type { AttackEvent, FightAction, FightState } from './reducer/types';
import { CUSTOM_BOSS_ID } from './reducer/types';
import {
  appendEventAggregates,
  createEmptyAggregates,
  removeLastEventAggregates,
} from './reducer/aggregates';
import { applyLogUpdate, resolveFightCompletion } from './reducer/actions';
import { clampCharmSelection, clampNotchLimit } from './reducer/build';
import {
  ensureSequenceState,
  exitSequence,
  filterSequenceRecords,
  getResolvedSequenceEntries,
  loadSequenceStage,
  persistCurrentSequenceStage,
  toSequenceStageKey,
  withDamageLog,
} from './reducer/sequence';

export type {
  AttackCategory,
  AttackEvent,
  AttackInput,
  BuildState,
  DamageLogAggregates,
  FightAction,
  FightState,
  SpellLevel,
} from './reducer/types';
export { CUSTOM_BOSS_ID } from './reducer/types';
export {
  createInitialState,
  ensureSpellLevels,
  initialSpellLevels,
  MAX_NOTCH_LIMIT,
  MAX_OVERCHARM_OVERFLOW,
  MIN_NOTCH_LIMIT,
} from './reducer/build';
export { deriveDamageLogAggregates } from './reducer/aggregates';
export {
  ensureSequenceState,
  exitSequence,
  loadSequenceStage,
  persistCurrentSequenceStage,
  toSequenceStageKey,
} from './reducer/sequence';

export const isCustomBoss = (bossId: string) => bossId === CUSTOM_BOSS_ID;

export const fightReducer = (state: FightState, action: FightAction): FightState => {
  switch (action.type) {
    case 'selectBoss': {
      const baseState = exitSequence(state);
      return {
        ...baseState,
        selectedBossId: action.bossId,
      };
    }
    case 'setCustomTargetHp':
      return {
        ...exitSequence(state),
        selectedBossId: CUSTOM_BOSS_ID,
        customTargetHp: Math.max(1, Math.round(action.hp)),
      };
    case 'setNailUpgrade':
      return {
        ...state,
        build: {
          ...state.build,
          nailUpgradeId: action.nailUpgradeId,
        },
      };
    case 'setActiveCharms':
      return {
        ...state,
        build: {
          ...state.build,
          activeCharmIds: clampCharmSelection(action.charmIds, state.build.notchLimit),
        },
      };
    case 'updateActiveCharms':
      return {
        ...state,
        build: {
          ...state.build,
          activeCharmIds: clampCharmSelection(
            action.updater(state.build.activeCharmIds),
            state.build.notchLimit,
          ),
        },
      };
    case 'setCharmNotchLimit': {
      const nextLimit = clampNotchLimit(action.notchLimit);
      return {
        ...state,
        build: {
          ...state.build,
          notchLimit: nextLimit,
          activeCharmIds: clampCharmSelection(state.build.activeCharmIds, nextLimit),
        },
      };
    }
    case 'setSpellLevel':
      return {
        ...state,
        build: {
          ...state.build,
          spellLevels: {
            ...state.build.spellLevels,
            [action.spellId]: action.level,
          },
        },
      };
    case 'logAttack': {
      const event: AttackEvent = {
        id: `${action.id}-${action.timestamp}`,
        label: action.label,
        damage: action.damage,
        category: action.category,
        timestamp: action.timestamp,
        soulCost: action.soulCost,
      };

      const nextDamageLog = [...state.damageLog, event];
      const nextAggregates = appendEventAggregates(state.damageLogAggregates, event);
      const fightCompletion = resolveFightCompletion(
        state,
        nextDamageLog,
        nextAggregates,
        state.fightEndTimestamp !== null && !state.fightManuallyEnded
          ? { preserveEndTimestamp: true }
          : undefined,
      );

      const nextFightStartTimestamp =
        state.fightStartTimestamp !== null ? state.fightStartTimestamp : event.timestamp;
      const nextFightManuallyStarted =
        state.fightStartTimestamp !== null ? state.fightManuallyStarted : false;

      return applyLogUpdate(state, nextDamageLog, nextAggregates, [], fightCompletion, {
        timestamp: nextFightStartTimestamp,
        manuallyStarted: nextFightManuallyStarted,
      });
    }
    case 'undoLastAttack': {
      if (state.damageLog.length === 0) {
        return state;
      }
      const undoneEvent = state.damageLog[state.damageLog.length - 1];
      const nextDamageLog = state.damageLog.slice(0, -1);
      const nextAggregates =
        nextDamageLog.length === 0
          ? createEmptyAggregates()
          : removeLastEventAggregates(
              nextDamageLog,
              undoneEvent,
              state.damageLogAggregates,
            );
      const nextRedoStack = [undoneEvent, ...state.redoStack];
      const fightCompletion = resolveFightCompletion(
        state,
        nextDamageLog,
        nextAggregates,
      );
      let nextFightStartTimestamp: number | null;
      let nextFightManuallyStarted: boolean;

      if (state.fightManuallyStarted && state.fightStartTimestamp !== null) {
        nextFightStartTimestamp = state.fightStartTimestamp;
        nextFightManuallyStarted = true;
      } else if (nextDamageLog.length > 0) {
        nextFightStartTimestamp = nextDamageLog[0].timestamp;
        nextFightManuallyStarted = false;
      } else {
        nextFightStartTimestamp = null;
        nextFightManuallyStarted = false;
      }

      return applyLogUpdate(
        state,
        nextDamageLog,
        nextAggregates,
        nextRedoStack,
        fightCompletion,
        {
          timestamp: nextFightStartTimestamp,
          manuallyStarted: nextFightManuallyStarted,
        },
      );
    }
    case 'redoLastAttack': {
      if (state.redoStack.length === 0) {
        return state;
      }
      const [nextEvent, ...remaining] = state.redoStack;
      const nextDamageLog = [...state.damageLog, nextEvent];
      const nextAggregates = appendEventAggregates(state.damageLogAggregates, nextEvent);
      const fightCompletion = resolveFightCompletion(
        state,
        nextDamageLog,
        nextAggregates,
        state.fightEndTimestamp !== null && !state.fightManuallyEnded
          ? { preserveEndTimestamp: true }
          : undefined,
      );
      const nextFightStartTimestamp =
        state.fightStartTimestamp !== null
          ? state.fightStartTimestamp
          : nextDamageLog[0].timestamp;
      const nextFightManuallyStarted =
        state.fightStartTimestamp !== null ? state.fightManuallyStarted : false;

      return applyLogUpdate(
        state,
        nextDamageLog,
        nextAggregates,
        remaining,
        fightCompletion,
        {
          timestamp: nextFightStartTimestamp,
          manuallyStarted: nextFightManuallyStarted,
        },
      );
    }
    case 'resetLog':
      return applyLogUpdate(
        state,
        [],
        createEmptyAggregates(),
        [],
        {
          fightEndTimestamp: null,
          fightManuallyEnded: false,
        },
        { timestamp: null, manuallyStarted: false },
      );
    case 'resetSequence': {
      if (!state.activeSequenceId) {
        return applyLogUpdate(
          state,
          [],
          createEmptyAggregates(),
          [],
          {
            fightEndTimestamp: null,
            fightManuallyEnded: false,
          },
          { timestamp: null, manuallyStarted: false },
        );
      }

      const sequenceId = state.activeSequenceId;
      const persisted = persistCurrentSequenceStage(state);
      const clearedBase = withDamageLog(persisted, [], createEmptyAggregates());
      const cleared: FightState = {
        ...clearedBase,
        redoStack: [],
        fightStartTimestamp: null,
        fightManuallyStarted: false,
        fightEndTimestamp: null,
        fightManuallyEnded: false,
        sequenceLogs: filterSequenceRecords(persisted.sequenceLogs, sequenceId),
        sequenceLogAggregates: filterSequenceRecords(
          persisted.sequenceLogAggregates,
          sequenceId,
        ),
        sequenceRedoStacks: filterSequenceRecords(
          persisted.sequenceRedoStacks,
          sequenceId,
        ),
        sequenceFightStartTimestamps: filterSequenceRecords(
          persisted.sequenceFightStartTimestamps,
          sequenceId,
        ),
        sequenceManualStartFlags: filterSequenceRecords(
          persisted.sequenceManualStartFlags,
          sequenceId,
        ),
        sequenceFightEndTimestamps: filterSequenceRecords(
          persisted.sequenceFightEndTimestamps,
          sequenceId,
        ),
        sequenceManualEndFlags: filterSequenceRecords(
          persisted.sequenceManualEndFlags,
          sequenceId,
        ),
      };

      return loadSequenceStage(cleared, sequenceId, 0);
    }
    case 'startFight': {
      if (state.damageLog.length > 0) {
        return state;
      }

      if (state.fightStartTimestamp != null && state.fightEndTimestamp == null) {
        return state;
      }

      const startTimestamp = action.timestamp;
      const baseState: FightState = {
        ...state,
        fightStartTimestamp: startTimestamp,
        fightManuallyStarted: true,
        fightEndTimestamp: null,
        fightManuallyEnded: false,
      };

      if (!state.activeSequenceId) {
        return baseState;
      }

      const key = toSequenceStageKey(state.activeSequenceId, state.sequenceIndex);
      return {
        ...baseState,
        sequenceFightStartTimestamps: {
          ...state.sequenceFightStartTimestamps,
          [key]: startTimestamp,
        },
        sequenceManualStartFlags: {
          ...state.sequenceManualStartFlags,
          [key]: true,
        },
        sequenceFightEndTimestamps: {
          ...state.sequenceFightEndTimestamps,
          [key]: null,
        },
        sequenceManualEndFlags: {
          ...state.sequenceManualEndFlags,
          [key]: false,
        },
      };
    }
    case 'endFight': {
      if (state.damageLog.length === 0 && !state.fightManuallyStarted) {
        return state;
      }

      if (state.fightEndTimestamp !== null && !state.fightManuallyEnded) {
        return state;
      }

      const lastEvent =
        state.damageLog.length > 0 ? state.damageLog[state.damageLog.length - 1] : null;
      const fallbackTimestamp = lastEvent?.timestamp ?? action.timestamp;
      const endTimestamp = Math.max(action.timestamp, fallbackTimestamp);

      const baseState: FightState = {
        ...state,
        fightEndTimestamp: endTimestamp,
        fightManuallyEnded: true,
      };

      if (!state.activeSequenceId) {
        return baseState;
      }

      const key = toSequenceStageKey(state.activeSequenceId, state.sequenceIndex);
      return {
        ...baseState,
        sequenceFightEndTimestamps: {
          ...state.sequenceFightEndTimestamps,
          [key]: endTimestamp,
        },
        sequenceManualEndFlags: {
          ...state.sequenceManualEndFlags,
          [key]: true,
        },
      };
    }
    case 'startSequence': {
      const persisted = persistCurrentSequenceStage(state);
      return loadSequenceStage(persisted, action.sequenceId, 0);
    }
    case 'stopSequence':
      return exitSequence(state);
    case 'setSequenceCondition': {
      const { sequence } = getResolvedSequenceEntries(state, action.sequenceId);
      if (!sequence) {
        return state;
      }

      const existing = state.sequenceConditions[action.sequenceId] ?? {};
      const nextConditions = {
        ...state.sequenceConditions,
        [action.sequenceId]: {
          ...existing,
          [action.conditionId]: action.enabled,
        },
      };

      const nextState: FightState = {
        ...state,
        sequenceConditions: nextConditions,
      };

      if (state.activeSequenceId !== action.sequenceId) {
        return nextState;
      }

      const clearedLogsStateBase = withDamageLog(nextState, [], createEmptyAggregates());
      const clearedLogsState: FightState = {
        ...clearedLogsStateBase,
        redoStack: [],
        fightStartTimestamp: null,
        fightManuallyStarted: false,
        fightEndTimestamp: null,
        fightManuallyEnded: false,
        sequenceLogs: filterSequenceRecords(nextState.sequenceLogs, action.sequenceId),
        sequenceLogAggregates: filterSequenceRecords(
          nextState.sequenceLogAggregates,
          action.sequenceId,
        ),
        sequenceRedoStacks: filterSequenceRecords(
          nextState.sequenceRedoStacks,
          action.sequenceId,
        ),
        sequenceFightStartTimestamps: filterSequenceRecords(
          nextState.sequenceFightStartTimestamps,
          action.sequenceId,
        ),
        sequenceManualStartFlags: filterSequenceRecords(
          nextState.sequenceManualStartFlags,
          action.sequenceId,
        ),
        sequenceFightEndTimestamps: filterSequenceRecords(
          nextState.sequenceFightEndTimestamps,
          action.sequenceId,
        ),
        sequenceManualEndFlags: filterSequenceRecords(
          nextState.sequenceManualEndFlags,
          action.sequenceId,
        ),
      };

      return ensureSequenceState(clearedLogsState);
    }
    case 'setSequenceStage':
      return state.activeSequenceId
        ? loadSequenceStage(
            persistCurrentSequenceStage(state),
            state.activeSequenceId,
            action.index,
          )
        : state;
    case 'advanceSequence': {
      if (!state.activeSequenceId) {
        return state;
      }
      const { sequence, entries } = getResolvedSequenceEntries(
        state,
        state.activeSequenceId,
      );
      if (!sequence || entries.length === 0) {
        return exitSequence(state);
      }
      if (state.sequenceIndex >= entries.length - 1) {
        return persistCurrentSequenceStage(state);
      }
      return loadSequenceStage(
        persistCurrentSequenceStage(state),
        state.activeSequenceId,
        state.sequenceIndex + 1,
      );
    }
    case 'rewindSequence':
      return state.activeSequenceId
        ? loadSequenceStage(
            persistCurrentSequenceStage(state),
            state.activeSequenceId,
            state.sequenceIndex - 1,
          )
        : state;
    default:
      return state;
  }
};
