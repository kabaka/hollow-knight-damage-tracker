import type { FC, PropsWithChildren } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useHapticFeedback, type HapticFeedbackType } from '../../utils/haptics';
import { toSequenceStageKey } from '../fight-state/fightReducer';
import {
  useFightDerivedStats,
  useFightState,
  type FightActions,
  type FightState,
} from '../fight-state/FightStateContext';
import { useSequenceContext } from '../fight-state/useSequenceContext';
import { AttackLogContext } from './AttackLogContext';
import { useAttackDefinitions } from './useAttackDefinitions';
import { useAttackLogShortcuts } from './useAttackLogShortcuts';
import type { AttackLogActionPayload, AttackLogContextValue } from './types';

const ACTIVE_EFFECT_DURATION = 260;

type AttackLogProviderProps = PropsWithChildren;

const hasSequenceProgress = (
  state: FightState,
  sequenceKeyPrefix: string | null,
): boolean => {
  if (!sequenceKeyPrefix) {
    return false;
  }

  const {
    sequenceLogs,
    sequenceRedoStacks,
    sequenceFightEndTimestamps,
    sequenceManualEndFlags,
  } = state;

  return (
    Object.entries(sequenceLogs).some(
      ([key, log]) => key.startsWith(sequenceKeyPrefix) && log.length > 0,
    ) ||
    Object.entries(sequenceRedoStacks).some(
      ([key, stack]) => key.startsWith(sequenceKeyPrefix) && stack.length > 0,
    ) ||
    Object.entries(sequenceFightEndTimestamps).some(
      ([key, timestamp]) => key.startsWith(sequenceKeyPrefix) && timestamp != null,
    ) ||
    Object.entries(sequenceManualEndFlags).some(
      ([key, ended]) => key.startsWith(sequenceKeyPrefix) && ended,
    )
  );
};

const createFightHandlers = (
  actions: FightActions,
  triggerHaptics: (type: HapticFeedbackType) => void,
) => ({
  logAttack: (attack: AttackLogActionPayload) => {
    actions.logAttack({
      id: attack.id,
      label: attack.label,
      damage: attack.damage,
      category: attack.category,
      soulCost: attack.soulCost,
    });
    triggerHaptics('attack');
  },
  undoLastAttack: () => {
    actions.undoLastAttack();
  },
  redoLastAttack: () => {
    actions.redoLastAttack();
  },
  resetLog: () => {
    actions.resetLog();
  },
  resetSequence: () => {
    actions.resetSequence();
  },
  endFight: () => {
    actions.endFight();
  },
  startFight: () => {
    actions.startFight();
  },
});

export const AttackLogProvider: FC<AttackLogProviderProps> = ({ children }) => {
  const fight = useFightState();
  const derived = useFightDerivedStats();
  const sequenceContext = useSequenceContext();
  const { trigger: triggerHaptics } = useHapticFeedback();
  const { actions, state } = fight;
  const { damageLog, redoStack } = state;

  const handlers = useMemo(
    () => createFightHandlers(actions, triggerHaptics),
    [actions, triggerHaptics],
  );

  const canEndFight = derived.fightStartTimestamp != null && !derived.isFightComplete;
  const canStartFight =
    derived.fightStartTimestamp == null &&
    !derived.isFightInProgress &&
    damageLog.length === 0 &&
    redoStack.length === 0;
  const isSequenceActive = state.activeSequenceId != null;

  const sequenceKeyPrefix = state.activeSequenceId ? `${state.activeSequenceId}#` : null;
  const canResetSequence =
    isSequenceActive &&
    (damageLog.length > 0 ||
      redoStack.length > 0 ||
      state.sequenceIndex !== 0 ||
      hasSequenceProgress(state, sequenceKeyPrefix));

  const { groupsWithMetadata, shortcutMap } = useAttackDefinitions(
    state,
    derived.remainingHp,
    sequenceContext.sequenceBindingValues,
  );

  const panelRef = useRef<HTMLDivElement | null>(null);
  const activeEffectTimeoutsRef = useRef<Map<HTMLElement, number>>(new Map());
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const sequenceFeedbackRef = useRef<{
    previousIndex: number | null;
    lastCompletionKey: string | null;
    wasCompleted: boolean;
  }>({
    previousIndex: null,
    lastCompletionKey: null,
    wasCompleted: false,
  });

  const triggerActiveEffect = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return;
    }

    const timeouts = activeEffectTimeoutsRef.current;
    const previousTimeout = timeouts.get(element);
    if (previousTimeout) {
      window.clearTimeout(previousTimeout);
    }

    element.classList.remove('is-active-effect');

    const activate = () => {
      element.classList.add('is-active-effect');
      const timeoutId = window.setTimeout(() => {
        element.classList.remove('is-active-effect');
        timeouts.delete(element);
      }, ACTIVE_EFFECT_DURATION);
      timeouts.set(element, timeoutId);
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(activate);
    });
  }, []);

  const registerActionButton = useCallback(
    (id: string, element: HTMLButtonElement | null) => {
      const map = actionButtonRefs.current;
      if (element) {
        map.set(id, element);
      } else {
        map.delete(id);
      }
    },
    [],
  );

  const getActionButton = useCallback(
    (id: string) => actionButtonRefs.current.get(id) ?? null,
    [],
  );

  useEffect(
    () => () => {
      const timeouts = activeEffectTimeoutsRef.current;
      timeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeouts.clear();
    },
    [],
  );

  const handleToggleFight = useCallback(() => {
    if (canEndFight) {
      handlers.endFight();
      triggerHaptics(isSequenceActive ? 'fight-complete' : 'sequence-complete');
    } else if (canStartFight) {
      handlers.startFight();
    }
  }, [canEndFight, canStartFight, handlers, isSequenceActive, triggerHaptics]);

  const handleResetLog = useCallback(() => {
    handlers.resetLog();
  }, [handlers]);

  const handleResetSequence = useCallback(() => {
    handlers.resetSequence();
  }, [handlers]);

  const handleLogAttack = useCallback(
    (attack: AttackLogActionPayload) => {
      handlers.logAttack(attack);
    },
    [handlers],
  );

  const handleUndo = useCallback(() => {
    handlers.undoLastAttack();
  }, [handlers]);

  const handleRedo = useCallback(() => {
    handlers.redoLastAttack();
  }, [handlers]);

  useAttackLogShortcuts({
    canEndFight,
    canResetSequence,
    canStartFight,
    damageLogLength: damageLog.length,
    getActionButton,
    handleLogAttack,
    handleResetLog,
    handleResetSequence,
    handleToggleFight,
    panelRef,
    redoStackLength: redoStack.length,
    shortcutMap,
    triggerActiveEffect,
  });

  useEffect(() => {
    if (!sequenceContext.isSequenceActive) {
      sequenceFeedbackRef.current.previousIndex = null;
      sequenceFeedbackRef.current.lastCompletionKey = null;
      sequenceFeedbackRef.current.wasCompleted = false;
      return;
    }

    const previousIndex = sequenceFeedbackRef.current.previousIndex;
    const nextIndex = sequenceContext.cappedSequenceIndex;

    if (previousIndex !== null && nextIndex > previousIndex) {
      triggerHaptics('sequence-advance');
      sequenceFeedbackRef.current.wasCompleted = false;
      sequenceFeedbackRef.current.lastCompletionKey = null;
    }

    sequenceFeedbackRef.current.previousIndex = nextIndex;
  }, [
    sequenceContext.cappedSequenceIndex,
    sequenceContext.isSequenceActive,
    triggerHaptics,
  ]);

  useEffect(() => {
    if (!sequenceContext.isSequenceActive || !sequenceContext.activeSequenceId) {
      sequenceFeedbackRef.current.lastCompletionKey = null;
      sequenceFeedbackRef.current.wasCompleted = false;
      return;
    }

    const entries = sequenceContext.sequenceEntries;
    if (entries.length === 0) {
      return;
    }

    const keysToInspect: Array<{ key: string; index: number }> = [];
    if (sequenceContext.cappedSequenceIndex > 0) {
      const previousIndex = sequenceContext.cappedSequenceIndex - 1;
      keysToInspect.push({
        key: toSequenceStageKey(sequenceContext.activeSequenceId, previousIndex),
        index: previousIndex,
      });
    }

    keysToInspect.push({
      key: toSequenceStageKey(
        sequenceContext.activeSequenceId,
        sequenceContext.cappedSequenceIndex,
      ),
      index: sequenceContext.cappedSequenceIndex,
    });

    for (const { key, index } of keysToInspect) {
      const hasEnded =
        (state.sequenceManualEndFlags[key] ?? false) ||
        state.sequenceFightEndTimestamps[key] != null;

      const { lastCompletionKey, wasCompleted } = sequenceFeedbackRef.current;

      if (hasEnded && (!wasCompleted || lastCompletionKey !== key)) {
        const isFinalStage = index >= entries.length - 1;
        triggerHaptics(isFinalStage ? 'sequence-complete' : 'sequence-stage-complete');
        sequenceFeedbackRef.current.lastCompletionKey = key;
        sequenceFeedbackRef.current.wasCompleted = true;
        break;
      }

      if (!hasEnded && lastCompletionKey === key) {
        sequenceFeedbackRef.current.wasCompleted = false;
      }
    }
  }, [
    sequenceContext.activeSequenceId,
    sequenceContext.cappedSequenceIndex,
    sequenceContext.isSequenceActive,
    sequenceContext.sequenceEntries,
    state.sequenceFightEndTimestamps,
    state.sequenceManualEndFlags,
    triggerHaptics,
  ]);

  const contextValue = useMemo<AttackLogContextValue>(
    () => ({
      panelRef,
      groupsWithMetadata,
      logAttack: handleLogAttack,
      undoLastAttack: handleUndo,
      redoLastAttack: handleRedo,
      resetLog: handleResetLog,
      resetSequence: handleResetSequence,
      toggleFight: handleToggleFight,
      canUndo: damageLog.length > 0,
      canRedo: redoStack.length > 0,
      canResetLog: damageLog.length > 0 || redoStack.length > 0,
      canResetSequence,
      showResetSequence: isSequenceActive,
      fightButtonLabel: canStartFight ? 'Start' : 'End',
      fightButtonAriaLabel: canStartFight ? 'Start fight' : 'End fight',
      fightButtonShortcut: 'Enter',
      fightButtonDisabled: !canEndFight && !canStartFight,
      triggerActiveEffect,
      registerActionButton,
    }),
    [
      canResetSequence,
      canStartFight,
      canEndFight,
      damageLog.length,
      redoStack.length,
      groupsWithMetadata,
      handleLogAttack,
      handleUndo,
      handleRedo,
      handleResetLog,
      handleResetSequence,
      handleToggleFight,
      isSequenceActive,
      triggerActiveEffect,
      registerActionButton,
    ],
  );

  return (
    <AttackLogContext.Provider value={contextValue}>{children}</AttackLogContext.Provider>
  );
};
