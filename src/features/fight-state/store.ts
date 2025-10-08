import {
  DEFAULT_CUSTOM_HP,
  bossMap,
  bossPhaseMap,
  strengthCharmIds,
} from '../../data';
import type {
  AttackInput,
  DamageLogAggregates,
  FightAction,
  FightState,
  SpellLevel,
} from './fightReducer';
import {
  createInitialState,
  ensureSequenceState,
  ensureSpellLevels,
  fightReducer,
  isCustomBoss,
} from './fightReducer';
import { persistStateToStorage, restorePersistedState } from './persistence';
import { scheduleIdleTask } from '../../utils/scheduleIdleTask';
import {
  incrementAggregateComputationCount,
  incrementAggregateMismatchCount,
} from './fightStateInstrumentation';

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
  phaseNumber: number | null;
  phaseCount: number | null;
  phaseLabel: string | null;
  phaseThresholds: number[] | null;
};

export type FightActions = {
  selectBoss: (bossId: string) => void;
  setCustomTargetHp: (hp: number) => void;
  setNailUpgrade: (nailUpgradeId: string) => void;
  setActiveCharms: (charmIds: string[]) => void;
  updateActiveCharms: (updater: (charmIds: string[]) => string[]) => void;
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

type Listener = () => void;

export interface ExternalStore<T> {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => T;
}

export interface FightStateStoreApi {
  stateStore: ExternalStore<FightState>;
  derivedStore: ExternalStore<DerivedStats>;
  actions: FightActions;
  dispatch: (action: FightAction) => void;
  refreshDerivedStats: (timestamp?: number) => void;
  flushPersist: () => void;
  getStateSnapshot: () => FightState;
}

type DamageLogAggregateCache = {
  version: number;
  aggregates: DamageLogAggregates;
};

const cloneDamageLogAggregates = (
  aggregates: DamageLogAggregates,
): DamageLogAggregates => ({
  totalDamage: aggregates.totalDamage,
  attacksLogged: aggregates.attacksLogged,
  firstAttackTimestamp: aggregates.firstAttackTimestamp,
  lastAttackTimestamp: aggregates.lastAttackTimestamp,
});

const calculateDerivedStats = (
  state: FightState,
  frameTimestamp: number,
  aggregates: DamageLogAggregates,
): DerivedStats => {
  const {
    selectedBossId,
    customTargetHp,
    fightEndTimestamp,
    fightStartTimestamp: storedFightStartTimestamp,
  } = state;
  const damageLog = state.damageLog;
  const baseTargetHp = isCustomBoss(selectedBossId)
    ? Math.max(1, Math.round(customTargetHp))
    : (bossMap.get(selectedBossId)?.hp ?? DEFAULT_CUSTOM_HP);
  const phaseDefinition = selectedBossId ? bossPhaseMap.get(selectedBossId) : undefined;
  const phaseTotalHp = phaseDefinition?.phases.length
    ? phaseDefinition.phases.reduce((sum, phase) => sum + phase.hp, 0)
    : null;
  const targetHp = phaseTotalHp && phaseTotalHp > 0 ? phaseTotalHp : baseTargetHp;
  const { totalDamage, attacksLogged, firstAttackTimestamp } = aggregates;
  const clampedDamage = Math.max(0, totalDamage);

  let effectiveDamage = Math.min(clampedDamage, targetHp);
  if (phaseDefinition) {
    if (phaseDefinition.discardOverkill) {
      let consumed = 0;
      let phaseIndex = 0;
      let phaseRemaining = phaseDefinition.phases.length
        ? phaseDefinition.phases[phaseIndex].hp
        : 0;

      for (const event of damageLog) {
        let damageRemaining = Math.max(0, event.damage);
        while (damageRemaining > 0 && phaseIndex < phaseDefinition.phases.length) {
          if (phaseRemaining <= 0) {
            phaseIndex += 1;
            if (phaseIndex >= phaseDefinition.phases.length) {
              break;
            }
            phaseRemaining = phaseDefinition.phases[phaseIndex].hp;
            continue;
          }

          const applied = Math.min(damageRemaining, phaseRemaining);
          consumed += applied;
          phaseRemaining -= applied;
          damageRemaining -= applied;

          if (phaseRemaining <= 0) {
            damageRemaining = 0;
          }
        }

        if (phaseIndex >= phaseDefinition.phases.length) {
          break;
        }
      }

      effectiveDamage = Math.min(consumed, targetHp);
    } else {
      effectiveDamage = Math.min(clampedDamage, targetHp);
    }
  }

  const remainingHp = Math.max(0, targetHp - effectiveDamage);
  const averageDamage = attacksLogged === 0 ? null : totalDamage / attacksLogged;

  let phaseNumber: number | null = null;
  let phaseCount: number | null = null;
  let phaseLabel: string | null = null;
  let phaseThresholds: number[] | null = null;

  if (phaseDefinition && phaseDefinition.phases.length > 0) {
    phaseCount = phaseDefinition.phases.length;
    phaseThresholds = [];
    let accumulated = 0;
    for (let index = 0; index < phaseDefinition.phases.length; index += 1) {
      const phase = phaseDefinition.phases[index];
      accumulated += phase.hp;
      if (index < phaseDefinition.phases.length - 1) {
        phaseThresholds.push(Math.max(0, targetHp - accumulated));
      }
      if (phaseNumber === null && effectiveDamage < accumulated) {
        phaseNumber = index + 1;
        phaseLabel = phase.name;
      }
    }

    if (phaseNumber === null) {
      const lastPhase = phaseDefinition.phases[phaseDefinition.phases.length - 1];
      phaseNumber = phaseCount;
      phaseLabel = lastPhase.name;
    }
  }

  let fightStartTimestamp = storedFightStartTimestamp;
  if (fightStartTimestamp === null) {
    fightStartTimestamp = firstAttackTimestamp;
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
    phaseNumber,
    phaseCount,
    phaseLabel,
    phaseThresholds,
  };
};

const createInitialFightState = (): FightState =>
  restorePersistedState(ensureSequenceState(ensureSpellLevels(createInitialState())));

const createExternalStore = <T,>(getSnapshot: () => T, listeners: Set<Listener>) => ({
  getSnapshot,
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
});

export const createFightStateStore = (
  initialState: FightState = createInitialFightState(),
): FightStateStoreApi => {
  let state = initialState;
  let frameTimestamp = Date.now();
  incrementAggregateComputationCount();
  let aggregateCache: DamageLogAggregateCache = {
    version: state.damageLogVersion,
    aggregates: cloneDamageLogAggregates(state.damageLogAggregates),
  };
  let derived = calculateDerivedStats(state, frameTimestamp, aggregateCache.aggregates);

  const stateListeners = new Set<Listener>();
  const derivedListeners = new Set<Listener>();

  const ensureAggregateCache = (): DamageLogAggregates => {
    const { damageLogVersion, damageLogAggregates } = state;
    if (aggregateCache.version !== damageLogVersion) {
      incrementAggregateMismatchCount();
      incrementAggregateComputationCount();
      const aggregates = cloneDamageLogAggregates(damageLogAggregates);
      aggregateCache = {
        version: damageLogVersion,
        aggregates,
      };
      return aggregates;
    }

    return aggregateCache.aggregates;
  };

  const notifyState = () => {
    stateListeners.forEach((listener) => listener());
  };

  const notifyDerived = (timestamp?: number) => {
    frameTimestamp = typeof timestamp === 'number' ? timestamp : Date.now();
    const aggregates = ensureAggregateCache();
    derived = calculateDerivedStats(state, frameTimestamp, aggregates);
    derivedListeners.forEach((listener) => listener());
  };

  let persistDebounceTimeoutId: number | null = null;
  let cancelPersist: (() => void) | null = null;
  let persistDirty = false;
  let lastPersistTimestamp = 0;
  const PERSIST_DEBOUNCE_MS = 900;
  const PERSIST_IDLE_TIMEOUT_MS = 1500;

  const persistNow = () => {
    persistStateToStorage(state);
    lastPersistTimestamp = Date.now();
    persistDirty = false;
  };

  const flushPersist = () => {
    if (typeof window !== 'undefined' && persistDebounceTimeoutId !== null) {
      window.clearTimeout(persistDebounceTimeoutId);
      persistDebounceTimeoutId = null;
    }

    cancelPersist?.();
    cancelPersist = null;

    if (!persistDirty) {
      return;
    }

    persistNow();
  };

  const schedulePersist = () => {
    persistDirty = true;

    if (typeof window === 'undefined') {
      persistNow();
      return;
    }

    const scheduleIdle = () => {
      cancelPersist?.();
      cancelPersist = scheduleIdleTask(() => {
        cancelPersist = null;

        if (!persistDirty) {
          return;
        }

        const now = Date.now();
        const hasPersistedBefore = lastPersistTimestamp > 0;
        const elapsed = hasPersistedBefore
          ? now - lastPersistTimestamp
          : Number.POSITIVE_INFINITY;
        if (hasPersistedBefore && elapsed < PERSIST_DEBOUNCE_MS) {
          if (persistDebounceTimeoutId === null) {
            const delay = Math.max(0, PERSIST_DEBOUNCE_MS - elapsed);
            persistDebounceTimeoutId = window.setTimeout(() => {
              persistDebounceTimeoutId = null;
              schedulePersist();
            }, delay);
          }
          return;
        }

        persistNow();
      }, { timeout: PERSIST_IDLE_TIMEOUT_MS });
    };

    if (cancelPersist || persistDebounceTimeoutId !== null) {
      return;
    }

    const now = Date.now();
    const hasPersistedBefore = lastPersistTimestamp > 0;
    const elapsed = hasPersistedBefore ? now - lastPersistTimestamp : Number.POSITIVE_INFINITY;
    if (!hasPersistedBefore || elapsed >= PERSIST_DEBOUNCE_MS) {
      scheduleIdle();
    } else {
      const delay = Math.max(0, PERSIST_DEBOUNCE_MS - elapsed);
      persistDebounceTimeoutId = window.setTimeout(() => {
        persistDebounceTimeoutId = null;
        scheduleIdle();
      }, delay);
    }
  };

  const dispatch = (action: FightAction) => {
    const nextState = fightReducer(state, action);
    if (nextState === state) {
      return;
    }

    state = nextState;
    notifyState();
    schedulePersist();
    notifyDerived();
  };

  const actions: FightActions = {
    selectBoss: (bossId) => dispatch({ type: 'selectBoss', bossId }),
    setCustomTargetHp: (hp) => dispatch({ type: 'setCustomTargetHp', hp }),
    setNailUpgrade: (nailUpgradeId) => dispatch({ type: 'setNailUpgrade', nailUpgradeId }),
    setActiveCharms: (charmIds) => dispatch({ type: 'setActiveCharms', charmIds }),
    updateActiveCharms: (updater) => dispatch({ type: 'updateActiveCharms', updater }),
    setCharmNotchLimit: (notchLimit) => dispatch({ type: 'setCharmNotchLimit', notchLimit }),
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
  };

  const stateStore = createExternalStore(() => state, stateListeners);
  const derivedStore = createExternalStore(() => derived, derivedListeners);

  return {
    stateStore,
    derivedStore,
    actions,
    dispatch,
    refreshDerivedStats: notifyDerived,
    flushPersist,
    getStateSnapshot: () => state,
  };
};

export const hasStrengthCharm = (charmIds: string[]) =>
  charmIds.some((id) => strengthCharmIds.has(id));
