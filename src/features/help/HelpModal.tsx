import { useEffect, useRef, type FC } from 'react';

type HelpModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
};

const HelpModalContent: FC<Pick<HelpModalProps, 'onClose'>> = ({ onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    queueMicrotask(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-help-title"
    >
      <button
        type="button"
        className="modal__backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <h2 id="app-help-title" className="modal__title">
              App help
            </h2>
            <p className="modal__subtitle">
              Learn how to practice encounters, log attacks, and interpret performance
              metrics.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="modal__close"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <div className="modal__body">
          <section
            className="modal-section"
            aria-labelledby="help-getting-started-heading"
          >
            <div className="modal-section__header">
              <h3 id="help-getting-started-heading">Getting started</h3>
            </div>
            <p className="modal-section__description">
              Use <strong>Change encounter</strong> to pick a boss, version, and arena.
              For custom practice scenarios, choose the Custom option and provide an HP
              target. The selected encounter drives the numbers shown throughout the
              tracker.
            </p>
          </section>

          <section className="modal-section" aria-labelledby="help-attack-log-heading">
            <div className="modal-section__header">
              <h3 id="help-attack-log-heading">Logging attacks</h3>
            </div>
            <p className="modal-section__description">
              The <strong>Attack Log</strong> lists every strike you record. Use the
              attack buttons or their keyboard shortcuts to subtract damage while you
              practice. Nail strikes, arts, spells, and charm effects automatically apply
              the modifiers from your loadout, and you can hover each button to see its
              shortcut and damage value.
            </p>
            <p>
              Made a mistake? Remove the most recent entry from the log to restore the
              boss HP and associated metrics.
            </p>
          </section>

          <section
            className="modal-section"
            aria-labelledby="help-combat-overview-heading"
          >
            <div className="modal-section__header">
              <h3 id="help-combat-overview-heading">Understanding the Combat Overview</h3>
            </div>
            <p className="modal-section__description">
              The <strong>Combat Overview</strong> summarizes progress, including total
              damage, average DPS, fight duration, stagger tracking, and charm effects.
              Watch these indicators to evaluate the consistency of your attempts and to
              confirm your build can finish encounters before enrages or stagger windows
              slip away.
            </p>
          </section>

          <section className="modal-section" aria-labelledby="help-loadout-heading">
            <div className="modal-section__header">
              <h3 id="help-loadout-heading">Player loadout and advanced setup</h3>
            </div>
            <p className="modal-section__description">
              Open <strong>Player loadout</strong> to configure nail upgrades, spells, and
              charms. Presets offer quick starting points, and you can toggle individual
              charms to match your build. The tracker automatically adjusts damage values
              and charm effects based on your selection.
            </p>
            <p>
              Need stage-specific practice? Expand the encounter setup drawer to select
              sequences, control stage progression, and enable conditional modifiers.
            </p>
          </section>

          <section className="modal-section" aria-labelledby="help-shortcuts-heading">
            <div className="modal-section__header">
              <h3 id="help-shortcuts-heading">Keyboard shortcuts</h3>
            </div>
            <p className="modal-section__description">
              Attack buttons support dedicated shortcuts for rapid practice reps. Use the
              bracket keys <kbd>[</kbd> and <kbd>]</kbd> to move between sequence stages
              when available. The Escape key closes any open modal.
            </p>
          </section>

          <section className="modal-section" aria-labelledby="help-progress-heading">
            <div className="modal-section__header">
              <h3 id="help-progress-heading">Saving progress</h3>
            </div>
            <p className="modal-section__description">
              Your encounter, loadout, and attack history persist automatically in the
              browser. Reload the page or return later to continue from where you left
              off.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const HelpModal: FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return <HelpModalContent onClose={onClose} />;
};
