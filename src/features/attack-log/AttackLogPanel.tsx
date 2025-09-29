import type {
  FC,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  PropsWithChildren,
  RefObject,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { AppButton } from '../../components/AppButton';
import { useFightDerivedStats, useFightState } from '../fight-state/FightStateContext';
import { RESET_SHORTCUT_KEY, useAttackDefinitions } from './useAttackDefinitions';

const RESET_SEQUENCE_SHORTCUT = 'Shift+Escape';
const ACTIVE_EFFECT_DURATION = 260;

const isActivationKey = (key: string) =>
  key === 'Enter' || key === ' ' || key === 'Spacebar';

type AttackLogContextValue = {
  readonly panelRef: RefObject<HTMLDivElement>;
  readonly groupsWithMetadata: ReturnType<
    typeof useAttackDefinitions
  >['groupsWithMetadata'];
  readonly logAttack: (attack: {
    id: string;
    label: string;
    damage: number;
    category: string;
    soulCost: number | null;
  }) => void;
  readonly undoLastAttack: () => void;
  readonly redoLastAttack: () => void;
  readonly resetLog: () => void;
  readonly resetSequence: () => void;
  readonly toggleFight: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canResetLog: boolean;
  readonly canResetSequence: boolean;
  readonly showResetSequence: boolean;
  readonly fightButtonLabel: string;
  readonly fightButtonAriaLabel: string;
  readonly fightButtonShortcut: string;
  readonly fightButtonDisabled: boolean;
  readonly triggerActiveEffect: (element: HTMLElement | null) => void;
  readonly registerActionButton: (id: string, element: HTMLButtonElement | null) => void;
};

const AttackLogContext = createContext<AttackLogContextValue | null>(null);

const useAttackLogContext = () => {
  const context = useContext(AttackLogContext);
  if (!context) {
    throw new Error('AttackLog components must be rendered within an AttackLogProvider');
  }
  return context;
};

type AttackLogProviderProps = PropsWithChildren;

export const AttackLogProvider: FC<AttackLogProviderProps> = ({ children }) => {
  const fight = useFightState();
  const derived = useFightDerivedStats();
  const { actions, state } = fight;
  const { damageLog, redoStack } = state;
  const canEndFight = derived.fightStartTimestamp != null && !derived.isFightComplete;
  const canStartFight =
    derived.fightStartTimestamp == null &&
    !derived.isFightInProgress &&
    damageLog.length === 0 &&
    redoStack.length === 0;
  const isSequenceActive = state.activeSequenceId != null;

  const sequenceKeyPrefix = state.activeSequenceId ? `${state.activeSequenceId}#` : null;

  const hasStoredSequenceProgress = sequenceKeyPrefix
    ? Object.entries(state.sequenceLogs).some(
        ([key, log]) => key.startsWith(sequenceKeyPrefix) && log.length > 0,
      ) ||
      Object.entries(state.sequenceRedoStacks).some(
        ([key, stack]) => key.startsWith(sequenceKeyPrefix) && stack.length > 0,
      ) ||
      Object.entries(state.sequenceFightEndTimestamps).some(
        ([key, timestamp]) => key.startsWith(sequenceKeyPrefix) && timestamp != null,
      ) ||
      Object.entries(state.sequenceManualEndFlags).some(
        ([key, ended]) => key.startsWith(sequenceKeyPrefix) && ended,
      )
    : false;

  const canResetSequence =
    isSequenceActive &&
    (damageLog.length > 0 ||
      redoStack.length > 0 ||
      state.sequenceIndex !== 0 ||
      hasStoredSequenceProgress);

  const { groupsWithMetadata, shortcutMap } = useAttackDefinitions(
    state,
    derived.remainingHp,
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const activeEffectTimeoutsRef = useRef<Map<HTMLElement, number>>(new Map());
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

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

  useEffect(
    () => () => {
      const timeouts = activeEffectTimeoutsRef.current;
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeouts.clear();
    },
    [],
  );

  const handleUndo = useCallback(() => {
    actions.undoLastAttack();
  }, [actions]);

  const handleRedo = useCallback(() => {
    actions.redoLastAttack();
  }, [actions]);

  const handleResetLog = useCallback(() => {
    actions.resetLog();
  }, [actions]);

  const handleResetSequence = useCallback(() => {
    actions.resetSequence();
  }, [actions]);

  const handleToggleFight = useCallback(() => {
    if (canEndFight) {
      actions.endFight();
    } else if (canStartFight) {
      actions.startFight();
    }
  }, [actions, canEndFight, canStartFight]);

  const handleLogAttack = useCallback(
    (attack: {
      id: string;
      label: string;
      damage: number;
      category: string;
      soulCost: number | null;
    }) => {
      actions.logAttack(attack);
    },
    [actions],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const interactiveElement = target.closest(
          'input, textarea, select, [contenteditable="true"]',
        );
        if (interactiveElement) {
          return;
        }
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      const getActionButton = (id: string) => actionButtonRefs.current.get(id) ?? null;

      if (key === 'Enter') {
        if (canEndFight) {
          event.preventDefault();
          actions.endFight();
          triggerActiveEffect(getActionButton('end-fight'));
          return;
        }

        if (canStartFight) {
          event.preventDefault();
          actions.startFight();
          triggerActiveEffect(getActionButton('end-fight'));
          return;
        }
      }

      if (key === RESET_SHORTCUT_KEY) {
        if (event.shiftKey) {
          if (!canResetSequence) {
            return;
          }
          event.preventDefault();
          actions.resetSequence();
          triggerActiveEffect(getActionButton('reset-sequence'));
          return;
        }

        if (state.damageLog.length === 0 && state.redoStack.length === 0) {
          return;
        }
        event.preventDefault();
        actions.resetLog();
        triggerActiveEffect(getActionButton('reset-log'));
        return;
      }

      if (key.length === 1) {
        const attack = shortcutMap.get(key);
        if (!attack) {
          return;
        }

        event.preventDefault();
        actions.logAttack({
          id: attack.id,
          label: attack.label,
          damage: attack.damage,
          category: attack.category,
          soulCost: attack.soulCost,
        });
        triggerActiveEffect(
          panelRef.current?.querySelector<HTMLButtonElement>(
            `[data-attack-id='${attack.id}']`,
          ) ?? null,
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    actions,
    shortcutMap,
    state.damageLog.length,
    state.redoStack.length,
    canEndFight,
    canStartFight,
    canResetSequence,
    triggerActiveEffect,
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

export const AttackLogActions: FC = () => {
  const {
    undoLastAttack,
    redoLastAttack,
    resetLog,
    resetSequence,
    toggleFight,
    canUndo,
    canRedo,
    canResetLog,
    canResetSequence,
    showResetSequence,
    fightButtonDisabled,
    fightButtonLabel,
    fightButtonAriaLabel,
    fightButtonShortcut,
    triggerActiveEffect,
    registerActionButton,
  } = useAttackLogContext();

  const handlePointerEffect = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      triggerActiveEffect(event.currentTarget);
    },
    [triggerActiveEffect],
  );

  const handleKeyEffect = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (isActivationKey(event.key)) {
        triggerActiveEffect(event.currentTarget);
      }
    },
    [triggerActiveEffect],
  );

  return (
    <div className="attack-log__actions" role="group" aria-label="Attack log controls">
      <AppButton
        ref={(element) => registerActionButton('undo', element)}
        type="button"
        onPointerDown={handlePointerEffect}
        onKeyDown={handleKeyEffect}
        onClick={undoLastAttack}
        data-control="undo"
        disabled={!canUndo}
      >
        Undo
      </AppButton>
      <AppButton
        ref={(element) => registerActionButton('redo', element)}
        type="button"
        onPointerDown={handlePointerEffect}
        onKeyDown={handleKeyEffect}
        onClick={redoLastAttack}
        data-control="redo"
        disabled={!canRedo}
      >
        Redo
      </AppButton>
      <AppButton
        ref={(element) => registerActionButton('reset-log', element)}
        type="button"
        onPointerDown={handlePointerEffect}
        onKeyDown={handleKeyEffect}
        onClick={resetLog}
        data-control="reset-log"
        aria-keyshortcuts="Esc"
        aria-label="Clear attack log"
        shortcut="Esc"
        disabled={!canResetLog}
      >
        Clear
      </AppButton>
      {showResetSequence ? (
        <AppButton
          ref={(element) => registerActionButton('reset-sequence', element)}
          type="button"
          onPointerDown={handlePointerEffect}
          onKeyDown={handleKeyEffect}
          onClick={resetSequence}
          data-control="reset-sequence"
          aria-keyshortcuts={RESET_SEQUENCE_SHORTCUT}
          aria-label="Reset sequence progress"
          shortcut="Shift+Esc"
          disabled={!canResetSequence}
        >
          Sequence
        </AppButton>
      ) : null}
      <AppButton
        ref={(element) => registerActionButton('end-fight', element)}
        type="button"
        onPointerDown={handlePointerEffect}
        onKeyDown={handleKeyEffect}
        onClick={toggleFight}
        data-control="end-fight"
        aria-keyshortcuts={fightButtonShortcut}
        aria-label={fightButtonAriaLabel}
        shortcut={fightButtonShortcut}
        disabled={fightButtonDisabled}
      >
        {fightButtonLabel}
      </AppButton>
    </div>
  );
};

export const AttackLogPanel: FC = () => {
  const { groupsWithMetadata, logAttack, panelRef, triggerActiveEffect } =
    useAttackLogContext();

  return (
    <div ref={panelRef} className="attack-log">
      <div className="attack-groups">
        {groupsWithMetadata.map((group) => (
          <section key={group.id} className="attack-group">
            <h3 className="attack-group__title">{group.label}</h3>
            <div className="button-grid" role="group" aria-label={group.label}>
              {group.attacks.map((attack) => (
                <button
                  key={attack.id}
                  type="button"
                  className="button-grid__button"
                  aria-keyshortcuts={attack.hotkey?.toUpperCase()}
                  data-attack-category={attack.category}
                  data-attack-id={attack.id}
                  onPointerDown={(event) => {
                    triggerActiveEffect(event.currentTarget);
                  }}
                  onKeyDown={(event) => {
                    if (isActivationKey(event.key)) {
                      triggerActiveEffect(event.currentTarget);
                    }
                  }}
                  onClick={() => {
                    logAttack({
                      id: attack.id,
                      label: attack.label,
                      damage: attack.damage,
                      category: attack.category,
                      soulCost: attack.soulCost,
                    });
                  }}
                >
                  <div className="button-grid__header">
                    <span className="button-grid__label">{attack.label}</span>
                    {attack.hotkey ? (
                      <span className="button-grid__hotkey" aria-hidden="true">
                        {attack.hotkey.toUpperCase()}
                      </span>
                    ) : null}
                  </div>
                  {attack.hotkey ? (
                    <span className="visually-hidden">
                      Shortcut key {attack.hotkey.toUpperCase()}.
                    </span>
                  ) : null}
                  <span className="button-grid__meta">
                    <span className="button-grid__damage" aria-label="Damage per hit">
                      {attack.damage}
                    </span>
                    {typeof attack.soulCost === 'number' &&
                    attack.category !== 'spell' ? (
                      <span className="button-grid__soul" aria-label="Soul cost">
                        {attack.soulCost} SOUL
                      </span>
                    ) : null}
                    {typeof attack.hitsRemaining === 'number' ? (
                      <span
                        className="button-grid__hits"
                        aria-label={`To end: ${attack.hitsRemaining}`}
                      >
                        To end: {attack.hitsRemaining}
                      </span>
                    ) : null}
                  </span>
                  {attack.description ? (
                    <span className="button-grid__description">{attack.description}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
