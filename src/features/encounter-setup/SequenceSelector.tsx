import type { FC } from 'react';

import type { useBuildConfiguration } from '../build-config/useBuildConfiguration';

export type SequenceSelectorProps = {
  readonly bossSequences: ReturnType<typeof useBuildConfiguration>['bossSequences'];
  readonly sequenceSelectValue: string;
  readonly onSequenceChange: (value: string) => void;
  readonly sequenceEntries: ReturnType<typeof useBuildConfiguration>['sequenceEntries'];
  readonly cappedSequenceIndex: number;
  readonly onStageSelect: (index: number) => void;
};

export const SequenceSelector: FC<SequenceSelectorProps> = ({
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
