import {
  DEFAULT_BOSS_ID,
  DEFAULT_CUSTOM_HP,
  bossSequenceMap,
  charmMap,
  resolveSequenceEntries,
  nailUpgrades,
  spells,
} from '../../data';
import type { BossSequenceEntry } from '../../data';

export type AttackCategory = 'nail' | 'spell' | 'advanced' | 'charm';
export type SpellLevel = 'base' | 'upgrade';

export interface AttackEvent {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  timestamp: number;
  soulCost?: number;
}

export interface BuildState {
  nailUpgradeId: string;
  activeCharmIds: string[];
  spellLevels: Record<string, SpellLevel>;
  notchLimit: number;
}

export interface FightState {
  selectedBossId: string;
  customTargetHp: number;
  build: BuildState;
  damageLog: AttackEvent[];
  redoStack: AttackEvent[];
  activeSequenceId: string | null;
  sequenceIndex: number;
  sequenceLogs: Record<string, AttackEvent[]>;
  sequenceRedoStacks: Record<string, AttackEvent[]>;
  sequenceConditions: Record<string, Record<string, boolean>>;
}

export interface AttackInput {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  soulCost?: number;
  timestamp?: number;
}

export const CUSTOM_BOSS_ID = 'custom';

export type FightAction =
  | { type: 'selectBoss'; bossId: string }
  | { type: 'setCustomTargetHp'; hp: number }
  | { type: 'setNailUpgrade'; nailUpgradeId: string }
  | { type: 'setActiveCharms'; charmIds: string[] }
  | { type: 'setCharmNotchLimit'; notchLimit: number }
  | { type: 'setSpellLevel'; spellId: string; level: SpellLevel }
  | {
      type: 'logAttack';
      timestamp: number;
      label: string;
      id: string;
      damage: number;
      category: AttackCategory;
      soulCost?: number;
    }
  | { type: 'undoLastAttack' }
  | { type: 'redoLastAttack' }
  | { type: 'resetLog' }
  | { type: 'startSequence'; sequenceId: string }
  | { type: 'stopSequence' }
  | { type: 'setSequenceStage'; index: number }
  | { type: 'advanceSequence' }
  | { type: 'rewindSequence' }
  | {
      type: 'setSequenceCondition';
      sequenceId: string;
      conditionId: string;
      enabled: boolean;
    };

export const toSequenceStageKey = (sequenceId: string, index: number) =>
  `${sequenceId}#${index}`;

export const initialSpellLevels = (): Record<string, SpellLevel> => {
  const levels: Record<string, SpellLevel> = {};
  for (const spell of spells) {
    levels[spell.id] = 'base';
  }
  return levels;
};

export const MIN_NOTCH_LIMIT = 3;
export const MAX_NOTCH_LIMIT = 11;
export const MAX_OVERCHARM_OVERFLOW = 5;

const clampNotchLimit = (value: number) =>
  Math.min(MAX_NOTCH_LIMIT, Math.max(MIN_NOTCH_LIMIT, Math.round(value)));

const getCharmCost = (charmId: string) => charmMap.get(charmId)?.cost ?? 0;

const clampCharmSelection = (charmIds: string[], notchLimit: number) => {
  if (notchLimit <= 0) {
    return [];
  }

  const uniqueOrdered = charmIds.filter((id, index) => charmIds.indexOf(id) === index);
  const selected: string[] = [];
  let totalCost = 0;
  let hasOverflow = false;

  for (const id of uniqueOrdered) {
    const cost = getCharmCost(id);
    const nextCost = totalCost + cost;
    if (nextCost > notchLimit) {
      if (hasOverflow || nextCost > notchLimit + MAX_OVERCHARM_OVERFLOW) {
        continue;
      }
      hasOverflow = true;
    }

    selected.push(id);
    totalCost = nextCost;
  }

  return selected;
};

export const createInitialState = (): FightState => ({
  selectedBossId: DEFAULT_BOSS_ID,
  customTargetHp: DEFAULT_CUSTOM_HP,
  build: {
    nailUpgradeId: nailUpgrades[0]?.id ?? 'old-nail',
    activeCharmIds: [],
    spellLevels: initialSpellLevels(),
    notchLimit: MAX_NOTCH_LIMIT,
  },
  damageLog: [],
  redoStack: [],
  activeSequenceId: null,
  sequenceIndex: 0,
  sequenceLogs: {},
  sequenceRedoStacks: {},
  sequenceConditions: {},
});

export const isCustomBoss = (bossId: string) => bossId === CUSTOM_BOSS_ID;

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
    sequenceRedoStacks: {
      ...state.sequenceRedoStacks,
      [key]: [...state.redoStack],
    },
  };
};

const filterSequenceRecords = (
  records: Record<string, AttackEvent[]>,
  sequenceId: string,
) => {
  const prefix = `${sequenceId}#`;
  return Object.fromEntries(
    Object.entries(records).filter(([key]) => !key.startsWith(prefix)),
  );
};

const getResolvedSequenceEntries = (
  state: FightState,
  sequenceId: string,
): { sequence: ReturnType<typeof bossSequenceMap.get>; entries: BossSequenceEntry[] } => {
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
  const nextTarget = entries[clampedIndex]?.target;

  return {
    ...state,
    activeSequenceId: sequenceId,
    sequenceIndex: clampedIndex,
    selectedBossId: nextTarget?.id ?? state.selectedBossId,
    damageLog: [...storedLog],
    redoStack: [...storedRedo],
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

export const applyLogUpdate = (
  state: FightState,
  damageLog: AttackEvent[],
  redoStack: AttackEvent[],
): FightState => {
  if (!state.activeSequenceId) {
    return {
      ...state,
      damageLog,
      redoStack,
    };
  }

  const key = toSequenceStageKey(state.activeSequenceId, state.sequenceIndex);
  return {
    ...state,
    damageLog,
    redoStack,
    sequenceLogs: {
      ...state.sequenceLogs,
      [key]: damageLog,
    },
    sequenceRedoStacks: {
      ...state.sequenceRedoStacks,
      [key]: redoStack,
    },
  };
};

const ensureNotchLimit = (state: FightState): FightState => {
  const desiredLimit =
    typeof state.build.notchLimit === 'number'
      ? clampNotchLimit(state.build.notchLimit)
      : MAX_NOTCH_LIMIT;

  const clampedCharms = clampCharmSelection(state.build.activeCharmIds, desiredLimit);
  const hasSameLimit = state.build.notchLimit === desiredLimit;
  const hasSameCharms =
    clampedCharms.length === state.build.activeCharmIds.length &&
    clampedCharms.every((id, index) => state.build.activeCharmIds[index] === id);

  if (hasSameLimit && hasSameCharms) {
    return state;
  }

  return {
    ...state,
    build: {
      ...state.build,
      notchLimit: desiredLimit,
      activeCharmIds: clampedCharms,
    },
  };
};

export const ensureSpellLevels = (state: FightState): FightState => {
  if (Object.keys(state.build.spellLevels).length === 0) {
    return ensureNotchLimit({
      ...state,
      build: {
        ...state.build,
        spellLevels: initialSpellLevels(),
      },
    });
  }

  return ensureNotchLimit(state);
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
  const targetId = entries[clampedIndex]?.target.id ?? state.selectedBossId;

  return {
    ...state,
    sequenceIndex: clampedIndex,
    selectedBossId: targetId,
    damageLog: [...damageLog],
    redoStack: [...redoStack],
  };
};

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

      return applyLogUpdate(state, [...state.damageLog, event], []);
    }
    case 'undoLastAttack': {
      if (state.damageLog.length === 0) {
        return state;
      }
      const undoneEvent = state.damageLog[state.damageLog.length - 1];
      return applyLogUpdate(state, state.damageLog.slice(0, -1), [
        undoneEvent,
        ...state.redoStack,
      ]);
    }
    case 'redoLastAttack': {
      if (state.redoStack.length === 0) {
        return state;
      }
      const [nextEvent, ...remaining] = state.redoStack;
      return applyLogUpdate(state, [...state.damageLog, nextEvent], remaining);
    }
    case 'resetLog':
      return applyLogUpdate(state, [], []);
    case 'startSequence': {
      const persisted = persistCurrentSequenceStage(state);
      return loadSequenceStage(persisted, action.sequenceId, 0);
    }
    case 'stopSequence':
      return exitSequence(state);
    case 'setSequenceCondition': {
      const sequence = bossSequenceMap.get(action.sequenceId);
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

      const clearedLogsState: FightState = {
        ...nextState,
        damageLog: [],
        redoStack: [],
        sequenceLogs: filterSequenceRecords(nextState.sequenceLogs, action.sequenceId),
        sequenceRedoStacks: filterSequenceRecords(
          nextState.sequenceRedoStacks,
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
