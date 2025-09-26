import type { FC } from 'react';
import { useEffect, useMemo, useRef } from 'react';

import { MAX_NOTCH_LIMIT, MIN_NOTCH_LIMIT } from '../fight-state/fightReducer';
import { charmGridLayout, useBuildConfiguration } from './useBuildConfiguration';
import { CUSTOM_BOSS_ID } from '../fight-state/FightStateContext';

const CHARM_PRESETS = [
  {
    id: 'spellcaster',
    label: 'Spellcaster (Shaman + Twister)',
    charmIds: ['shaman-stone', 'spell-twister'],
  },
  {
    id: 'strength-speed',
    label: 'Strength & Quick Slash',
    charmIds: ['unbreakable-strength', 'quick-slash'],
  },
  {
    id: 'glass-cannon',
    label: 'Glass Cannon (Fragile Strength + Shaman Stone)',
    charmIds: ['fragile-strength', 'shaman-stone'],
  },
] as const;

type PlayerConfigModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
};

const createCharmIconMap = () => {
  const map = new Map<string, string>();
  for (const row of charmGridLayout) {
    for (const options of row) {
      for (const charmId of options) {
        if (!map.has(charmId)) {
          map.set(
            charmId,
            new URL(`../../assets/charms/${charmId}.png`, import.meta.url).href,
          );
        }
      }
    }
  }
  return map;
};

const describeCharm = (name: string, cost: number) =>
  `${name} (${cost} notch${cost === 1 ? '' : 'es'})`;

export const PlayerConfigModal: FC<PlayerConfigModalProps> = ({ isOpen, onClose }) => {
  const {
    state,
    selectedBoss,
    selectedTarget,
    handleBossVersionChange,
    handleCustomHpChange,
    customTargetHp,
    isSequenceActive,
    notchLimit,
    activeCharmIds,
    activeCharmCost,
    canEquipCharm,
    toggleCharm,
    applyCharmPreset,
    setNotchLimit,
    nailUpgrades,
    setNailUpgrade,
    spells,
    setSpellLevel,
    charmDetails,
    sequenceConditionValues,
    handleSequenceConditionToggle,
    activeSequence,
  } = useBuildConfiguration();

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const charmIconMap = useMemo(createCharmIconMap, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    queueMicrotask(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const { build, selectedBossId } = state;
  const notchUsage = `${activeCharmCost}/${notchLimit}`;
  const notchFill = Math.min(1, activeCharmCost / notchLimit);

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-config-title"
    >
      <button
        type="button"
        className="modal__backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <h2 id="player-config-title" className="modal__title">
              Player Loadout
            </h2>
            <p className="modal__subtitle">
              Tune your charms, spells, and advanced fight options. Changes apply
              instantly.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="modal__close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="modal__body">
          <section className="modal-section" aria-labelledby="notch-limit-heading">
            <div className="modal-section__header">
              <h3 id="notch-limit-heading">Charm Notches</h3>
              <span className="notch-meter__value">{notchUsage}</span>
            </div>
            <p className="modal-section__description">
              Limit active charms to match your save file&apos;s notch capacity. The grid
              below enforces this limit automatically.
            </p>
            <div className="notch-meter" role="presentation">
              <div className="notch-meter__bar">
                <div
                  className="notch-meter__fill"
                  style={{ width: `${notchFill * 100}%` }}
                />
              </div>
              <input
                type="range"
                min={MIN_NOTCH_LIMIT}
                max={MAX_NOTCH_LIMIT}
                value={notchLimit}
                onChange={(event) => setNotchLimit(Number(event.target.value))}
                aria-label="Notch limit"
              />
              <div className="notch-meter__labels" aria-hidden="true">
                <span>{MIN_NOTCH_LIMIT}</span>
                <span>{MAX_NOTCH_LIMIT}</span>
              </div>
            </div>
          </section>

          <section className="modal-section" aria-labelledby="charm-loadouts-heading">
            <div className="modal-section__header">
              <h3 id="charm-loadouts-heading">Charm Loadouts</h3>
            </div>
            <div className="preset-buttons" role="group" aria-label="Charm presets">
              {CHARM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="preset-buttons__button"
                  onClick={() => applyCharmPreset(preset.charmIds)}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                className="preset-buttons__button"
                onClick={() => applyCharmPreset([])}
              >
                Clear charms
              </button>
            </div>
            <div className="charm-grid" role="grid" aria-label="Charm inventory">
              {charmGridLayout.map((row, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  role="row"
                  className={`charm-grid__row${rowIndex % 2 === 1 ? ' charm-grid__row--offset' : ''}`}
                >
                  {row.map((options, columnIndex) => (
                    <div
                      key={`${rowIndex}-${columnIndex}`}
                      role="gridcell"
                      className="charm-slot"
                    >
                      {options.map((charmId) => {
                        const charm = charmDetails.get(charmId);
                        if (!charm) {
                          return null;
                        }
                        const isActive = activeCharmIds.includes(charmId);
                        const canEquip = canEquipCharm(charmId);
                        const icon = charmIconMap.get(charmId);
                        return (
                          <button
                            key={charmId}
                            type="button"
                            className={`charm-token${isActive ? ' charm-token--active' : ''}`}
                            onClick={() => toggleCharm(charmId)}
                            disabled={!canEquip && !isActive}
                            aria-pressed={isActive}
                            aria-label={describeCharm(charm.name, charm.cost)}
                            title={describeCharm(charm.name, charm.cost)}
                          >
                            {icon ? (
                              <img
                                src={icon}
                                alt=""
                                className="charm-token__icon"
                                aria-hidden="true"
                              />
                            ) : null}
                            <span className="charm-token__name">{charm.name}</span>
                            <span className="charm-token__cost" aria-hidden="true">
                              {charm.cost}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="modal-section" aria-labelledby="spell-focus-heading">
            <div className="modal-section__header">
              <h3 id="spell-focus-heading">Spell Focus</h3>
            </div>
            <div className="spell-grid">
              {spells.map((spell) => (
                <fieldset key={spell.id} className="spell-card">
                  <legend>{spell.name}</legend>
                  <label className="spell-card__option">
                    <input
                      type="radio"
                      name={`spell-${spell.id}`}
                      value="base"
                      checked={build.spellLevels[spell.id] === 'base'}
                      onChange={() => setSpellLevel(spell.id, 'base')}
                    />
                    <span>{spell.base.name}</span>
                  </label>
                  {spell.upgrade ? (
                    <label className="spell-card__option">
                      <input
                        type="radio"
                        name={`spell-${spell.id}`}
                        value="upgrade"
                        checked={build.spellLevels[spell.id] === 'upgrade'}
                        onChange={() => setSpellLevel(spell.id, 'upgrade')}
                      />
                      <span>{spell.upgrade.name}</span>
                    </label>
                  ) : null}
                </fieldset>
              ))}
            </div>
          </section>

          <section className="modal-section" aria-labelledby="equipment-heading">
            <div className="modal-section__header">
              <h3 id="equipment-heading">Nail & Target</h3>
            </div>
            <div className="form-grid">
              <label className="form-grid__field">
                <span>Nail upgrade</span>
                <select
                  value={build.nailUpgradeId}
                  onChange={(event) => setNailUpgrade(event.target.value)}
                >
                  {nailUpgrades.map((upgrade) => (
                    <option key={upgrade.id} value={upgrade.id}>
                      {upgrade.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedBoss && !isSequenceActive && selectedBossId !== CUSTOM_BOSS_ID ? (
                <label className="form-grid__field">
                  <span>Boss version</span>
                  <select
                    value={state.selectedBossId}
                    onChange={(event) => handleBossVersionChange(event.target.value)}
                  >
                    {selectedBoss.versions.map((version) => (
                      <option key={version.targetId} value={version.targetId}>
                        {version.title} • {version.hp.toLocaleString()} HP
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {selectedBossId === CUSTOM_BOSS_ID && !isSequenceActive ? (
                <label className="form-grid__field">
                  <span>Custom target HP</span>
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={customTargetHp}
                    onChange={(event) => handleCustomHpChange(event.target.value)}
                  />
                </label>
              ) : null}

              {selectedTarget ? (
                <div className="form-grid__field" aria-live="polite">
                  <span>Active target</span>
                  <div className="form-grid__summary">
                    <strong>{selectedTarget.bossName}</strong>
                    <span>{selectedTarget.version.title}</span>
                    <span>{selectedTarget.hp.toLocaleString()} HP</span>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {activeSequence && activeSequence.conditions.length > 0 ? (
            <section
              className="modal-section"
              aria-labelledby="sequence-conditions-heading"
            >
              <div className="modal-section__header">
                <h3 id="sequence-conditions-heading">Sequence Conditions</h3>
              </div>
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
                          handleSequenceConditionToggle(
                            condition.id,
                            event.target.checked,
                          )
                        }
                      />
                      <span>
                        <span className="sequence-condition__label">
                          {condition.label}
                        </span>
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
      </div>
    </div>
  );
};
