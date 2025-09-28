import { useEffect, useState, type FC } from 'react';

import type { useBuildConfiguration } from '../../features/build-config/useBuildConfiguration';
import { CUSTOM_BOSS_ID } from '../../features/fight-state/FightStateContext';

export type TargetSelectorProps = {
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

export const TargetSelector: FC<TargetSelectorProps> = ({
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
