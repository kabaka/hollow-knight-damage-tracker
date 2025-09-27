import type { FC } from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { useFightDerivedStats, useFightState } from '../fight-state/FightStateContext';
import {
  RESET_SHORTCUT_KEY,
  useAttackDefinitions,
  type AttackWithMetadata,
} from './useAttackDefinitions';

type AttackParticleEffect = 'nail' | 'spell-spirit' | 'spell-dive' | 'spell-wraith';
type ParticleEffect = AttackParticleEffect | 'control';

const PARTICLE_DURATIONS: Record<ParticleEffect, number> = {
  nail: 200,
  'spell-spirit': 220,
  'spell-dive': 230,
  'spell-wraith': 230,
  control: 150,
};

const getParticleEffectForAttack = (attack: AttackWithMetadata): AttackParticleEffect => {
  if (attack.category === 'spell') {
    if (attack.id.startsWith('desolate-dive')) {
      return 'spell-dive';
    }
    if (attack.id.startsWith('howling-wraiths')) {
      return 'spell-wraith';
    }
    return 'spell-spirit';
  }

  return 'nail';
};

const RESET_SEQUENCE_SHORTCUT = 'Shift+Escape';

export const AttackLogPanel: FC = () => {
  const fight = useFightState();
  const derived = useFightDerivedStats();
  const { actions, state } = fight;
  const { damageLog, redoStack } = state;
  const canEndFight = derived.fightStartTimestamp != null && !derived.isFightComplete;
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
  const particleTimeoutsRef = useRef<Map<HTMLElement, number>>(new Map());

  const triggerParticleEffect = useCallback(
    (element: HTMLElement | null, effect: ParticleEffect) => {
      if (!element) {
        return;
      }

      const timeouts = particleTimeoutsRef.current;
      const previousTimeout = timeouts.get(element);
      if (previousTimeout) {
        window.clearTimeout(previousTimeout);
      }

      element.classList.remove('is-particle-active');

      const activate = () => {
        element.classList.add('is-particle-active');
        const duration = PARTICLE_DURATIONS[effect] ?? 200;
        const timeoutId = window.setTimeout(() => {
          element.classList.remove('is-particle-active');
          timeouts.delete(element);
        }, duration);
        timeouts.set(element, timeoutId);
      };

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(activate);
      });
    },
    [],
  );

  useEffect(
    () => () => {
      const timeouts = particleTimeoutsRef.current;
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeouts.clear();
    },
    [],
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

      if (key === 'Enter' && canEndFight) {
        event.preventDefault();
        actions.endFight();
        triggerParticleEffect(
          panelRef.current?.querySelector<HTMLButtonElement>(
            "[data-control='end-fight']",
          ),
          'control',
        );
        return;
      }

      if (key === RESET_SHORTCUT_KEY) {
        if (event.shiftKey) {
          if (!canResetSequence) {
            return;
          }
          event.preventDefault();
          actions.resetSequence();
          triggerParticleEffect(
            panelRef.current?.querySelector<HTMLButtonElement>(
              "[data-control='reset-sequence']",
            ),
            'control',
          );
          return;
        }

        if (state.damageLog.length === 0 && state.redoStack.length === 0) {
          return;
        }
        event.preventDefault();
        actions.resetLog();
        triggerParticleEffect(
          panelRef.current?.querySelector<HTMLButtonElement>(
            "[data-control='reset-log']",
          ),
          'control',
        );
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
        triggerParticleEffect(
          panelRef.current?.querySelector<HTMLButtonElement>(
            `[data-attack-id='${attack.id}']`,
          ),
          getParticleEffectForAttack(attack),
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
    canResetSequence,
    triggerParticleEffect,
  ]);

  return (
    <div ref={panelRef}>
      <p className="section__description">
        Log each successful hit to reduce the boss health target. Use the buttons below to
        record nail strikes, nail arts, spells, and charm effects with the appropriate
        modifiers applied.
      </p>
      <div className="quick-actions" role="group" aria-label="Attack log controls">
        <button
          type="button"
          className="quick-actions__button"
          data-particle-effect="control"
          data-control="undo"
          onClick={(event) => {
            triggerParticleEffect(event.currentTarget, 'control');
            actions.undoLastAttack();
          }}
          disabled={damageLog.length === 0}
        >
          Undo
        </button>
        <button
          type="button"
          className="quick-actions__button"
          data-particle-effect="control"
          data-control="redo"
          onClick={(event) => {
            triggerParticleEffect(event.currentTarget, 'control');
            actions.redoLastAttack();
          }}
          disabled={redoStack.length === 0}
        >
          Redo
        </button>
        <button
          type="button"
          className="quick-actions__button"
          data-particle-effect="control"
          data-control="reset-log"
          onClick={(event) => {
            triggerParticleEffect(event.currentTarget, 'control');
            actions.resetLog();
          }}
          aria-keyshortcuts="Esc"
          disabled={damageLog.length === 0 && redoStack.length === 0}
        >
          Quick reset (Esc)
        </button>
        {isSequenceActive ? (
          <button
            type="button"
            className="quick-actions__button"
            data-particle-effect="control"
            data-control="reset-sequence"
            onClick={(event) => {
              triggerParticleEffect(event.currentTarget, 'control');
              actions.resetSequence();
            }}
            aria-keyshortcuts={RESET_SEQUENCE_SHORTCUT}
            disabled={!canResetSequence}
          >
            Reset sequence (Shift+Esc)
          </button>
        ) : null}
        <button
          type="button"
          className="quick-actions__button"
          data-particle-effect="control"
          data-control="end-fight"
          onClick={(event) => {
            triggerParticleEffect(event.currentTarget, 'control');
            actions.endFight();
          }}
          aria-keyshortcuts="Enter"
          disabled={!canEndFight}
        >
          End fight (Enter)
        </button>
      </div>
      <div className="attack-groups">
        {groupsWithMetadata.map((group) => (
          <section key={group.id} className="attack-group">
            <h3 className="attack-group__title">{group.label}</h3>
            <div className="button-grid" role="group" aria-label={group.label}>
              {group.attacks.map((attack) => {
                const particleEffect = getParticleEffectForAttack(attack);
                return (
                  <button
                    key={attack.id}
                    type="button"
                    className="button-grid__button"
                    aria-keyshortcuts={attack.hotkey?.toUpperCase()}
                    data-attack-category={attack.category}
                    data-attack-id={attack.id}
                    data-particle-effect={particleEffect}
                    onClick={(event) => {
                      triggerParticleEffect(event.currentTarget, particleEffect);
                      actions.logAttack({
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
                      {typeof attack.soulCost === 'number' ? (
                        <span className="button-grid__soul" aria-label="Soul cost">
                          {attack.soulCost} SOUL
                        </span>
                      ) : null}
                      {typeof attack.hitsRemaining === 'number' ? (
                        <span
                          className="button-grid__hits"
                          aria-label="Hits to finish with this attack"
                        >
                          Hits to finish: {attack.hitsRemaining}
                        </span>
                      ) : null}
                    </span>
                    {attack.description ? (
                      <span className="button-grid__description">
                        {attack.description}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
