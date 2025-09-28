import type { FC } from 'react';

import type { useBuildConfiguration } from '../../features/build-config/useBuildConfiguration';
import { TargetSelector } from './TargetSelector';
import { SequenceSelector } from './SequenceSelector';

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
