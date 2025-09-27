import type { FC, PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
} from 'react';

import {
  DEFAULT_CUSTOM_HP,
  bossMap,
  bossSequenceMap,
  resolveSequenceEntries,
  strengthCharmIds,
} from '../../data';
import type { AttackInput, FightState, SpellLevel } from './fightReducer';
import {
  createInitialState,
  ensureSequenceState,
  ensureSpellLevels,
  fightReducer,
  isCustomBoss,
  toSequenceStageKey,
} from './fightReducer';
export type {
  AttackCategory,
  AttackEvent,
  AttackInput,
  BuildState,
  FightState,
  SpellLevel,
} from './fightReducer';
export { CUSTOM_BOSS_ID } from './fightReducer';
import { persistStateToStorage, restorePersistedState } from './persistence';

export interface DerivedStats {
  targetHp: number;
  totalDamage: number;
  remainingHp: number;
  attacksLogged: number;
  averageDamage: number | null;
  elapsedMs: number | null;
  dps: number | null;
  actionsPerMinute: number | null;
  estimatedTimeRemainingMs: number | null;
  fightStartTimestamp: number | null;
  fightEndTimestamp: number | null;
  isFightInProgress: boolean;
  isFightComplete: boolean;
  frameTimestamp: number;
}

interface FightContextValue {
  state: FightState;
  actions: {
    selectBoss: (bossId: string) => void;
    setCustomTargetHp: (hp: number) => void;
    setNailUpgrade: (nailUpgradeId: string) => void;
    setActiveCharms: (charmIds: string[]) => void;
    setCharmNotchLimit: (notchLimit: number) => void;
    setSpellLevel: (spellId: string, level: SpellLevel) => void;
    logAttack: (input: AttackInput) => void;
    undoLastAttack: () => void;
    redoLastAttack: () => void;
    resetLog: () => void;
    endFight: (timestamp?: number) => void;
    startSequence: (sequenceId: string) => void;
    stopSequence: () => void;
    setSequenceStage: (index: number) => void;
    advanceSequenceStage: () => void;
    rewindSequenceStage: () => void;
    setSequenceCondition: (
      sequenceId: string,
      conditionId: string,
      enabled: boolean,
    ) => void;
  };
}

interface DerivedStatsStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => DerivedStats;
}

const FightStateContext = createContext<FightContextValue | undefined>(undefined);
const FightDerivedStatsContext = createContext<DerivedStatsStore | undefined>(undefined);

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type IdleCallbackOptions = { timeout?: number };
type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
type IdleCallback = (deadline: IdleDeadline) => void;

interface IdleCallbackGlobal {
  requestIdleCallback?: (callback: IdleCallback, options?: IdleCallbackOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
}

const scheduleIdleTask = (
  callback: () => void,
  options?: IdleCallbackOptions,
): (() => void) => {
  if (typeof window === 'undefined') {
    callback();
    return () => {};
  }

  const idleWindow = window as Window & IdleCallbackGlobal;

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(() => {
      callback();
    }, options);

    return () => {
      idleWindow.cancelIdleCallback?.(handle);
    };
  }

  const timeoutId = window.setTimeout(callback, options?.timeout ?? 200);
  return () => {
    window.clearTimeout(timeoutId);
  };
};

const calculateDerivedStats = (
  state: FightState,
  frameTimestamp: number,
): DerivedStats => {
  const { damageLog, selectedBossId, customTargetHp, fightEndTimestamp } = state;
  const targetHp = isCustomBoss(selectedBossId)
    ? Math.max(1, Math.round(customTargetHp))
    : (bossMap.get(selectedBossId)?.hp ?? DEFAULT_CUSTOM_HP);
  const totalDamage = damageLog.reduce((total, event) => total + event.damage, 0);
  const attacksLogged = damageLog.length;
  const remainingHp = Math.max(0, targetHp - totalDamage);
  const averageDamage = attacksLogged === 0 ? null : totalDamage / attacksLogged;
  const fightStartTimestamp = damageLog[0]?.timestamp ?? null;
  const effectiveEndTimestamp =
    fightEndTimestamp ?? (fightStartTimestamp != null ? frameTimestamp : null);
  const elapsedMs =
    fightStartTimestamp != null && effectiveEndTimestamp != null
      ? Math.max(0, effectiveEndTimestamp - fightStartTimestamp)
      : null;
  const dps = elapsedMs && elapsedMs > 0 ? totalDamage / (elapsedMs / 1000) : null;
  const actionsPerMinute =
    elapsedMs && elapsedMs > 0 ? attacksLogged / (elapsedMs / 60000) : null;
  const estimatedTimeRemainingMs =
    remainingHp === 0
      ? 0
      : dps && dps > 0
        ? Math.round((remainingHp / dps) * 1000)
        : null;
  const isFightInProgress = fightStartTimestamp != null && fightEndTimestamp == null;
  const isFightComplete = fightStartTimestamp != null && fightEndTimestamp != null;

  return {
    targetHp,
    totalDamage,
    remainingHp,
    attacksLogged,
    averageDamage,
    elapsedMs,
    dps,
    actionsPerMinute,
    estimatedTimeRemainingMs,
    fightStartTimestamp,
    fightEndTimestamp,
    isFightInProgress,
    isFightComplete,
    frameTimestamp,
  };
};

export const FightStateProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(fightReducer, undefined, () =>
    restorePersistedState(ensureSequenceState(ensureSpellLevels(createInitialState()))),
  );
  const sequenceCompletionRef = useRef<Map<string, number>>(new Map());
  const stateRef = useRef(state);
  const frameTimestampRef = useRef<number>(Date.now());
  const derivedRef = useRef<DerivedStats>(
    calculateDerivedStats(state, frameTimestampRef.current),
  );
  const listenersRef = useRef<Set<() => void>>(new Set());
  const derivedStoreRef = useRef<DerivedStatsStore | null>(null);
  const cancelPersistRef = useRef<(() => void) | null>(null);

  const notifyDerived = useCallback(() => {
    derivedRef.current = calculateDerivedStats(
      stateRef.current,
      frameTimestampRef.current,
    );
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const flushPersist = useCallback(() => {
    cancelPersistRef.current?.();
    cancelPersistRef.current = null;
    persistStateToStorage(stateRef.current);
  }, []);

  const schedulePersist = useCallback(() => {
    cancelPersistRef.current?.();
    cancelPersistRef.current = scheduleIdleTask(
      () => {
        cancelPersistRef.current = null;
        persistStateToStorage(stateRef.current);
      },
      { timeout: 500 },
    );
  }, []);

  if (!derivedStoreRef.current) {
    derivedStoreRef.current = {
      getSnapshot: () => derivedRef.current,
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    } satisfies DerivedStatsStore;
  }

  useIsomorphicLayoutEffect(() => {
    stateRef.current = state;
    schedulePersist();
    notifyDerived();
  }, [state, notifyDerived, schedulePersist]);

  const shouldAnimate = state.damageLog.length > 0 && state.fightEndTimestamp == null;

  useEffect(() => {
    if (!shouldAnimate) {
      return;
    }

    let frameId: number;

    const tick = () => {
      frameTimestampRef.current = Date.now();
      notifyDerived();
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [shouldAnimate, notifyDerived]);

  useEffect(() => {
    if (!shouldAnimate && state.fightEndTimestamp != null) {
      frameTimestampRef.current = state.fightEndTimestamp;
      notifyDerived();
    }
  }, [shouldAnimate, state.fightEndTimestamp, notifyDerived]);

  useEffect(() => {
    if (state.fightEndTimestamp != null) {
      flushPersist();
    }
  }, [state.fightEndTimestamp, flushPersist]);

  useIsomorphicLayoutEffect(
    () => () => {
      flushPersist();
    },
    [flushPersist],
  );

  useEffect(() => {
    if (!state.activeSequenceId) {
      sequenceCompletionRef.current.clear();
      return;
    }

    const sequence = bossSequenceMap.get(state.activeSequenceId);
    if (!sequence) {
      return;
    }

    const resolvedEntries = resolveSequenceEntries(
      sequence,
      state.sequenceConditions[state.activeSequenceId] ?? undefined,
    );

    if (resolvedEntries.length === 0) {
      return;
    }

    const stageKey = toSequenceStageKey(state.activeSequenceId, state.sequenceIndex);

    const targetHp = isCustomBoss(state.selectedBossId)
      ? Math.max(1, Math.round(state.customTargetHp))
      : (bossMap.get(state.selectedBossId)?.hp ?? DEFAULT_CUSTOM_HP);
    const totalDamage = state.damageLog.reduce((total, event) => total + event.damage, 0);
    const remainingHp = Math.max(0, targetHp - totalDamage);

    if (state.damageLog.length === 0 || remainingHp > 0) {
      sequenceCompletionRef.current.delete(stageKey);
      return;
    }

    if (state.sequenceIndex >= resolvedEntries.length - 1) {
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
    state.sequenceConditions,
    state.selectedBossId,
    state.customTargetHp,
    dispatch,
  ]);

  const actions = useMemo<FightContextValue['actions']>(
    () => ({
      selectBoss: (bossId) => dispatch({ type: 'selectBoss', bossId }),
      setCustomTargetHp: (hp) => dispatch({ type: 'setCustomTargetHp', hp }),
      setNailUpgrade: (nailUpgradeId) =>
        dispatch({ type: 'setNailUpgrade', nailUpgradeId }),
      setActiveCharms: (charmIds) => dispatch({ type: 'setActiveCharms', charmIds }),
      setCharmNotchLimit: (notchLimit) =>
        dispatch({ type: 'setCharmNotchLimit', notchLimit }),
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
      endFight: (timestamp) =>
        dispatch({ type: 'endFight', timestamp: timestamp ?? Date.now() }),
      startSequence: (sequenceId) => dispatch({ type: 'startSequence', sequenceId }),
      stopSequence: () => dispatch({ type: 'stopSequence' }),
      setSequenceStage: (index) => dispatch({ type: 'setSequenceStage', index }),
      advanceSequenceStage: () => dispatch({ type: 'advanceSequence' }),
      rewindSequenceStage: () => dispatch({ type: 'rewindSequence' }),
      setSequenceCondition: (sequenceId, conditionId, enabled) =>
        dispatch({
          type: 'setSequenceCondition',
          sequenceId,
          conditionId,
          enabled,
        }),
    }),
    [],
  );

  const value = useMemo<FightContextValue>(() => ({ state, actions }), [state, actions]);
  const derivedStore = derivedStoreRef.current;

  if (!derivedStore) {
    throw new Error('FightStateProvider failed to initialize derived stats store');
  }

  return (
    <FightDerivedStatsContext.Provider value={derivedStore}>
      <FightStateContext.Provider value={value}>{children}</FightStateContext.Provider>
    </FightDerivedStatsContext.Provider>
  );
};

export const useFightState = () => {
  const context = useContext(FightStateContext);
  if (!context) {
    throw new Error('useFightState must be used within a FightStateProvider');
  }
  return context;
};

export const useFightDerivedStats = () => {
  const store = useContext(FightDerivedStatsContext);
  if (!store) {
    throw new Error('useFightDerivedStats must be used within a FightStateProvider');
  }
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
};

export const hasStrengthCharm = (charmIds: string[]) =>
  charmIds.some((id) => strengthCharmIds.has(id));
