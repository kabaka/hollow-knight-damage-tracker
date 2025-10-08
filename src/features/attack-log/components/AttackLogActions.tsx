import { useCallback, type FC, type PointerEvent, type KeyboardEvent } from 'react';

import { AppButton } from '../../../components/AppButton';
import { useAttackLogContext } from '../context';
import { isActivationKey } from './isActivationKey';

const RESET_SEQUENCE_SHORTCUT = 'Shift+Escape';

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
    (event: PointerEvent<HTMLButtonElement>) => {
      triggerActiveEffect(event.currentTarget);
    },
    [triggerActiveEffect],
  );

  const handleKeyEffect = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
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
