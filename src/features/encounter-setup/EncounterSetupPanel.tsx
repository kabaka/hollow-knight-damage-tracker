import { useEffect, useId, useMemo, useState, type FC } from 'react';

import type { useBuildConfiguration } from '../build-config/useBuildConfiguration';
import { TargetSelector } from './TargetSelector';
import { SequenceSelector } from './SequenceSelector';

const SINGLE_TARGET_MODE = 'single-target';
const SEQUENCE_MODE = 'sequence';

type EncounterMode = typeof SINGLE_TARGET_MODE | typeof SEQUENCE_MODE;

const MODE_COPY: Record<EncounterMode, { title: string; description: string }> = {
  [SINGLE_TARGET_MODE]: {
    title: 'Single target encounter',
    description:
      'Choose any boss or configure a custom HP goal to focus on one encounter at a time.',
  },
  [SEQUENCE_MODE]: {
    title: 'Sequence run',
    description:
      'Run through multi-fight Godhome sequences with automatic stage tracking and conditions.',
  },
};

export type EncounterSetupPanelProps = {
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

export const EncounterSetupPanel: FC<EncounterSetupPanelProps> = ({
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
}) => {
  const [mode, setMode] = useState<EncounterMode>(
    sequenceSelectValue ? SEQUENCE_MODE : SINGLE_TARGET_MODE,
  );
  const singleTargetPanelId = useId();
  const sequencePanelId = useId();
  const modeTablistId = useId();

  useEffect(() => {
    const derivedMode = sequenceSelectValue ? SEQUENCE_MODE : SINGLE_TARGET_MODE;
    setMode((current) => (current === derivedMode ? current : derivedMode));
  }, [sequenceSelectValue]);

  const handleModeChange = (nextMode: EncounterMode) => {
    setMode(nextMode);
    if (nextMode === SINGLE_TARGET_MODE && sequenceSelectValue !== '') {
      onSequenceChange('');
    }
  };

  const modeTabs = useMemo(
    () => [
      {
        id: `${singleTargetPanelId}-tab`,
        value: SINGLE_TARGET_MODE as EncounterMode,
        label: 'Single target',
        controls: singleTargetPanelId,
      },
      {
        id: `${sequencePanelId}-tab`,
        value: SEQUENCE_MODE as EncounterMode,
        label: 'Sequence run',
        controls: sequencePanelId,
      },
    ],
    [sequencePanelId, singleTargetPanelId],
  );

  return (
    <section
      id="encounter-setup"
      className="encounter-setup"
      aria-label="Encounter setup"
      hidden={!isOpen}
    >
      <div className="encounter-setup__mode-toggle">
        <span id={modeTablistId} className="encounter-setup__mode-label">
          Encounter mode
        </span>
        <div
          className="encounter-setup__mode-segments"
          role="tablist"
          aria-labelledby={modeTablistId}
        >
          {modeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              id={tab.id}
              role="tab"
              className="encounter-setup__mode-button"
              aria-selected={mode === tab.value}
              aria-controls={tab.controls}
              onClick={() => handleModeChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="encounter-setup__grid">
        <section
          id={singleTargetPanelId}
          role="tabpanel"
          aria-labelledby={`${singleTargetPanelId}-tab`}
          hidden={mode !== SINGLE_TARGET_MODE}
        >
          <TargetSelector
            title={MODE_COPY[SINGLE_TARGET_MODE].title}
            description={MODE_COPY[SINGLE_TARGET_MODE].description}
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
        </section>

        <section
          id={sequencePanelId}
          role="tabpanel"
          aria-labelledby={`${sequencePanelId}-tab`}
          hidden={mode !== SEQUENCE_MODE}
        >
          <SequenceSelector
            title={MODE_COPY[SEQUENCE_MODE].title}
            description={MODE_COPY[SEQUENCE_MODE].description}
            placeholder="Select a Godhome sequence"
            bossSequences={bossSequences}
            sequenceSelectValue={sequenceSelectValue}
            onSequenceChange={onSequenceChange}
            sequenceEntries={sequenceEntries}
            cappedSequenceIndex={cappedSequenceIndex}
            onStageSelect={onStageSelect}
          />
        </section>
      </div>

      {mode === SEQUENCE_MODE &&
      activeSequence &&
      activeSequence.conditions.length > 0 ? (
        <section
          className="sequence-conditions"
          aria-label="Sequence conditions"
          role="group"
        >
          <h4 className="sequence-conditions__title">Sequence conditions</h4>
          <div className="sequence-conditions__grid">
            {activeSequence.conditions.map((condition) => {
              const isEnabled = sequenceConditionValues[condition.id];
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
};
