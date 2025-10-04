import { useEffect, useId, useMemo, useState, type FC } from 'react';

import type { useBuildConfiguration } from '../build-config/useBuildConfiguration';
import { CUSTOM_BOSS_ID } from '../fight-state/FightStateContext';

export type TargetSelectorProps = {
  readonly title: string;
  readonly description: string;
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

const normalizeForSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const fuzzyIncludes = (source: string, query: string) => {
  const normalizedSource = normalizeForSearch(source);
  const normalizedQuery = normalizeForSearch(query).replace(/\s+/g, '');

  if (normalizedQuery === '') {
    return true;
  }

  let searchIndex = 0;
  for (const character of normalizedQuery) {
    searchIndex = normalizedSource.indexOf(character, searchIndex);
    if (searchIndex === -1) {
      return false;
    }
    searchIndex += 1;
  }
  return true;
};

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

export const TargetSelector: FC<TargetSelectorProps> = ({
  title,
  description,
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
  const [searchQuery, setSearchQuery] = useState('');
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (selectedBossId === CUSTOM_BOSS_ID) {
      setOptionsOpen(true);
    }
  }, [selectedBossId]);

  useEffect(() => {
    setCustomHpDraft(customTargetHp.toString());
  }, [customTargetHp]);

  const sortedBosses = useMemo(
    () => [...bosses].sort((first, second) => collator.compare(first.name, second.name)),
    [bosses],
  );

  const filteredBosses = useMemo(
    () =>
      sortedBosses.filter((boss) =>
        searchQuery.trim() === '' ? true : fuzzyIncludes(boss.name, searchQuery),
      ),
    [sortedBosses, searchQuery],
  );

  const shouldShowCustomOption =
    searchQuery.trim() === '' || fuzzyIncludes('Custom target', searchQuery);

  const totalMatches = filteredBosses.length + (shouldShowCustomOption ? 1 : 0);
  const resultsLabel = `${totalMatches} ${totalMatches === 1 ? 'match' : 'matches'} available`;

  const handleCustomHpDraftChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setCustomHpDraft(sanitized);
    if (sanitized !== '') {
      onCustomHpChange(sanitized);
    }
  };

  return (
    <section
      className="target-selector"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      <div className="target-selector__header">
        <div className="target-selector__heading">
          <h3 id={headingId}>{title}</h3>
          <p id={descriptionId} className="target-selector__description">
            {description}
          </p>
        </div>
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
      <div className="target-selector__boss-browser">
        <label className="target-selector__field" htmlFor="boss-search">
          <span className="target-selector__field-label">Search bosses</span>
          <input
            id="boss-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name"
            autoComplete="off"
            aria-describedby="boss-search-results"
          />
        </label>
        <p
          id="boss-search-results"
          className="target-selector__assist"
          aria-live="polite"
        >
          {resultsLabel}
        </p>
        <ul className="target-selector__boss-list">
          {filteredBosses.map((boss) => {
            const isSelected = bossSelectValue === boss.id;
            const optionId = `boss-target-${boss.id}`;
            return (
              <li key={boss.id}>
                <label
                  className="target-selector__boss-option"
                  data-selected={isSelected}
                  htmlFor={optionId}
                  aria-label={boss.name}
                >
                  <input
                    type="radio"
                    className="target-selector__boss-input"
                    name="boss-target"
                    id={optionId}
                    value={boss.id}
                    checked={isSelected}
                    onChange={() => onBossChange(boss.id)}
                  />
                  <span className="target-selector__boss-marker" aria-hidden="true" />
                  <span className="target-selector__boss-copy">
                    <span className="target-selector__boss-name">{boss.name}</span>
                    {boss.location ? (
                      <span className="target-selector__boss-meta">{boss.location}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
          {shouldShowCustomOption ? (
            <li>
              <label
                className="target-selector__boss-option"
                data-selected={bossSelectValue === CUSTOM_BOSS_ID}
                htmlFor="boss-target-custom"
                aria-label="Custom target"
              >
                <input
                  type="radio"
                  className="target-selector__boss-input"
                  name="boss-target"
                  id="boss-target-custom"
                  value={CUSTOM_BOSS_ID}
                  checked={bossSelectValue === CUSTOM_BOSS_ID}
                  onChange={() => onBossChange(CUSTOM_BOSS_ID)}
                />
                <span className="target-selector__boss-marker" aria-hidden="true" />
                <span className="target-selector__boss-copy">
                  <span className="target-selector__boss-name">Custom target</span>
                  <span className="target-selector__boss-meta">Set a custom HP goal</span>
                </span>
              </label>
            </li>
          ) : null}
        </ul>
        {filteredBosses.length === 0 && !shouldShowCustomOption ? (
          <p className="target-selector__boss-empty" role="status">
            No bosses match your search. Try a different name.
          </p>
        ) : null}
      </div>
      <div
        id="target-selector-options"
        className="target-selector__tray"
        hidden={!isOptionsOpen}
      >
        {selectedBoss && selectedBossId !== CUSTOM_BOSS_ID && selectedTarget ? (
          <label className="target-selector__field">
            <span className="target-selector__field-label">Boss version</span>
            <select
              value={selectedTarget.id}
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
