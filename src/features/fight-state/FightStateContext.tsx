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

export type DerivedStats = {
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
};

type FightActions = {
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
  resetSequence: () => void;
  startFight: (timestamp?: number) => void;
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

interface DerivedStatsStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => DerivedStats;
}

interface FightStateStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => FightState;
}

const FightStateStoreContext = createContext<FightStateStore | undefined>(undefined);
const FightActionsContext = createContext<FightActions | undefined>(undefined);
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
      if (typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(handle);
      }
    };
  }

  const timeoutId = window.setTimeout(callback, options?.timeout ?? 200);
  return () => {
    window.clearTimeout(timeoutId);
  };
};

const assertStore = <T,>(value: T | null, message: string): T => {
  if (value === null) {
    throw new Error(message);
  }
  return value;
};

const calculateDerivedStats = (
  state: FightState,
  frameTimestamp: number,
): DerivedStats => {
  const {
    damageLog,
    selectedBossId,
    customTargetHp,
    fightEndTimestamp,
    fightStartTimestamp: storedFightStartTimestamp,
  } = state;
  const targetHp = isCustomBoss(selectedBossId)
    ? Math.max(1, Math.round(customTargetHp))
    : (bossMap.get(selectedBossId)?.hp ?? DEFAULT_CUSTOM_HP);
  const totalDamage = damageLog.reduce((total, event) => total + event.damage, 0);
  const attacksLogged = damageLog.length;
  const remainingHp = Math.max(0, targetHp - totalDamage);
  const averageDamage = attacksLogged === 0 ? null : totalDamage / attacksLogged;
  let fightStartTimestamp = storedFightStartTimestamp;
  if (fightStartTimestamp === null) {
    fightStartTimestamp = damageLog[0]?.timestamp ?? null;
  }

  const hasFightStartTimestamp = typeof fightStartTimestamp === 'number';

  let effectiveEndTimestamp = fightEndTimestamp;
  if (effectiveEndTimestamp === null && hasFightStartTimestamp) {
    effectiveEndTimestamp = frameTimestamp;
  }

  const elapsedMs =
    hasFightStartTimestamp && effectiveEndTimestamp !== null
      ? Math.max(0, effectiveEndTimestamp - fightStartTimestamp)
      : null;

  let dps: number | null = null;
  let actionsPerMinute: number | null = null;
  if (elapsedMs !== null && elapsedMs > 0) {
    dps = totalDamage / (elapsedMs / 1000);
    actionsPerMinute = attacksLogged / (elapsedMs / 60000);
  }

  let estimatedTimeRemainingMs: number | null;
  if (remainingHp === 0) {
    estimatedTimeRemainingMs = 0;
  } else if (dps !== null && dps > 0) {
    estimatedTimeRemainingMs = Math.round((remainingHp / dps) * 1000);
  } else {
    estimatedTimeRemainingMs = null;
  }

  const fightHasEnded = fightEndTimestamp !== null;
  const isFightInProgress = hasFightStartTimestamp && !fightHasEnded;
  const isFightComplete = hasFightStartTimestamp && fightHasEnded;

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
  const stateListenersRef = useRef<Set<() => void>>(new Set());
  const derivedListenersRef = useRef<Set<() => void>>(new Set());
  const derivedStoreRef = useRef<DerivedStatsStore | null>(null);
  const stateStoreRef = useRef<FightStateStore | null>(null);
  const cancelPersistRef = useRef<(() => void) | null>(null);

  const notifyState = useCallback(() => {
    stateListenersRef.current.forEach((listener) => listener());
  }, []);

  const notifyDerived = useCallback(() => {
    derivedRef.current = calculateDerivedStats(
      stateRef.current,
      frameTimestampRef.current,
    );
    derivedListenersRef.current.forEach((listener) => listener());
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

  if (!stateStoreRef.current) {
    stateStoreRef.current = {
      getSnapshot: () => stateRef.current,
      subscribe: (listener) => {
        stateListenersRef.current.add(listener);
        return () => {
          stateListenersRef.current.delete(listener);
        };
      },
    } satisfies FightStateStore;
  }

  if (!derivedStoreRef.current) {
    derivedStoreRef.current = {
      getSnapshot: () => derivedRef.current,
      subscribe: (listener) => {
        derivedListenersRef.current.add(listener);
        return () => {
          derivedListenersRef.current.delete(listener);
        };
      },
    } satisfies DerivedStatsStore;
  }

  useIsomorphicLayoutEffect(() => {
    stateRef.current = state;
    notifyState();
    schedulePersist();
    notifyDerived();
  }, [state, notifyDerived, notifyState, schedulePersist]);

  const shouldAnimate =
    state.fightStartTimestamp !== null && state.fightEndTimestamp === null;

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
    if (!shouldAnimate && state.fightEndTimestamp !== null) {
      frameTimestampRef.current = state.fightEndTimestamp;
      notifyDerived();
    }
  }, [shouldAnimate, state.fightEndTimestamp, notifyDerived]);

  useEffect(() => {
    if (state.fightEndTimestamp !== null) {
      flushPersist();
    }
  }, [state.fightEndTimestamp, flushPersist]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushPersist();
      }
    };

    const handlePageHide = () => {
      flushPersist();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [flushPersist]);

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

  const actions = useMemo<FightActions>(
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
      resetSequence: () => dispatch({ type: 'resetSequence' }),
      startFight: (timestamp) =>
        dispatch({ type: 'startFight', timestamp: timestamp ?? Date.now() }),
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
  const storeError = 'FightStateProvider failed to initialize derived stats store';
  const derivedStore = assertStore(derivedStoreRef.current, storeError);
  const stateStore = assertStore(stateStoreRef.current, storeError);

  return (
    <FightActionsContext.Provider value={actions}>
      <FightStateStoreContext.Provider value={stateStore}>
        <FightDerivedStatsContext.Provider value={derivedStore}>
          {children}
        </FightDerivedStatsContext.Provider>
      </FightStateStoreContext.Provider>
    </FightActionsContext.Provider>
  );
};

export const useFightActions = () => {
  const actions = useContext(FightActionsContext);
  if (!actions) {
    throw new Error('useFightActions must be used within a FightStateProvider');
  }
  return actions;
};

export const useFightStateSelector = <Selected,>(
  selector: (state: FightState) => Selected,
  equalityFn: (previous: Selected, next: Selected) => boolean = Object.is,
) => {
  const store = useContext(FightStateStoreContext);
  if (!store) {
    throw new Error('useFightStateSelector must be used within a FightStateProvider');
  }

  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn);
  const selectedRef = useRef<Selected>();
  const hasSnapshotRef = useRef(false);

  if (selectorRef.current !== selector) {
    selectorRef.current = selector;
  }

  if (equalityFnRef.current !== equalityFn) {
    equalityFnRef.current = equalityFn;
  }

  const getSnapshot = useCallback(() => {
    const nextSelected = selectorRef.current(store.getSnapshot());
    const previousSelected = selectedRef.current;
    if (
      !hasSnapshotRef.current ||
      !equalityFnRef.current(previousSelected as Selected, nextSelected)
    ) {
      hasSnapshotRef.current = true;
      selectedRef.current = nextSelected;
      return nextSelected;
    }
    return previousSelected as Selected;
  }, [store]);

  const subscribe = useCallback(
    (notify: () => void) =>
      store.subscribe(() => {
        const nextSelected = selectorRef.current(store.getSnapshot());
        const previousSelected = selectedRef.current;
        if (
          !hasSnapshotRef.current ||
          !equalityFnRef.current(previousSelected as Selected, nextSelected)
        ) {
          hasSnapshotRef.current = true;
          selectedRef.current = nextSelected;
          notify();
        }
      }),
    [store],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

export const useFightState = () => {
  const actions = useFightActions();
  const state = useFightStateSelector((value) => value);
  return useMemo(() => ({ state, actions }), [state, actions]);
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
