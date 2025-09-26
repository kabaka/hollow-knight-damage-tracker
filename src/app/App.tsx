import { useEffect, useState, type FC } from 'react';

import { AttackLogPanel } from '../features/attack-log/AttackLogPanel';
import { PlayerConfigModal } from '../features/build-config/PlayerConfigModal';
import { useBuildConfiguration } from '../features/build-config/useBuildConfiguration';
import { CombatStatsPanel } from '../features/combat-stats/CombatStatsPanel';
import {
  CUSTOM_BOSS_ID,
  FightStateProvider,
} from '../features/fight-state/FightStateContext';

type HeaderBarProps = {
  readonly onOpenModal: () => void;
};

const HeaderBar: FC<HeaderBarProps> = ({ onOpenModal }) => {
  const {
    state,
    bosses,
    bossSelectValue,
    handleBossChange,
    bossSequences,
    sequenceSelectValue,
    handleSequenceChange,
    sequenceEntries,
    cappedSequenceIndex,
    handleSequenceStageChange,
    hasNextSequenceStage,
    hasPreviousSequenceStage,
    handleAdvanceSequence,
    handleRewindSequence,
    currentSequenceEntry,
    isSequenceActive,
    selectedTarget,
    selectedBoss,
    selectedVersion,
    handleBossVersionChange,
    customTargetHp,
    handleCustomHpChange,
    activeSequence,
    sequenceConditionValues,
    handleSequenceConditionToggle,
    derived,
  } = useBuildConfiguration();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, select, textarea, [contenteditable="true"]')) {
        return;
      }

      if (event.key === '[') {
        if (hasPreviousSequenceStage) {
          event.preventDefault();
          handleRewindSequence();
        }
      } else if (event.key === ']') {
        if (hasNextSequenceStage) {
          event.preventDefault();
          handleAdvanceSequence();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleAdvanceSequence,
    handleRewindSequence,
    hasNextSequenceStage,
    hasPreviousSequenceStage,
  ]);

  return (
    <header className="app-header">
      <div className="app-header__top">
        <div className="app-header__brand">
          <h1 className="app-header__title">Hollow Knight Damage Tracker</h1>
          <p className="app-header__subtitle">
            Plan your build, log every strike, and monitor fight-ending stats in real
            time.
          </p>
        </div>
        <div className="app-header__actions">
          <button type="button" className="header-button" onClick={onOpenModal}>
            Player Loadout
          </button>
        </div>
      </div>

      <div className="app-header__filters" role="group" aria-label="Encounter selection">
        <div className="header-stack">
          <label className="header-field">
            <span className="header-field__label">Boss sequence</span>
            <select
              value={sequenceSelectValue}
              onChange={(event) => handleSequenceChange(event.target.value)}
            >
              <option value="">Single target practice</option>
              {bossSequences.map((sequence) => (
                <option key={sequence.id} value={sequence.id}>
                  {sequence.name}
                </option>
              ))}
            </select>
          </label>

          {isSequenceActive ? (
            <div
              className="sequence-toolbar"
              role="group"
              aria-label="Sequence navigation"
            >
              <button
                type="button"
                className="sequence-toolbar__button"
                onClick={handleRewindSequence}
                disabled={!hasPreviousSequenceStage}
                aria-keyshortcuts="["
              >
                Prev
              </button>
              <label className="header-field header-field--compact">
                <span className="header-field__label">Stage</span>
                <select
                  value={String(cappedSequenceIndex)}
                  onChange={(event) =>
                    handleSequenceStageChange(Number(event.target.value))
                  }
                >
                  {sequenceEntries.map((entry, index) => (
                    <option key={entry.id} value={index}>
                      {`${String(index + 1).padStart(2, '0')} • ${entry.target.bossName}`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="sequence-toolbar__button"
                onClick={handleAdvanceSequence}
                disabled={!hasNextSequenceStage}
                aria-keyshortcuts="]"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>

        <div className="header-stack">
          <label className="header-field">
            <span className="header-field__label">Boss target</span>
            <select
              id="boss-target"
              value={bossSelectValue}
              onChange={(event) => handleBossChange(event.target.value)}
              disabled={isSequenceActive}
            >
              {bosses.map((boss) => (
                <option key={boss.id} value={boss.id}>
                  {boss.name}
                </option>
              ))}
              <option value={CUSTOM_BOSS_ID}>Custom target</option>
            </select>
          </label>

          {!isSequenceActive &&
          selectedBoss &&
          state.selectedBossId !== CUSTOM_BOSS_ID ? (
            <label className="header-field">
              <span className="header-field__label">Boss version</span>
              <select
                value={state.selectedBossId}
                onChange={(event) => handleBossVersionChange(event.target.value)}
              >
                {selectedBoss.versions.map((version) => (
                  <option key={version.targetId} value={version.targetId}>
                    {`${version.title} • ${version.hp.toLocaleString()} HP`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {!isSequenceActive && state.selectedBossId === CUSTOM_BOSS_ID ? (
            <label className="header-field" htmlFor="custom-target-hp">
              <span className="header-field__label">Custom target HP</span>
              <input
                id="custom-target-hp"
                type="number"
                min={1}
                step={10}
                value={customTargetHp}
                onChange={(event) => handleCustomHpChange(event.target.value)}
              />
            </label>
          ) : null}

          {selectedTarget && selectedVersion ? (
            <div className="header-summary" aria-live="polite">
              <span className="header-summary__title">Active target</span>
              <span className="header-summary__value">{selectedTarget.bossName}</span>
              <span className="header-summary__meta">{selectedVersion.title}</span>
            </div>
          ) : null}
        </div>
      </div>

      {activeSequence && activeSequence.conditions.length > 0 ? (
        <div className="app-header__conditions">
          <h4 className="app-header__conditions-title">Sequence conditions</h4>
          <div
            className="sequence-conditions"
            role="group"
            aria-label="Sequence conditions"
          >
            {activeSequence.conditions.map((condition) => {
              const checkboxId = `${activeSequence.id}-${condition.id}`;
              const isEnabled = sequenceConditionValues[condition.id] ?? false;
              return (
                <label key={condition.id} className="sequence-condition">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(event) =>
                      handleSequenceConditionToggle(condition.id, event.target.checked)
                    }
                  />
                  <span>
                    <span className="sequence-condition__label">{condition.label}</span>
                    {condition.description ? (
                      <span className="sequence-condition__description">
                        {condition.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="app-header__summary" aria-live="polite">
        <div className="summary-tile">
          <span className="summary-tile__label">Target HP</span>
          <span className="summary-tile__value">{derived.targetHp.toLocaleString()}</span>
        </div>
        <div className="summary-tile">
          <span className="summary-tile__label">Damage Logged</span>
          <span className="summary-tile__value">
            {derived.totalDamage.toLocaleString()}
          </span>
        </div>
        <div className="summary-tile">
          <span className="summary-tile__label">Remaining</span>
          <span className="summary-tile__value">
            {derived.remainingHp.toLocaleString()}
          </span>
        </div>
        {currentSequenceEntry ? (
          <div className="summary-tile">
            <span className="summary-tile__label">Current Stage</span>
            <span className="summary-tile__value">
              {currentSequenceEntry.target.bossName}
            </span>
          </div>
        ) : selectedTarget ? (
          <div className="summary-tile">
            <span className="summary-tile__label">Arena</span>
            <span className="summary-tile__value">{selectedTarget.location}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
};

const AppContent: FC = () => {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <div className="app-shell">
      <HeaderBar onOpenModal={() => setModalOpen(true)} />
      <main className="app-main">
        <section className="app-panel" aria-labelledby="attack-log-heading">
          <div className="app-panel__header">
            <h2 id="attack-log-heading">Attack Log</h2>
            <p className="app-panel__description">
              Record each strike to reduce the boss health target. Buttons support
              keyboard shortcuts for fast practice reps.
            </p>
          </div>
          <div className="app-panel__body">
            <AttackLogPanel />
          </div>
        </section>
        <section
          className="app-panel app-panel--stats"
          aria-labelledby="combat-stats-heading"
        >
          <div className="app-panel__header">
            <h2 id="combat-stats-heading">Combat Overview</h2>
            <p className="app-panel__description">
              Track your progress and efficiency throughout the encounter.
            </p>
          </div>
          <div className="app-panel__body">
            <CombatStatsPanel />
          </div>
        </section>
      </main>
      <PlayerConfigModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

export const App: FC = () => (
  <FightStateProvider>
    <AppContent />
  </FightStateProvider>
);
