import { useId, useMemo, type FC } from 'react';

import type { useBuildConfiguration } from '../build-config/useBuildConfiguration';

type SequenceModifier = {
  id: string;
  label: string;
  description?: string;
  defaultEnabled: boolean;
};

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
  readonly sequenceConditionValues: ReturnType<
    typeof useBuildConfiguration
  >['sequenceConditionValues'];
  readonly onConditionToggle: (conditionId: string, enabled: boolean) => void;
  readonly sequenceBindingValues: ReturnType<
    typeof useBuildConfiguration
  >['sequenceBindingValues'];
  readonly onBindingToggle: (bindingId: string, enabled: boolean) => void;
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
  sequenceConditionValues,
  onConditionToggle,
  sequenceBindingValues,
  onBindingToggle,
}) => {
  const headingId = useId();
  const descriptionId = useId();
  const radioName = useId();

  const fallbackSelectId = `${radioName}-native`;

  const groupedSequences = useMemo(() => {
    type BossSequence = SequenceSelectorProps['bossSequences'][number];
    const groups: Array<{ category: string; sequences: BossSequence[] }> = [];
    const categoryMap = new Map<string, BossSequence[]>();

    for (const sequence of bossSequences) {
      const category = sequence.category;
      let group = categoryMap.get(category);
      if (!group) {
        group = [];
        categoryMap.set(category, group);
        groups.push({ category, sequences: group });
      }
      group.push(sequence);
    }

    return groups;
  }, [bossSequences]);

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
      <div className="sequence-selector__native">
        <label className="sr-only" htmlFor={fallbackSelectId}>
          {title}
        </label>
        <select
          id={fallbackSelectId}
          className="sr-only sequence-selector__native-select"
          value={sequenceSelectValue}
          onChange={(event) => {
            onSequenceChange(event.currentTarget.value);
          }}
        >
          <option value="">{placeholder}</option>
          {bossSequences.map((sequence) => (
            <option key={sequence.id} value={sequence.id}>
              {sequence.name}
            </option>
          ))}
        </select>
      </div>
      <div
        className="sequence-selector__options"
        role="radiogroup"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
      >
        <SequenceOption
          id={`${radioName}-none`}
          name={radioName}
          title={placeholder}
          description="Preview each sequence before committing to a run."
          value=""
          isSelected={sequenceSelectValue === ''}
          onSelect={onSequenceChange}
        />
        {groupedSequences.map((group, groupIndex) => (
          <div key={group.category} className="sequence-selector__group">
            <h4 className="sequence-selector__group-title">{group.category}</h4>
            <div className="sequence-selector__group-options">
              {group.sequences.map((sequence, sequenceIndex) => {
                const optionId = `${radioName}-${groupIndex}-${sequenceIndex}`;
                const isSelected = sequenceSelectValue === sequence.id;
                return (
                  <SequenceOption
                    key={sequence.id}
                    id={optionId}
                    name={radioName}
                    title={sequence.name}
                    description={`${sequence.entries.length} stage${
                      sequence.entries.length === 1 ? '' : 's'
                    }`}
                    value={sequence.id}
                    isSelected={isSelected}
                    onSelect={onSequenceChange}
                    conditions={sequence.conditions}
                    conditionValues={sequenceConditionValues}
                    onConditionToggle={onConditionToggle}
                    bindings={sequence.bindings}
                    bindingValues={sequenceBindingValues}
                    onBindingToggle={onBindingToggle}
                    isInteractive={isSelected}
                    entries={isSelected ? sequenceEntries : undefined}
                    cappedSequenceIndex={cappedSequenceIndex}
                    onStageSelect={onStageSelect}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

type SequenceOptionProps = {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly description?: string;
  readonly value: string;
  readonly isSelected: boolean;
  readonly onSelect: (value: string) => void;
  readonly conditions?: SequenceModifier[];
  readonly conditionValues?: SequenceSelectorProps['sequenceConditionValues'];
  readonly onConditionToggle?: SequenceSelectorProps['onConditionToggle'];
  readonly bindings?: SequenceModifier[];
  readonly bindingValues?: SequenceSelectorProps['sequenceBindingValues'];
  readonly onBindingToggle?: SequenceSelectorProps['onBindingToggle'];
  readonly isInteractive?: boolean;
  readonly entries?: SequenceSelectorProps['sequenceEntries'];
  readonly cappedSequenceIndex?: number;
  readonly onStageSelect?: SequenceSelectorProps['onStageSelect'];
};

const SequenceOption: FC<SequenceOptionProps> = ({
  id,
  name,
  title,
  description,
  value,
  isSelected,
  onSelect,
  conditions,
  conditionValues,
  onConditionToggle,
  bindings,
  bindingValues,
  onBindingToggle,
  isInteractive = false,
  entries,
  cappedSequenceIndex,
  onStageSelect,
}) => {
  const handleChange = () => {
    onSelect(value);
  };

  const resolvedConditionValues = conditionValues ?? {};
  const resolvedBindingValues = bindingValues ?? {};

  const modifierSections = [
    conditions && conditions.length > 0
      ? {
          key: 'conditions' as const,
          title: 'Sequence modifiers',
          items: conditions,
          values: resolvedConditionValues,
          onToggle: onConditionToggle,
        }
      : null,
    bindings && bindings.length > 0
      ? {
          key: 'bindings' as const,
          title: 'Bindings',
          items: bindings,
          values: resolvedBindingValues,
          onToggle: onBindingToggle,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: 'conditions' | 'bindings';
    title: string;
    items: SequenceModifier[];
    values: Record<string, boolean>;
    onToggle?: SequenceOptionProps['onConditionToggle'];
  }>;

  return (
    <div
      className="sequence-selector__option"
      data-selected={isSelected ? 'true' : undefined}
    >
      <input
        id={id}
        className="sr-only"
        type="radio"
        name={name}
        value={value}
        checked={isSelected}
        onChange={handleChange}
        aria-labelledby={description ? `${id}-title ${id}-description` : `${id}-title`}
      />
      <div
        className="sequence-selector__option-header"
        role="presentation"
        onClick={handleChange}
      >
        <span id={`${id}-title`} className="sequence-selector__option-title">
          {title}
        </span>
        {description ? (
          <span
            id={`${id}-description`}
            className="sequence-selector__option-description"
          >
            {description}
          </span>
        ) : null}
      </div>
      {modifierSections.length > 0 ? (
        <div className="sequence-selector__option-conditions" role="group">
          {modifierSections.map((section) => (
            <div key={section.key} className="sequence-selector__option-conditions-group">
              <span className="sequence-selector__option-conditions-title">
                {section.title}
              </span>
              <div className="sequence-selector__option-conditions-grid">
                {section.items.map((item) => {
                  const isEnabled = isInteractive
                    ? section.values[item.id]
                    : item.defaultEnabled;
                  return (
                    <label key={item.id} className="sequence-selector__condition-option">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        disabled={!isInteractive}
                        onChange={
                          isInteractive && section.onToggle
                            ? (event) => {
                                section.onToggle?.(item.id, event.target.checked);
                              }
                            : undefined
                        }
                      />
                      <span>
                        <span className="sequence-selector__condition-label">
                          {item.label}
                        </span>
                        {item.description ? (
                          <span className="sequence-selector__condition-description">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          {!isInteractive ? (
            <p className="sequence-selector__option-conditions-note">
              Select this sequence to adjust modifiers.
            </p>
          ) : null}
        </div>
      ) : null}
      {isInteractive && entries ? (
        entries.length > 0 ? (
          <ol className="sequence-selector__stages">
            {entries.map((entry, index) => {
              const isCurrent = index === cappedSequenceIndex;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="sequence-selector__stage"
                    onClick={() => {
                      onStageSelect?.(index);
                    }}
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
        )
      ) : null}
    </div>
  );
};
