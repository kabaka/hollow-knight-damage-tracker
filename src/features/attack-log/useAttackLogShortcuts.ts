import { useEffect, type RefObject } from 'react';

import { scheduleIdleTask } from '../../utils/scheduleIdleTask';
import { RESET_SHORTCUT_KEY } from './useAttackDefinitions';
import type { AttackLogActionPayload, AttackShortcutMap } from './types';

type AttackLogShortcutsOptions = {
  canEndFight: boolean;
  canStartFight: boolean;
  canResetSequence: boolean;
  damageLogLength: number;
  redoStackLength: number;
  handleToggleFight: () => void;
  handleResetLog: () => void;
  handleResetSequence: () => void;
  handleLogAttack: (attack: AttackLogActionPayload) => void;
  panelRef: RefObject<HTMLDivElement | null>;
  shortcutMap: AttackShortcutMap;
  triggerActiveEffect: (element: HTMLElement | null) => void;
  getActionButton: (id: string) => HTMLButtonElement | null;
};

const HIGHLIGHT_ACTIONS = {
  resetLog: 'reset-log',
  resetSequence: 'reset-sequence',
  toggleFight: 'end-fight',
} as const;

const highlightElement = (
  getElement: () => HTMLElement | null,
  triggerActiveEffect: (element: HTMLElement | null) => void,
) => {
  scheduleIdleTask(() => {
    triggerActiveEffect(getElement());
  });
};

export const useAttackLogShortcuts = ({
  canEndFight,
  canResetSequence,
  canStartFight,
  damageLogLength,
  redoStackLength,
  handleLogAttack,
  handleResetLog,
  handleResetSequence,
  handleToggleFight,
  panelRef,
  shortcutMap,
  triggerActiveEffect,
  getActionButton,
}: AttackLogShortcutsOptions) => {
  useEffect(() => {
    const highlightActionButton = (id: keyof typeof HIGHLIGHT_ACTIONS) => {
      const targetId = HIGHLIGHT_ACTIONS[id];
      highlightElement(() => getActionButton(targetId), triggerActiveEffect);
    };

    const highlightAttackButton = (attackId: string) => {
      highlightElement(() => {
        if (panelRef.current === null) {
          return null;
        }

        const button = panelRef.current.querySelector<HTMLButtonElement>(
          `[data-attack-id='${attackId}']`,
        );
        return button ?? null;
      }, triggerActiveEffect);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === 'Enter') {
        if (canEndFight || canStartFight) {
          event.preventDefault();
          handleToggleFight();
          highlightActionButton('toggleFight');
        }
        return;
      }

      if (key === RESET_SHORTCUT_KEY) {
        if (event.shiftKey) {
          if (!canResetSequence) {
            return;
          }
          event.preventDefault();
          handleResetSequence();
          highlightActionButton('resetSequence');
          return;
        }

        if (damageLogLength === 0 && redoStackLength === 0) {
          return;
        }
        event.preventDefault();
        handleResetLog();
        highlightActionButton('resetLog');
        return;
      }

      if (key.length === 1) {
        const attack = shortcutMap.get(key);
        if (attack === undefined) {
          return;
        }

        event.preventDefault();
        handleLogAttack({
          id: attack.id,
          label: attack.label,
          damage: attack.damage,
          category: attack.category,
          soulCost: attack.soulCost ?? null,
        });
        highlightAttackButton(attack.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canEndFight,
    canResetSequence,
    canStartFight,
    damageLogLength,
    redoStackLength,
    getActionButton,
    handleLogAttack,
    handleResetLog,
    handleResetSequence,
    handleToggleFight,
    panelRef,
    shortcutMap,
    triggerActiveEffect,
  ]);
};
