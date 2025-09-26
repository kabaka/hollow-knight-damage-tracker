import type { FC } from 'react';
import { useEffect, useMemo, useRef } from 'react';

import type { Charm } from '../../data';

import { MAX_NOTCH_LIMIT, MIN_NOTCH_LIMIT } from '../fight-state/fightReducer';
import { charmGridLayout, useBuildConfiguration } from './useBuildConfiguration';

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

const formatNotchLabel = (value: number) => `${value} notch${value === 1 ? '' : 'es'}`;

const getCharmDetailText = (charm: Charm) => {
  const segments: string[] = [];
  if (charm.description) {
    segments.push(charm.description);
  }
  const effectDescriptions = charm.effects
    .map((effect) => [effect.effect, effect.notes].filter(Boolean).join(' '))
    .filter((value) => value.trim().length > 0);
  if (effectDescriptions.length > 0) {
    segments.push(effectDescriptions.join(' '));
  }
  return segments.join(' ');
};

const getCharmTooltip = (charm: Charm) => {
  const detail = getCharmDetailText(charm);
  const header = `${charm.name} — ${formatNotchLabel(charm.cost)}`;
  return detail ? `${header}\n${detail}` : header;
};

const getCharmAriaLabel = (charm: Charm) => {
  const detail = getCharmDetailText(charm);
  const base = `${charm.name}, ${formatNotchLabel(charm.cost)}.`;
  return detail ? `${base} ${detail}` : base;
};

export const PlayerConfigModal: FC<PlayerConfigModalProps> = ({ isOpen, onClose }) => {
  const {
    state,
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
    isOvercharmed,
  } = useBuildConfiguration();

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const charmIconMap = useMemo(createCharmIconMap, []);

  const { build } = state;
  const notchUsage = `${activeCharmCost}/${notchLimit}`;
  const equippedCharms = useMemo(
    () =>
      activeCharmIds
        .map((id) => charmDetails.get(id))
        .filter((charm): charm is Charm => Boolean(charm)),
    [activeCharmIds, charmDetails],
  );
  const notchIndicators = useMemo(
    () =>
      Array.from({ length: MAX_NOTCH_LIMIT }, (_, index) => {
        const isWithinLimit = index < notchLimit;
        const isUsed = index < activeCharmCost;
        return {
          isWithinLimit,
          isUsed,
          isOverfill: isUsed && !isWithinLimit,
        };
      }),
    [activeCharmCost, notchLimit],
  );

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
          <section className="modal-section" aria-labelledby="charm-workbench-heading">
            <div className="modal-section__header">
              <h3 id="charm-workbench-heading">Charm Workbench</h3>
            </div>
            <p className="modal-section__description">
              Manage equipped charms, adjust your notch bracelet, and browse the staggered
              inventory grid.
            </p>
            <div className="charm-workbench">
              <div className="charm-workbench__overview">
                <div className="equipped-panel">
                  <h4 className="equipped-panel__title">Equipped</h4>
                  <div className="equipped-panel__grid" role="list" aria-live="polite">
                    {equippedCharms.length > 0 ? (
                      equippedCharms.map((charm) => {
                        const icon = charmIconMap.get(charm.id);
                        return (
                          <div
                            key={charm.id}
                            role="listitem"
                            className="equipped-panel__item"
                            title={getCharmTooltip(charm)}
                          >
                            {icon ? (
                              <img
                                src={icon}
                                alt=""
                                className="equipped-panel__icon"
                                aria-hidden="true"
                              />
                            ) : null}
                            <span className="visually-hidden">
                              {getCharmAriaLabel(charm)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="equipped-panel__empty">No charms equipped.</p>
                    )}
                  </div>
                </div>
                <div
                  className={`notch-panel${isOvercharmed ? ' notch-panel--overcharmed' : ''}`}
                >
                  <div className="notch-panel__header">
                    <h4 className="notch-panel__title">Notches</h4>
                    <span className="notch-panel__usage">{notchUsage}</span>
                  </div>
                  <div className="notch-panel__bracelet" role="presentation">
                    {notchIndicators.map((indicator, index) => {
                      const classes = ['notch-dot'];
                      if (indicator.isWithinLimit) {
                        classes.push('notch-dot--available');
                      } else {
                        classes.push('notch-dot--locked');
                      }
                      if (indicator.isUsed) {
                        classes.push('notch-dot--filled');
                      }
                      if (indicator.isOverfill) {
                        classes.push('notch-dot--overfill');
                      }
                      return (
                        <span
                          key={index}
                          className={classes.join(' ')}
                          aria-hidden="true"
                        />
                      );
                    })}
                  </div>
                  <label className="notch-panel__slider" htmlFor="notch-limit">
                    <span className="notch-panel__slider-label">Notch limit</span>
                    <input
                      id="notch-limit"
                      type="range"
                      min={MIN_NOTCH_LIMIT}
                      max={MAX_NOTCH_LIMIT}
                      value={notchLimit}
                      onChange={(event) => setNotchLimit(Number(event.target.value))}
                    />
                  </label>
                  <p className="notch-panel__description">
                    Set this to match your save file&apos;s available notches. Reducing
                    the limit below your equipped cost cracks the bracelet to warn you
                    that you are overcharmed.
                  </p>
                </div>
              </div>
              {isOvercharmed ? (
                <div className="overcharm-banner" role="status" aria-live="assertive">
                  <span className="overcharm-banner__label">Overcharmed</span>
                  <span className="overcharm-banner__message">
                    You&apos;ll take double damage until you unequip a charm.
                  </span>
                </div>
              ) : null}
              <div className="charm-workbench__grid">
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
                          className={[
                            'charm-slot',
                            options.length > 1 ? 'charm-slot--paired' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {options.map((charmId) => {
                            const charm = charmDetails.get(charmId);
                            if (!charm) {
                              return null;
                            }
                            const isActive = activeCharmIds.includes(charmId);
                            const canEquip = canEquipCharm(charmId);
                            const icon = charmIconMap.get(charmId);
                            const classes = [
                              'charm-token',
                              isActive ? 'charm-token--active' : 'charm-token--idle',
                              !canEquip && !isActive ? 'charm-token--locked' : '',
                            ]
                              .filter(Boolean)
                              .join(' ');
                            return (
                              <button
                                key={charmId}
                                type="button"
                                className={classes}
                                onClick={() => toggleCharm(charmId)}
                                disabled={!canEquip && !isActive}
                                aria-pressed={isActive}
                                aria-label={getCharmAriaLabel(charm)}
                                title={getCharmTooltip(charm)}
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
              </div>
              <div className="preset-panel">
                <h4 className="preset-panel__title">Presets</h4>
                <p className="preset-panel__description">
                  Apply quick loadouts or clear your charms with a single tap.
                </p>
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
              </div>
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
              <h3 id="equipment-heading">Equipment Setup</h3>
            </div>
            <div className="form-grid">
              <label className="form-grid__field" htmlFor="nail-level">
                <span>Nail upgrade</span>
                <select
                  id="nail-level"
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
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
