import { useEffect, useMemo, useState, type FC } from 'react';

import { AttackLogPanel } from '../features/attack-log/AttackLogPanel';
import { PlayerConfigModal } from '../features/build-config/PlayerConfigModal';
import { useBuildConfiguration } from '../features/build-config/useBuildConfiguration';
import { CombatStatsPanel } from '../features/combat-stats/CombatStatsPanel';
import {
  CUSTOM_BOSS_ID,
  FightStateProvider,
  useFightDerivedStats,
} from '../features/fight-state/FightStateContext';

type EncounterBrandProps = {
  readonly onOpenModal: () => void;
};

const EncounterBrand: FC<EncounterBrandProps> = ({ onOpenModal }) => (
  <div className="hud-brand">
    <div className="hud-brand__copy">
      <h1 className="hud-brand__title">Hollow Knight Damage Tracker</h1>
      <p className="hud-brand__subtitle">
        Plan your build, log every strike, and monitor fight-ending stats in real time.
      </p>
    </div>
    <div className="hud-brand__actions">
      <button type="button" className="header-button" onClick={onOpenModal}>
        Player Loadout
      </button>
    </div>
  </div>
);

type StageTimelineProps = {
  readonly bossSequences: ReturnType<typeof useBuildConfiguration>['bossSequences'];
  readonly sequenceSelectValue: string;
  readonly onSequenceChange: (value: string) => void;
  readonly isSequenceActive: boolean;
  readonly sequenceEntries: ReturnType<typeof useBuildConfiguration>['sequenceEntries'];
  readonly cappedSequenceIndex: number;
  readonly onStageSelect: (index: number) => void;
  readonly onAdvance: () => void;
  readonly onRewind: () => void;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
};

const StageTimeline: FC<StageTimelineProps> = ({
  bossSequences,
  sequenceSelectValue,
  onSequenceChange,
  isSequenceActive,
  sequenceEntries,
  cappedSequenceIndex,
  onStageSelect,
  onAdvance,
  onRewind,
  hasNext,
  hasPrevious,
}) => (
  <section className="stage-timeline" aria-label="Stage navigation">
    <label className="stage-timeline__select">
      <span className="stage-timeline__label">Encounter</span>
      <select
        value={sequenceSelectValue}
        onChange={(event) => onSequenceChange(event.target.value)}
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
      <div className="stage-timeline__rail">
        <button
          type="button"
          className="stage-timeline__nav"
          onClick={onRewind}
          disabled={!hasPrevious}
          aria-keyshortcuts="["
        >
          Prev
        </button>
        <ol className="stage-timeline__stages">
          {sequenceEntries.map((entry, index) => {
            const isCurrent = index === cappedSequenceIndex;
            return (
              <li key={entry.id} className="stage-timeline__stage">
                <button
                  type="button"
                  onClick={() => onStageSelect(index)}
                  className="stage-timeline__stage-button"
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-pressed={isCurrent}
                >
                  <span className="stage-timeline__stage-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="stage-timeline__stage-name">
                    {entry.target.bossName}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className="stage-timeline__nav"
          onClick={onAdvance}
          disabled={!hasNext}
          aria-keyshortcuts="]"
        >
          Next
        </button>
      </div>
    ) : (
      <p className="stage-timeline__empty" aria-live="polite">
        Practice a single target or switch to a Godhome sequence to plan multi-fight runs.
      </p>
    )}
  </section>
);

type TargetScoreboardProps = {
  readonly targetHp: number;
  readonly totalDamage: number;
  readonly remainingHp: number;
  readonly currentStageName: string | null;
  readonly arenaName: string | null;
};

const TargetScoreboard: FC<TargetScoreboardProps> = ({
  targetHp,
  totalDamage,
  remainingHp,
  currentStageName,
  arenaName,
}) => {
  const metrics = useMemo(
    () =>
      [
        { label: 'Target HP', value: targetHp.toLocaleString() },
        { label: 'Damage Logged', value: totalDamage.toLocaleString() },
        { label: 'Remaining', value: remainingHp.toLocaleString() },
        currentStageName
          ? { label: 'Current Stage', value: currentStageName }
          : arenaName
            ? { label: 'Arena', value: arenaName }
            : null,
      ].filter((metric): metric is { label: string; value: string } => metric !== null),
    [arenaName, currentStageName, remainingHp, targetHp, totalDamage],
  );

  return (
    <section className="target-scoreboard" aria-live="polite">
      {metrics.map((metric) => (
        <div key={metric.label} className="scoreboard-metric">
          <span className="scoreboard-metric__label">{metric.label}</span>
          <span className="scoreboard-metric__value">{metric.value}</span>
        </div>
      ))}
    </section>
  );
};

type TargetSelectorProps = {
  readonly bosses: ReturnType<typeof useBuildConfiguration>['bosses'];
  readonly bossSelectValue: string;
  readonly onBossChange: (value: string) => void;
  readonly isSequenceActive: boolean;
  readonly selectedBoss: ReturnType<typeof useBuildConfiguration>['selectedBoss'];
  readonly selectedBossId: string | null;
  readonly onBossVersionChange: (value: string) => void;
  readonly selectedTarget: ReturnType<typeof useBuildConfiguration>['selectedTarget'];
  readonly selectedVersion: ReturnType<typeof useBuildConfiguration>['selectedVersion'];
  readonly customTargetHp: number;
  readonly onCustomHpChange: (value: string) => void;
};

const TargetSelector: FC<TargetSelectorProps> = ({
  bosses,
  bossSelectValue,
  onBossChange,
  isSequenceActive,
  selectedBoss,
  selectedBossId,
  onBossVersionChange,
  selectedTarget,
  selectedVersion,
  customTargetHp,
  onCustomHpChange,
}) => {
  const [isOptionsOpen, setOptionsOpen] = useState(false);
  const toggleOptions = () => setOptionsOpen((open) => !open);

  useEffect(() => {
    if (selectedBossId === CUSTOM_BOSS_ID) {
      setOptionsOpen(true);
    }
  }, [selectedBossId]);

  return (
    <section className="target-selector" aria-label="Target selection">
      <div className="target-selector__primary">
        <div className="target-selector__header">
          <span className="target-selector__label">Boss target</span>
          <button
            type="button"
            className="target-selector__options-toggle"
            onClick={toggleOptions}
            aria-expanded={isOptionsOpen}
            aria-controls="target-advanced-options"
          >
            ⚙️
            <span className="sr-only">Advanced target options</span>
          </button>
        </div>
        <div
          className="segmented-control"
          role="radiogroup"
          aria-label="Boss target"
          aria-disabled={isSequenceActive}
        >
          {bosses.map((boss) => {
            const isSelected = bossSelectValue === boss.id;
            return (
              <button
                key={boss.id}
                type="button"
                className="segmented-control__option"
                data-selected={isSelected}
                onClick={() => onBossChange(boss.id)}
                disabled={isSequenceActive}
                role="radio"
                aria-checked={isSelected}
              >
                {boss.name}
              </button>
            );
          })}
          <button
            type="button"
            className="segmented-control__option"
            data-selected={bossSelectValue === CUSTOM_BOSS_ID}
            onClick={() => onBossChange(CUSTOM_BOSS_ID)}
            disabled={isSequenceActive}
            role="radio"
            aria-checked={bossSelectValue === CUSTOM_BOSS_ID}
          >
            Custom
          </button>
        </div>
      </div>

      <div
        id="target-advanced-options"
        className="target-selector__tray"
        hidden={!isOptionsOpen}
      >
        {!isSequenceActive && selectedBoss && selectedBossId !== CUSTOM_BOSS_ID ? (
          <label className="target-selector__field">
            <span className="target-selector__field-label">Boss version</span>
            <select
              value={selectedBossId ?? ''}
              onChange={(event) => onBossVersionChange(event.target.value)}
            >
              {selectedBoss.versions.map((version) => (
                <option key={version.targetId} value={version.targetId}>
                  {`${version.title} • ${version.hp.toLocaleString()} HP`}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!isSequenceActive && selectedBossId === CUSTOM_BOSS_ID ? (
          <label className="target-selector__field" htmlFor="custom-target-hp">
            <span className="target-selector__field-label">Custom target HP</span>
            <input
              id="custom-target-hp"
              type="number"
              min={1}
              step={10}
              value={customTargetHp}
              onChange={(event) => onCustomHpChange(event.target.value)}
            />
          </label>
        ) : null}

        {selectedTarget && selectedVersion ? (
          <div className="target-selector__summary">
            <span className="target-selector__summary-title">Active target</span>
            <span className="target-selector__summary-value">
              {selectedTarget.bossName}
            </span>
            <span className="target-selector__summary-meta">{selectedVersion.title}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
};

type HeaderBarProps = {
  readonly onOpenModal: () => void;
};

const HeaderBar: FC<HeaderBarProps> = ({ onOpenModal }) => {
  const {
    bosses,
    selectedBossId,
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
  } = useBuildConfiguration();
  const derived = useFightDerivedStats();

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

  const arenaName = selectedTarget?.location ?? null;

  return (
    <div className="encounter-header">
      <div className="encounter-hud">
        <EncounterBrand onOpenModal={onOpenModal} />
        <StageTimeline
          bossSequences={bossSequences}
          sequenceSelectValue={sequenceSelectValue}
          onSequenceChange={handleSequenceChange}
          isSequenceActive={isSequenceActive}
          sequenceEntries={sequenceEntries}
          cappedSequenceIndex={cappedSequenceIndex}
          onStageSelect={handleSequenceStageChange}
          onAdvance={handleAdvanceSequence}
          onRewind={handleRewindSequence}
          hasNext={hasNextSequenceStage}
          hasPrevious={hasPreviousSequenceStage}
        />
        <TargetScoreboard
          targetHp={derived.targetHp}
          totalDamage={derived.totalDamage}
          remainingHp={derived.remainingHp}
          currentStageName={currentSequenceEntry?.target.bossName ?? null}
          arenaName={arenaName}
        />
      </div>

      <TargetSelector
        bosses={bosses}
        bossSelectValue={bossSelectValue}
        onBossChange={handleBossChange}
        isSequenceActive={isSequenceActive}
        selectedBoss={selectedBoss}
        selectedBossId={selectedBossId}
        onBossVersionChange={handleBossVersionChange}
        selectedTarget={selectedTarget}
        selectedVersion={selectedVersion}
        customTargetHp={customTargetHp}
        onCustomHpChange={handleCustomHpChange}
      />

      {activeSequence && activeSequence.conditions.length > 0 ? (
        <section className="sequence-conditions-panel">
          <h4 className="sequence-conditions-panel__title">Sequence conditions</h4>
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
        </section>
      ) : null}
    </div>
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
