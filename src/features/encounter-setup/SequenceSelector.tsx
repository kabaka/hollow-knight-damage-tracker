import { useId, type FC } from 'react';

import type { useBuildConfiguration } from '../build-config/useBuildConfiguration';

export type SequenceSelectorProps = {
  readonly title: string;
  readonly description: string;
  readonly placeholder: string;
  readonly bossSequences: ReturnType<typeof useBuildConfiguration>['bossSequences'];
  readonly sequenceSelectValue: string;
  readonly onSequenceChange: (value: string) => void;
  readonly sequenceEntries: ReturnType<typeof useBuildConfiguration>['sequenceEntries'];
  readonly cappedSequenceIndex: number;
  readonly onStageSelect: (index: number) => void;
};

export const SequenceSelector: FC<SequenceSelectorProps> = ({
  title,
  description,
  placeholder,
  bossSequences,
  sequenceSelectValue,
  onSequenceChange,
  sequenceEntries,
  cappedSequenceIndex,
  onStageSelect,
}) => {
  const headingId = useId();
  const descriptionId = useId();
  const selectId = useId();

  return (
    <section
      className="sequence-selector"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      <div className="sequence-selector__header">
        <div className="sequence-selector__heading">
          <h3 id={headingId}>{title}</h3>
          <p id={descriptionId} className="sequence-selector__description">
            {description}
          </p>
        </div>
      </div>
      <label className="sequence-selector__field" htmlFor={selectId}>
        <span className="sequence-selector__field-label">Sequence</span>
        <select
          id={selectId}
          value={sequenceSelectValue}
          onChange={(event) => onSequenceChange(event.target.value)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
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
          Select a sequence to populate the stage tracker.
        </p>
      )}
    </section>
  );
};
