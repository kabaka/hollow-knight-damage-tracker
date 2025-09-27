import type { FC } from 'react';
import { useEffect } from 'react';

import { useFightState } from '../fight-state/FightStateContext';
import { RESET_SHORTCUT_KEY, useAttackDefinitions } from './useAttackDefinitions';

export const AttackLogPanel: FC = () => {
  const fight = useFightState();
  const { actions, state, derived } = fight;
  const { damageLog, redoStack } = state;
  const canEndFight = derived.fightStartTimestamp != null && !derived.isFightComplete;

  const { groupsWithMetadata, shortcutMap } = useAttackDefinitions(
    state,
    derived.remainingHp,
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
        return;
      }

      if (key === RESET_SHORTCUT_KEY) {
        if (state.damageLog.length === 0 && state.redoStack.length === 0) {
          return;
        }
        event.preventDefault();
        actions.resetLog();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, shortcutMap, state.damageLog.length, state.redoStack.length, canEndFight]);

  return (
    <div>
      <p className="section__description">
        Log each successful hit to reduce the boss health target. Use the buttons below to
        record nail strikes, nail arts, spells, and charm effects with the appropriate
        modifiers applied.
      </p>
      <div className="quick-actions" role="group" aria-label="Attack log controls">
        <button
          type="button"
          className="quick-actions__button"
          onClick={actions.undoLastAttack}
          disabled={damageLog.length === 0}
        >
          Undo
        </button>
        <button
          type="button"
          className="quick-actions__button"
          onClick={actions.redoLastAttack}
          disabled={redoStack.length === 0}
        >
          Redo
        </button>
        <button
          type="button"
          className="quick-actions__button"
          onClick={actions.resetLog}
          aria-keyshortcuts="Esc"
          disabled={damageLog.length === 0 && redoStack.length === 0}
        >
          Quick reset (Esc)
        </button>
        <button
          type="button"
          className="quick-actions__button"
          onClick={actions.endFight}
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
              {group.attacks.map((attack) => (
                <button
                  key={attack.id}
                  type="button"
                  className="button-grid__button"
                  aria-keyshortcuts={attack.hotkey?.toUpperCase()}
                  onClick={() =>
                    actions.logAttack({
                      id: attack.id,
                      label: attack.label,
                      damage: attack.damage,
                      category: attack.category,
                      soulCost: attack.soulCost,
                    })
                  }
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
