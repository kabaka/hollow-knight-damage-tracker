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

const formatNumber = (value: number) => value.toLocaleString();

const formatDecimal = (value: number | null, fractionDigits = 1) => {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
};

type StageTimelineProps = {
  readonly stageLabel: string | null;
  readonly stageProgress: { current: number; total: number } | null;
  readonly onAdvance: () => void;
  readonly onRewind: () => void;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
};

const StageTimeline: FC<StageTimelineProps> = ({
  stageLabel,
  stageProgress,
  onAdvance,
  onRewind,
  hasNext,
  hasPrevious,
}) => {
  if (!stageProgress) {
    return null;
  }

  const stageTitle = stageLabel ?? 'Current stage';
  const stagePosition = `${stageProgress.current}/${stageProgress.total}`;

  return (
    <div
      className="hud-timeline summary-chip summary-chip--toolbar"
      role="group"
      aria-label="Stage navigation"
    >
      <button
        type="button"
        className="hud-timeline__control"
        onClick={onRewind}
        disabled={!hasPrevious}
      >
        <span aria-hidden="true">‹</span>
        <span className="sr-only">Previous stage</span>
      </button>
      <span className="hud-timeline__label" aria-live="polite">
        <span className="hud-timeline__title">{stageTitle}</span>
        <span className="hud-timeline__progress">{stagePosition}</span>
      </span>
      <button
        type="button"
        className="hud-timeline__control"
        onClick={onAdvance}
        disabled={!hasNext}
      >
        <span aria-hidden="true">›</span>
        <span className="sr-only">Next stage</span>
      </button>
    </div>
  );
};

type EncounterBrandProps = {
  readonly encounterName: string;
  readonly versionLabel: string | null;
  readonly arenaLabel: string | null;
};

const EncounterBrand: FC<EncounterBrandProps> = ({
  encounterName,
  versionLabel,
  arenaLabel,
}) => (
  <div className="hud-brand" aria-live="polite">
    <h1 className="hud-brand__title">Hollow Knight Damage Tracker</h1>
    <div className="hud-brand__context">
      <span className="hud-brand__divider" aria-hidden="true">
        ◆
      </span>
      <span className="hud-brand__encounter">
        {encounterName}
        {versionLabel ? (
          <span className="hud-brand__version">({versionLabel})</span>
        ) : null}
      </span>
      {arenaLabel ? (
        <>
          <span className="hud-brand__divider" aria-hidden="true">
            ◆
          </span>
          <span className="hud-brand__arena">{arenaLabel}</span>
        </>
      ) : null}
    </div>
  </div>
);

type TargetScoreboardProps = {
  readonly derived: ReturnType<typeof useFightDerivedStats>;
};

const TargetScoreboard: FC<TargetScoreboardProps> = ({ derived }) => {
  const { targetHp, remainingHp, totalDamage, attacksLogged, averageDamage, dps } =
    derived;
  const percentRemaining = targetHp > 0 ? Math.max(0, remainingHp / targetHp) : 0;

  const metrics = useMemo(
    () => [
      { label: 'Damage', value: formatNumber(totalDamage) },
      { label: 'Attacks', value: formatNumber(attacksLogged) },
      { label: 'Avg Hit', value: formatDecimal(averageDamage) },
      { label: 'DPS', value: formatDecimal(dps) },
    ],
    [attacksLogged, averageDamage, dps, totalDamage],
  );

  return (
    <section className="hud-scoreboard" aria-label="Encounter scoreboard">
      <div
        className="hud-health summary-chip summary-chip--accent"
        role="group"
        aria-label="Boss HP"
      >
        <span className="hud-health__label">HP</span>
        <div
          className="hud-health__track"
          role="progressbar"
          aria-label="Boss HP"
          aria-valuemin={0}
          aria-valuemax={targetHp}
          aria-valuenow={remainingHp}
        >
          <div
            className="hud-health__fill"
            style={{ width: `${Math.round(percentRemaining * 100)}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="hud-health__value">
          {formatNumber(remainingHp)} / {formatNumber(targetHp)}
        </span>
      </div>
      <dl className="hud-metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className="hud-metrics__item">
            <dt className="hud-metrics__label">{metric.label}</dt>
            <dd className="hud-metrics__value">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

type HeaderBarProps = {
  readonly derived: ReturnType<typeof useFightDerivedStats>;
  readonly encounterName: string;
  readonly versionLabel: string | null;
  readonly arenaLabel: string | null;
  readonly onToggleSetup: () => void;
  readonly onOpenLoadout: () => void;
  readonly isSetupOpen: boolean;
  readonly stageLabel: string | null;
  readonly stageProgress: { current: number; total: number } | null;
  readonly onAdvanceStage: () => void;
  readonly onRewindStage: () => void;
  readonly hasNextStage: boolean;
  readonly hasPreviousStage: boolean;
};

const HeaderBar: FC<HeaderBarProps> = ({
  derived,
  encounterName,
  versionLabel,
  arenaLabel,
  onToggleSetup,
  onOpenLoadout,
  isSetupOpen,
  stageLabel,
  stageProgress,
  onAdvanceStage,
  onRewindStage,
  hasNextStage,
  hasPreviousStage,
}) => (
  <header className="encounter-hud app-navbar" role="banner">
    <div className="encounter-hud__primary">
      <EncounterBrand
        encounterName={encounterName}
        versionLabel={versionLabel}
        arenaLabel={arenaLabel}
      />
      <StageTimeline
        stageLabel={stageLabel}
        stageProgress={stageProgress}
        onAdvance={onAdvanceStage}
        onRewind={onRewindStage}
        hasNext={hasNextStage}
        hasPrevious={hasPreviousStage}
      />
      <div className="hud-actions">
        <button
          type="button"
          className="hud-actions__button"
          onClick={onToggleSetup}
          aria-expanded={isSetupOpen}
          aria-controls="encounter-setup"
        >
          <span aria-hidden="true">⚙️</span>
          <span className="hud-actions__label">Change encounter</span>
        </button>
        <button type="button" className="hud-actions__button" onClick={onOpenLoadout}>
          <span aria-hidden="true">👤</span>
          <span className="hud-actions__label">Player loadout</span>
        </button>
      </div>
    </div>
    <TargetScoreboard derived={derived} />
  </header>
);

type TargetSelectorProps = {
  readonly bosses: ReturnType<typeof useBuildConfiguration>['bosses'];
  readonly bossSelectValue: string;
  readonly onBossChange: (value: string) => void;
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
  selectedBoss,
  selectedBossId,
  onBossVersionChange,
  selectedTarget,
  selectedVersion,
  customTargetHp,
  onCustomHpChange,
}) => {
  const [isOptionsOpen, setOptionsOpen] = useState(false);
  const [customHpDraft, setCustomHpDraft] = useState(() => customTargetHp.toString());

  useEffect(() => {
    if (selectedBossId === CUSTOM_BOSS_ID) {
      setOptionsOpen(true);
    }
  }, [selectedBossId]);

  useEffect(() => {
    setCustomHpDraft(customTargetHp.toString());
  }, [customTargetHp]);

  const handleCustomHpDraftChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setCustomHpDraft(sanitized);
    if (sanitized !== '') {
      onCustomHpChange(sanitized);
    }
  };

  return (
    <section className="target-selector" aria-labelledby="target-selector-heading">
      <div className="target-selector__header">
        <h3 id="target-selector-heading">Boss target</h3>
        <button
          type="button"
          className="target-selector__options-toggle"
          onClick={() => setOptionsOpen((open) => !open)}
          aria-expanded={isOptionsOpen}
          aria-controls="target-selector-options"
        >
          ⚙️
          <span className="sr-only">Toggle advanced target options</span>
        </button>
      </div>
      <div className="segmented-control" role="radiogroup" aria-label="Boss target">
        {bosses.map((boss) => {
          const isSelected = bossSelectValue === boss.id;
          return (
            <button
              key={boss.id}
              type="button"
              className="segmented-control__option"
              data-selected={isSelected}
              onClick={() => onBossChange(boss.id)}
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
          role="radio"
          aria-checked={bossSelectValue === CUSTOM_BOSS_ID}
        >
          Custom
        </button>
      </div>
      <div
        id="target-selector-options"
        className="target-selector__tray"
        hidden={!isOptionsOpen}
      >
        {selectedBoss && selectedBossId !== CUSTOM_BOSS_ID ? (
          <label className="target-selector__field">
            <span className="target-selector__field-label">Boss version</span>
            <select
              value={selectedTarget?.id ?? selectedBoss.versions[0]?.targetId ?? ''}
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

        {selectedBossId === CUSTOM_BOSS_ID ? (
          <label className="target-selector__field" htmlFor="custom-target-hp">
            <span className="target-selector__field-label">Custom target HP</span>
            <input
              id="custom-target-hp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={customHpDraft}
              onChange={(event) => handleCustomHpDraftChange(event.target.value)}
              onBlur={() => {
                if (customHpDraft === '') {
                  setCustomHpDraft(customTargetHp.toString());
                }
              }}
            />
          </label>
        ) : null}

        {selectedTarget && selectedVersion ? (
          <div className="target-selector__summary summary-chip">
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

type SequenceSelectorProps = {
  readonly bossSequences: ReturnType<typeof useBuildConfiguration>['bossSequences'];
  readonly sequenceSelectValue: string;
  readonly onSequenceChange: (value: string) => void;
  readonly sequenceEntries: ReturnType<typeof useBuildConfiguration>['sequenceEntries'];
  readonly cappedSequenceIndex: number;
  readonly onStageSelect: (index: number) => void;
};

const SequenceSelector: FC<SequenceSelectorProps> = ({
  bossSequences,
  sequenceSelectValue,
  onSequenceChange,
  sequenceEntries,
  cappedSequenceIndex,
  onStageSelect,
}) => (
  <section className="sequence-selector" aria-labelledby="sequence-selector-heading">
    <div className="sequence-selector__header">
      <h3 id="sequence-selector-heading">Encounter stage</h3>
    </div>
    <label className="sequence-selector__field">
      <span className="sequence-selector__field-label">Mode</span>
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
    {sequenceEntries.length > 0 ? (
      <ol className="sequence-selector__stages">
        {sequenceEntries.map((entry, index) => {
          const isCurrent = index === cappedSequenceIndex;
          return (
            <li key={entry.id}>
              <button
                type="button"
                className="sequence-selector__stage"
                onClick={() => onStageSelect(index)}
                aria-current={isCurrent ? 'true' : undefined}
              >
                <span className="sequence-selector__stage-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="sequence-selector__stage-name">
                  {entry.target.bossName}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    ) : (
      <p className="sequence-selector__empty" aria-live="polite">
        Select a Godhome sequence to practice multi-fight runs.
      </p>
    )}
  </section>
);

type EncounterSetupPanelProps = {
  readonly isOpen: boolean;
  readonly bosses: ReturnType<typeof useBuildConfiguration>['bosses'];
  readonly bossSelectValue: string;
  readonly onBossChange: (value: string) => void;
  readonly selectedBoss: ReturnType<typeof useBuildConfiguration>['selectedBoss'];
  readonly selectedBossId: string | null;
  readonly onBossVersionChange: (value: string) => void;
  readonly selectedTarget: ReturnType<typeof useBuildConfiguration>['selectedTarget'];
  readonly selectedVersion: ReturnType<typeof useBuildConfiguration>['selectedVersion'];
  readonly customTargetHp: number;
  readonly onCustomHpChange: (value: string) => void;
  readonly bossSequences: ReturnType<typeof useBuildConfiguration>['bossSequences'];
  readonly sequenceSelectValue: string;
  readonly onSequenceChange: (value: string) => void;
  readonly sequenceEntries: ReturnType<typeof useBuildConfiguration>['sequenceEntries'];
  readonly cappedSequenceIndex: number;
  readonly onStageSelect: (index: number) => void;
  readonly activeSequence: ReturnType<typeof useBuildConfiguration>['activeSequence'];
  readonly sequenceConditionValues: ReturnType<
    typeof useBuildConfiguration
  >['sequenceConditionValues'];
  readonly onConditionToggle: (conditionId: string, enabled: boolean) => void;
};

const EncounterSetupPanel: FC<EncounterSetupPanelProps> = ({
  isOpen,
  bosses,
  bossSelectValue,
  onBossChange,
  selectedBoss,
  selectedBossId,
  onBossVersionChange,
  selectedTarget,
  selectedVersion,
  customTargetHp,
  onCustomHpChange,
  bossSequences,
  sequenceSelectValue,
  onSequenceChange,
  sequenceEntries,
  cappedSequenceIndex,
  onStageSelect,
  activeSequence,
  sequenceConditionValues,
  onConditionToggle,
}) => (
  <section
    id="encounter-setup"
    className="encounter-setup"
    aria-label="Encounter setup"
    hidden={!isOpen}
  >
    <div className="encounter-setup__grid">
      <TargetSelector
        bosses={bosses}
        bossSelectValue={bossSelectValue}
        onBossChange={onBossChange}
        selectedBoss={selectedBoss}
        selectedBossId={selectedBossId}
        onBossVersionChange={onBossVersionChange}
        selectedTarget={selectedTarget}
        selectedVersion={selectedVersion}
        customTargetHp={customTargetHp}
        onCustomHpChange={onCustomHpChange}
      />
      <SequenceSelector
        bossSequences={bossSequences}
        sequenceSelectValue={sequenceSelectValue}
        onSequenceChange={onSequenceChange}
        sequenceEntries={sequenceEntries}
        cappedSequenceIndex={cappedSequenceIndex}
        onStageSelect={onStageSelect}
      />
    </div>
    {activeSequence && activeSequence.conditions.length > 0 ? (
      <section
        className="sequence-conditions"
        aria-label="Sequence conditions"
        role="group"
      >
        <h4 className="sequence-conditions__title">Sequence conditions</h4>
        <div className="sequence-conditions__grid">
          {activeSequence.conditions.map((condition) => {
            const isEnabled = sequenceConditionValues[condition.id] ?? false;
            return (
              <label key={condition.id} className="sequence-conditions__option">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(event) =>
                    onConditionToggle(condition.id, event.target.checked)
                  }
                />
                <span>
                  <span className="sequence-conditions__label">{condition.label}</span>
                  {condition.description ? (
                    <span className="sequence-conditions__description">
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
  </section>
);

const AppContent: FC = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSetupOpen, setSetupOpen] = useState(false);

  const {
    bosses,
    bossSelectValue,
    handleBossChange,
    selectedBoss,
    selectedBossId,
    handleBossVersionChange,
    selectedTarget,
    selectedVersion,
    customTargetHp,
    handleCustomHpChange,
    bossSequences,
    sequenceSelectValue,
    handleSequenceChange,
    sequenceEntries,
    cappedSequenceIndex,
    handleSequenceStageChange,
    handleAdvanceSequence,
    handleRewindSequence,
    hasNextSequenceStage,
    hasPreviousSequenceStage,
    activeSequence,
    sequenceConditionValues,
    handleSequenceConditionToggle,
    currentSequenceEntry,
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

  const encounterName = selectedTarget?.bossName ?? 'Custom target';
  const versionLabel = selectedVersion?.title ?? null;
  const arenaLabel = selectedTarget?.location ?? null;
  const stageProgress = activeSequence
    ? {
        current: cappedSequenceIndex + 1,
        total: sequenceEntries.length,
      }
    : null;
  const stageLabel = currentSequenceEntry?.target.bossName ?? null;

  return (
    <div className="app-shell">
      <HeaderBar
        derived={derived}
        encounterName={encounterName}
        versionLabel={versionLabel}
        arenaLabel={arenaLabel}
        onToggleSetup={() => setSetupOpen((open) => !open)}
        onOpenLoadout={() => setModalOpen(true)}
        isSetupOpen={isSetupOpen}
        stageLabel={stageLabel}
        stageProgress={stageProgress}
        onAdvanceStage={handleAdvanceSequence}
        onRewindStage={handleRewindSequence}
        hasNextStage={hasNextSequenceStage}
        hasPreviousStage={hasPreviousSequenceStage}
      />

      <EncounterSetupPanel
        isOpen={isSetupOpen}
        bosses={bosses}
        bossSelectValue={bossSelectValue}
        onBossChange={handleBossChange}
        selectedBoss={selectedBoss}
        selectedBossId={selectedBossId}
        onBossVersionChange={handleBossVersionChange}
        selectedTarget={selectedTarget}
        selectedVersion={selectedVersion}
        customTargetHp={customTargetHp}
        onCustomHpChange={handleCustomHpChange}
        bossSequences={bossSequences}
        sequenceSelectValue={sequenceSelectValue}
        onSequenceChange={handleSequenceChange}
        sequenceEntries={sequenceEntries}
        cappedSequenceIndex={cappedSequenceIndex}
        onStageSelect={handleSequenceStageChange}
        activeSequence={activeSequence}
        sequenceConditionValues={sequenceConditionValues}
        onConditionToggle={handleSequenceConditionToggle}
      />

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
