import {
  DEFAULT_BOSS_ID,
  DEFAULT_CUSTOM_HP,
  bossMap,
  bossSequenceMap,
  charmMap,
  resolveSequenceEntries,
  nailUpgrades,
  spells,
} from '../../data';
import type { BossSequenceEntry } from '../../data';

export type AttackCategory = 'nail' | 'spell' | 'nail-art' | 'charm';
export type SpellLevel = 'none' | 'base' | 'upgrade';

export interface AttackEvent {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  timestamp: number;
  soulCost?: number;
}

export interface DamageLogAggregates {
  totalDamage: number;
  attacksLogged: number;
  firstAttackTimestamp: number | null;
  lastAttackTimestamp: number | null;
}

const createEmptyAggregates = (): DamageLogAggregates => ({
  totalDamage: 0,
  attacksLogged: 0,
  firstAttackTimestamp: null,
  lastAttackTimestamp: null,
});

const cloneAggregates = (aggregates: DamageLogAggregates): DamageLogAggregates => ({
  totalDamage: aggregates.totalDamage,
  attacksLogged: aggregates.attacksLogged,
  firstAttackTimestamp: aggregates.firstAttackTimestamp,
  lastAttackTimestamp: aggregates.lastAttackTimestamp,
});

export const deriveDamageLogAggregates = (
  damageLog: AttackEvent[],
): DamageLogAggregates => {
  if (damageLog.length === 0) {
    return createEmptyAggregates();
  }

  let totalDamage = 0;
  let firstAttackTimestamp: number | null = null;
  let lastAttackTimestamp: number | null = null;

  for (const event of damageLog) {
    totalDamage += event.damage;

    if (firstAttackTimestamp === null || event.timestamp < firstAttackTimestamp) {
      firstAttackTimestamp = event.timestamp;
    }

    if (lastAttackTimestamp === null || event.timestamp > lastAttackTimestamp) {
      lastAttackTimestamp = event.timestamp;
    }
  }

  return {
    totalDamage,
    attacksLogged: damageLog.length,
    firstAttackTimestamp,
    lastAttackTimestamp,
  };
};

const appendEventAggregates = (
  aggregates: DamageLogAggregates,
  event: AttackEvent,
): DamageLogAggregates => {
  const isFirstEvent = aggregates.attacksLogged === 0;
  const firstAttackTimestamp = isFirstEvent
    ? event.timestamp
    : Math.min(aggregates.firstAttackTimestamp ?? event.timestamp, event.timestamp);
  const lastAttackTimestamp = isFirstEvent
    ? event.timestamp
    : Math.max(aggregates.lastAttackTimestamp ?? event.timestamp, event.timestamp);

  return {
    totalDamage: aggregates.totalDamage + event.damage,
    attacksLogged: aggregates.attacksLogged + 1,
    firstAttackTimestamp,
    lastAttackTimestamp,
  };
};

const removeLastEventAggregates = (
  nextDamageLog: AttackEvent[],
  removedEvent: AttackEvent,
  aggregates: DamageLogAggregates,
): DamageLogAggregates => {
  const nextAttacksLogged = Math.max(0, aggregates.attacksLogged - 1);
  if (nextAttacksLogged === 0) {
    return createEmptyAggregates();
  }

  const firstAttackTimestamp = nextDamageLog[0]?.timestamp ?? null;
  const lastAttackTimestamp = nextDamageLog[nextDamageLog.length - 1]?.timestamp ?? null;

  return {
    totalDamage: aggregates.totalDamage - removedEvent.damage,
    attacksLogged: nextAttacksLogged,
    firstAttackTimestamp,
    lastAttackTimestamp,
  };
};

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
  damageLogAggregates: DamageLogAggregates;
  damageLogVersion: number;
  redoStack: AttackEvent[];
  activeSequenceId: string | null;
  sequenceIndex: number;
  sequenceLogs: Partial<Record<string, AttackEvent[]>>;
  sequenceLogAggregates: Partial<Record<string, DamageLogAggregates>>;
  sequenceRedoStacks: Partial<Record<string, AttackEvent[]>>;
  sequenceConditions: Partial<Record<string, Record<string, boolean>>>;
  fightStartTimestamp: number | null;
  fightManuallyStarted: boolean;
  fightEndTimestamp: number | null;
  fightManuallyEnded: boolean;
  sequenceFightStartTimestamps: Partial<Record<string, number | null>>;
  sequenceManualStartFlags: Partial<Record<string, boolean>>;
  sequenceFightEndTimestamps: Partial<Record<string, number | null>>;
  sequenceManualEndFlags: Partial<Record<string, boolean>>;
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
  | { type: 'resetSequence' }
  | { type: 'startFight'; timestamp: number }
  | { type: 'endFight'; timestamp: number }
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
  damageLogAggregates: createEmptyAggregates(),
  damageLogVersion: 0,
  redoStack: [],
  activeSequenceId: null,
  sequenceIndex: 0,
  sequenceLogs: {},
  sequenceLogAggregates: {},
  sequenceRedoStacks: {},
  sequenceConditions: {},
  fightStartTimestamp: null,
  fightManuallyStarted: false,
  fightEndTimestamp: null,
  fightManuallyEnded: false,
  sequenceFightStartTimestamps: {},
  sequenceManualStartFlags: {},
  sequenceFightEndTimestamps: {},
  sequenceManualEndFlags: {},
});

export const isCustomBoss = (bossId: string) => bossId === CUSTOM_BOSS_ID;

const getTargetHp = (state: FightState) =>
  isCustomBoss(state.selectedBossId)
    ? Math.max(1, Math.round(state.customTargetHp))
    : (bossMap.get(state.selectedBossId)?.hp ?? DEFAULT_CUSTOM_HP);

const withDamageLog = (
  state: FightState,
  damageLog: AttackEvent[],
  aggregates: DamageLogAggregates,
): FightState => ({
  ...state,
  damageLog,
  damageLogAggregates: cloneAggregates(aggregates),
  damageLogVersion: state.damageLogVersion + 1,
});

const resolveFightCompletion = (
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

const filterSequenceRecords = <T>(
  records: Partial<Record<string, T>>,
  sequenceId: string,
) => {
  const prefix = `${sequenceId}#`;
  return Object.fromEntries(
    Object.entries(records).filter(([key]) => !key.startsWith(prefix)),
  ) as Partial<Record<string, T>>;
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
  const fightStartTimestamp = state.sequenceFightStartTimestamps[key] ?? null;
  const fightManuallyStarted = state.sequenceManualStartFlags[key] ?? false;
  const fightEndTimestamp = state.sequenceFightEndTimestamps[key] ?? null;
  const fightManuallyEnded = state.sequenceManualEndFlags[key] ?? false;
  const targetId = entries[clampedIndex].target.id;
  const storedAggregates = state.sequenceLogAggregates[key];
  const aggregates = storedAggregates ?? deriveDamageLogAggregates(damageLog);

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
    selectedBossId: targetId,
    redoStack: [...redoStack],
    fightStartTimestamp,
    fightManuallyStarted,
    fightEndTimestamp,
    fightManuallyEnded,
    sequenceLogAggregates: nextSequenceLogAggregates,
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
