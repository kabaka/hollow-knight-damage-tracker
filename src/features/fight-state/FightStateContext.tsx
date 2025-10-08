import type { FC, PropsWithChildren } from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';

import {
  DEFAULT_CUSTOM_HP,
  bossMap,
  bossSequenceMap,
  resolveSequenceEntries,
} from '../../data';
import type { FightState } from './fightReducer';
import { isCustomBoss, toSequenceStageKey } from './fightReducer';
import { PERSIST_FLUSH_EVENT } from '../../utils/persistenceEvents';
import { createFightStateStore } from './store';
import type { FightActions, FightStateStoreApi } from './store';

export type { AttackCategory, AttackEvent, AttackInput, DamageLogAggregates, BuildState, FightState, SpellLevel } from './fightReducer';
export { CUSTOM_BOSS_ID } from './fightReducer';
export type { DerivedStats, FightActions } from './store';
export { hasStrengthCharm } from './store';

const FightStateStoreContext = createContext<FightStateStoreApi['stateStore'] | undefined>(
  undefined,
);
const FightActionsContext = createContext<FightActions | undefined>(undefined);
const FightDerivedStatsContext = createContext<
  FightStateStoreApi['derivedStore'] | undefined
>(undefined);

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const assertStore = <T,>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

export const FightStateProvider: FC<PropsWithChildren> = ({ children }) => {
  const storeRef = useRef<FightStateStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createFightStateStore();
  }

  const store = storeRef.current;
  const { stateStore, derivedStore, actions, refreshDerivedStats, flushPersist, dispatch } = store;

  const state = useSyncExternalStore(
    stateStore.subscribe,
    stateStore.getSnapshot,
    stateStore.getSnapshot,
  );

  const sequenceCompletionRef = useRef<Map<string, number>>(new Map());

  const shouldAnimate =
    state.fightStartTimestamp !== null && state.fightEndTimestamp === null;

  useEffect(() => {
    if (!shouldAnimate) {
      return;
    }

    let frameId: number;

    const tick = () => {
      refreshDerivedStats();
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [shouldAnimate, refreshDerivedStats]);

  useEffect(() => {
    if (!shouldAnimate && state.fightEndTimestamp !== null) {
      refreshDerivedStats(state.fightEndTimestamp);
    }
  }, [shouldAnimate, state.fightEndTimestamp, refreshDerivedStats]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleFlush: EventListener = () => {
      flushPersist();
    };

    window.addEventListener(PERSIST_FLUSH_EVENT, handleFlush);

    return () => {
      window.removeEventListener(PERSIST_FLUSH_EVENT, handleFlush);
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
    const totalDamage = state.damageLogAggregates.totalDamage;
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
    state.damageLogAggregates.totalDamage,
    state.sequenceConditions,
    state.selectedBossId,
    state.customTargetHp,
    dispatch,
  ]);

  const storeError = 'FightStateProvider failed to initialize derived stats store';
  const derivedStoreValue = assertStore(derivedStore, storeError);
  const stateStoreValue = assertStore(stateStore, storeError);

  return (
    <FightActionsContext.Provider value={actions}>
      <FightStateStoreContext.Provider value={stateStoreValue}>
        <FightDerivedStatsContext.Provider value={derivedStoreValue}>
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

  const getSnapshot = () => {
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
  };

  const subscribe = (notify: () => void) =>
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
    });

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

