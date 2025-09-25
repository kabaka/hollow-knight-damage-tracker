import type { FC, PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';

import {
  DEFAULT_BOSS_ID,
  DEFAULT_CUSTOM_HP,
  bossMap,
  bossSequenceMap,
  nailUpgrades,
  spells,
  strengthCharmIds,
} from '../../data';

const STORAGE_KEY = 'hollow-knight-damage-tracker:fight-state';
const STORAGE_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const sanitizePositiveInteger = (value: unknown, fallback: number): number => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }
  return Math.max(1, Math.round(numeric));
};

const sanitizeNonNegativeInteger = (value: unknown, fallback: number): number => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }
  return Math.max(0, Math.round(numeric));
};

const sanitizeStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && !seen.has(item)) {
      seen.add(item);
      sanitized.push(item);
    }
  }

  return sanitized;
};

const sanitizeSpellLevels = (
  value: unknown,
  fallback: Record<string, SpellLevel>,
): Record<string, SpellLevel> => {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const sanitized: Record<string, SpellLevel> = { ...fallback };
  for (const [spellId, level] of Object.entries(value)) {
    if (level === 'base' || level === 'upgrade') {
      sanitized[spellId] = level;
    }
  }

  return sanitized;
};

const sanitizeAttackEvents = (value: unknown, fallback: AttackEvent[]): AttackEvent[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const events: AttackEvent[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const id = typeof item.id === 'string' ? item.id : null;
    const label = typeof item.label === 'string' ? item.label : null;
    const damage = toFiniteNumber(item.damage);
    const timestamp = toFiniteNumber(item.timestamp);
    const category = item.category;

    if (!id || !label || damage === null || timestamp === null) {
      continue;
    }

    if (
      category !== 'nail' &&
      category !== 'spell' &&
      category !== 'advanced' &&
      category !== 'charm'
    ) {
      continue;
    }

    const rawSoulCost = item.soulCost;
    const soulCost =
      rawSoulCost === undefined ? undefined : (toFiniteNumber(rawSoulCost) ?? undefined);

    events.push({
      id,
      label,
      damage,
      category,
      timestamp,
      soulCost,
    });
  }

  return events;
};

const sanitizeSequenceEventMap = (
  value: unknown,
  fallback: Record<string, AttackEvent[]>,
): Record<string, AttackEvent[]> => {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const sanitized: Record<string, AttackEvent[]> = {};
  for (const [key, events] of Object.entries(value)) {
    sanitized[key] = sanitizeAttackEvents(events, fallback[key] ?? []);
  }

  return sanitized;
};

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
}

export interface AttackInput {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  soulCost?: number;
  timestamp?: number;
}

export interface DerivedStats {
  targetHp: number;
  totalDamage: number;
  remainingHp: number;
  attacksLogged: number;
  averageDamage: number | null;
  elapsedMs: number | null;
  dps: number | null;
  actionsPerMinute: number | null;
}

interface FightContextValue {
  state: FightState;
  derived: DerivedStats;
  actions: {
    selectBoss: (bossId: string) => void;
    setCustomTargetHp: (hp: number) => void;
    setNailUpgrade: (nailUpgradeId: string) => void;
    setActiveCharms: (charmIds: string[]) => void;
    setSpellLevel: (spellId: string, level: SpellLevel) => void;
    logAttack: (input: AttackInput) => void;
    undoLastAttack: () => void;
    redoLastAttack: () => void;
    resetLog: () => void;
    startSequence: (sequenceId: string) => void;
    stopSequence: () => void;
    setSequenceStage: (index: number) => void;
    advanceSequenceStage: () => void;
    rewindSequenceStage: () => void;
  };
}

export const CUSTOM_BOSS_ID = 'custom';

const toSequenceStageKey = (sequenceId: string, index: number) =>
  `${sequenceId}#${index}`;

const persistCurrentSequenceStage = (state: FightState): FightState => {
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

const loadSequenceStage = (
  state: FightState,
  sequenceId: string,
  index: number,
): FightState => {
  const sequence = bossSequenceMap.get(sequenceId);
  if (!sequence || sequence.entries.length === 0) {
    return {
      ...state,
      activeSequenceId: null,
      sequenceIndex: 0,
    };
  }

  const clampedIndex = Math.max(0, Math.min(index, sequence.entries.length - 1));
  const key = toSequenceStageKey(sequenceId, clampedIndex);
  const storedLog = state.sequenceLogs[key] ?? [];
  const storedRedo = state.sequenceRedoStacks[key] ?? [];
  const nextTarget = sequence.entries[clampedIndex]?.target;

  return {
    ...state,
    activeSequenceId: sequenceId,
    sequenceIndex: clampedIndex,
    selectedBossId: nextTarget?.id ?? state.selectedBossId,
    damageLog: [...storedLog],
    redoStack: [...storedRedo],
  };
};

const exitSequence = (state: FightState): FightState => {
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

const applyLogUpdate = (
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

const initialSpellLevels = (): Record<string, SpellLevel> => {
  const levels: Record<string, SpellLevel> = {};
  for (const spell of spells) {
    levels[spell.id] = 'base';
  }
  return levels;
};

const createInitialState = (): FightState => ({
  selectedBossId: DEFAULT_BOSS_ID,
  customTargetHp: DEFAULT_CUSTOM_HP,
  build: {
    nailUpgradeId: nailUpgrades[0]?.id ?? 'old-nail',
    activeCharmIds: [],
    spellLevels: initialSpellLevels(),
  },
  damageLog: [],
  redoStack: [],
  activeSequenceId: null,
  sequenceIndex: 0,
  sequenceLogs: {},
  sequenceRedoStacks: {},
});

const isCustomBoss = (bossId: string) => bossId === CUSTOM_BOSS_ID;

const fightReducer = (state: FightState, action: FightAction): FightState => {
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
          activeCharmIds: Array.from(new Set(action.charmIds)),
        },
      };
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
      const sequence = bossSequenceMap.get(state.activeSequenceId);
      if (!sequence) {
        return exitSequence(state);
      }
      if (state.sequenceIndex >= sequence.entries.length - 1) {
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

const FightStateContext = createContext<FightContextValue | undefined>(undefined);

type FightAction =
  | { type: 'selectBoss'; bossId: string }
  | { type: 'setCustomTargetHp'; hp: number }
  | { type: 'setNailUpgrade'; nailUpgradeId: string }
  | { type: 'setActiveCharms'; charmIds: string[] }
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
  | { type: 'rewindSequence' };

const calculateDerivedStats = (state: FightState): DerivedStats => {
  const { damageLog, selectedBossId, customTargetHp } = state;
  const targetHp = isCustomBoss(selectedBossId)
    ? Math.max(1, Math.round(customTargetHp))
    : (bossMap.get(selectedBossId)?.hp ?? DEFAULT_CUSTOM_HP);
  const totalDamage = damageLog.reduce((total, event) => total + event.damage, 0);
  const attacksLogged = damageLog.length;
  const remainingHp = Math.max(0, targetHp - totalDamage);
  const averageDamage = attacksLogged === 0 ? null : totalDamage / attacksLogged;
  const elapsedMs =
    attacksLogged < 2
      ? null
      : damageLog[damageLog.length - 1].timestamp - damageLog[0].timestamp;
  const dps = elapsedMs && elapsedMs > 0 ? totalDamage / (elapsedMs / 1000) : null;
  const actionsPerMinute =
    elapsedMs && elapsedMs > 0 ? attacksLogged / (elapsedMs / 60000) : null;

  return {
    targetHp,
    totalDamage,
    remainingHp,
    attacksLogged,
    averageDamage,
    elapsedMs,
    dps,
    actionsPerMinute,
  };
};

const ensureSpellLevels = (state: FightState): FightState => {
  if (Object.keys(state.build.spellLevels).length > 0) {
    return state;
  }

  return {
    ...state,
    build: {
      ...state.build,
      spellLevels: initialSpellLevels(),
    },
  };
};

const ensureSequenceState = (state: FightState): FightState => {
  if (!state.activeSequenceId) {
    return state;
  }

  const sequence = bossSequenceMap.get(state.activeSequenceId);
  if (!sequence || sequence.entries.length === 0) {
    return {
      ...state,
      activeSequenceId: null,
      sequenceIndex: 0,
    };
  }

  const clampedIndex = Math.max(
    0,
    Math.min(state.sequenceIndex, sequence.entries.length - 1),
  );
  const key = toSequenceStageKey(state.activeSequenceId, clampedIndex);
  const damageLog = state.sequenceLogs[key] ?? [];
  const redoStack = state.sequenceRedoStacks[key] ?? [];
  const targetId = sequence.entries[clampedIndex]?.target.id ?? state.selectedBossId;

  return {
    ...state,
    sequenceIndex: clampedIndex,
    selectedBossId: targetId,
    damageLog: [...damageLog],
    redoStack: [...redoStack],
  };
};

const mergePersistedState = (
  persisted: Record<string, unknown>,
  fallback: FightState,
): FightState => {
  const selectedBossId =
    typeof persisted.selectedBossId === 'string'
      ? persisted.selectedBossId
      : fallback.selectedBossId;
  const customTargetHp = sanitizePositiveInteger(
    persisted.customTargetHp,
    fallback.customTargetHp,
  );

  const persistedBuild = isRecord(persisted.build) ? persisted.build : {};
  const nailUpgradeId =
    typeof persistedBuild.nailUpgradeId === 'string'
      ? persistedBuild.nailUpgradeId
      : fallback.build.nailUpgradeId;
  const activeCharmIds = sanitizeStringArray(
    persistedBuild.activeCharmIds,
    fallback.build.activeCharmIds,
  );
  const spellLevels = sanitizeSpellLevels(
    persistedBuild.spellLevels,
    fallback.build.spellLevels,
  );

  const damageLog = sanitizeAttackEvents(persisted.damageLog, fallback.damageLog);
  const redoStack = sanitizeAttackEvents(persisted.redoStack, fallback.redoStack);

  const activeSequenceId =
    typeof persisted.activeSequenceId === 'string' ? persisted.activeSequenceId : null;
  const sequenceIndex = sanitizeNonNegativeInteger(
    persisted.sequenceIndex,
    fallback.sequenceIndex,
  );
  const sequenceLogs = sanitizeSequenceEventMap(
    persisted.sequenceLogs,
    fallback.sequenceLogs,
  );
  const sequenceRedoStacks = sanitizeSequenceEventMap(
    persisted.sequenceRedoStacks,
    fallback.sequenceRedoStacks,
  );

  return ensureSequenceState(
    ensureSpellLevels({
      selectedBossId,
      customTargetHp,
      build: {
        nailUpgradeId,
        activeCharmIds,
        spellLevels,
      },
      damageLog,
      redoStack,
      activeSequenceId,
      sequenceIndex,
      sequenceLogs,
      sequenceRedoStacks,
    }),
  );
};

const restorePersistedState = (fallback: FightState): FightState => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return fallback;
    }

    const parsed = JSON.parse(serialized);
    if (!isRecord(parsed)) {
      return fallback;
    }

    const { version, state } = parsed as {
      version?: unknown;
      state?: unknown;
    };

    if (typeof version !== 'number' || version !== STORAGE_VERSION) {
      return fallback;
    }

    if (!isRecord(state)) {
      return fallback;
    }

    return mergePersistedState(state, fallback);
  } catch {
    return fallback;
  }
};

const persistStateToStorage = (state: FightState) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload = JSON.stringify({ version: STORAGE_VERSION, state });
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Silently ignore storage errors so the tracker keeps functioning.
  }
};

export const FightStateProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(fightReducer, undefined, () =>
    restorePersistedState(ensureSequenceState(ensureSpellLevels(createInitialState()))),
  );
  const sequenceCompletionRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    persistStateToStorage(state);
  }, [state]);

  const derived = useMemo(() => calculateDerivedStats(state), [state]);

  useEffect(() => {
    if (!state.activeSequenceId) {
      sequenceCompletionRef.current.clear();
      return;
    }

    const sequence = bossSequenceMap.get(state.activeSequenceId);
    if (!sequence || sequence.entries.length === 0) {
      return;
    }

    const stageKey = toSequenceStageKey(state.activeSequenceId, state.sequenceIndex);

    if (state.damageLog.length === 0 || derived.remainingHp > 0) {
      sequenceCompletionRef.current.delete(stageKey);
      return;
    }

    if (state.sequenceIndex >= sequence.entries.length - 1) {
      return;
    }

    const lastEvent = state.damageLog[state.damageLog.length - 1];
    if (!lastEvent) {
      return;
    }

    if (sequenceCompletionRef.current.get(stageKey) === lastEvent.timestamp) {
      return;
    }

    sequenceCompletionRef.current.set(stageKey, lastEvent.timestamp);
    dispatch({ type: 'advanceSequence' });
  }, [
    state.activeSequenceId,
    state.sequenceIndex,
    state.damageLog,
    derived.remainingHp,
    dispatch,
  ]);

  const actions = useMemo<FightContextValue['actions']>(
    () => ({
      selectBoss: (bossId) => dispatch({ type: 'selectBoss', bossId }),
      setCustomTargetHp: (hp) => dispatch({ type: 'setCustomTargetHp', hp }),
      setNailUpgrade: (nailUpgradeId) =>
        dispatch({ type: 'setNailUpgrade', nailUpgradeId }),
      setActiveCharms: (charmIds) => dispatch({ type: 'setActiveCharms', charmIds }),
      setSpellLevel: (spellId, level) =>
        dispatch({ type: 'setSpellLevel', spellId, level }),
      logAttack: ({ id, label, damage, category, soulCost, timestamp }) =>
        dispatch({
          type: 'logAttack',
          id,
          label,
          damage,
          category,
          soulCost,
          timestamp: timestamp ?? Date.now(),
        }),
      undoLastAttack: () => dispatch({ type: 'undoLastAttack' }),
      redoLastAttack: () => dispatch({ type: 'redoLastAttack' }),
      resetLog: () => dispatch({ type: 'resetLog' }),
      startSequence: (sequenceId) => dispatch({ type: 'startSequence', sequenceId }),
      stopSequence: () => dispatch({ type: 'stopSequence' }),
      setSequenceStage: (index) => dispatch({ type: 'setSequenceStage', index }),
      advanceSequenceStage: () => dispatch({ type: 'advanceSequence' }),
      rewindSequenceStage: () => dispatch({ type: 'rewindSequence' }),
    }),
    [],
  );

  const value = useMemo<FightContextValue>(
    () => ({ state, derived, actions }),
    [state, derived, actions],
  );

  return (
    <FightStateContext.Provider value={value}>{children}</FightStateContext.Provider>
  );
};

export const useFightState = () => {
  const context = useContext(FightStateContext);
  if (!context) {
    throw new Error('useFightState must be used within a FightStateProvider');
  }
  return context;
};

export const hasStrengthCharm = (charmIds: string[]) =>
  charmIds.some((id) => strengthCharmIds.has(id));
