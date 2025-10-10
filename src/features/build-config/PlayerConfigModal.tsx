import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Charm } from '../../data';

import { MAX_NOTCH_LIMIT, MIN_NOTCH_LIMIT } from '../fight-state/fightReducer';
import { charmGridLayout, useBuildConfiguration } from './useBuildConfiguration';
import { useHapticFeedback } from '../../utils/haptics';
import { Modal } from '../../components/Modal';
import { CharmSynergyList } from '../../components/CharmSynergyList';

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

type CharmFlight = {
  key: string;
  charmId: string;
  direction: 'equip' | 'unequip';
  icon: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  size: { width: number; height: number };
};

type PanelCharmState = 'entering' | 'visible' | 'exiting';
type EquippedCharmEntry = { charm: Charm; state: PanelCharmState };

export const CHARM_FLIGHT_TIMEOUT_MS = 600;

export const CharmFlightSprite: FC<{
  readonly animation: CharmFlight;
  readonly onComplete: (flight: CharmFlight) => void;
}> = ({ animation, onComplete }) => {
  const elementRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    let didComplete = false;
    let measureFrame: number | null = null;
    let animationFrame: number | null = null;

    const complete = () => {
      if (didComplete) {
        return;
      }
      didComplete = true;
      onComplete(animation);
    };

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== element || event.propertyName !== 'transform') {
        return;
      }
      complete();
    };

    const fallbackTimeout = window.setTimeout(complete, CHARM_FLIGHT_TIMEOUT_MS);
    element.addEventListener('transitionend', handleTransitionEnd);

    if (animation.from.x === animation.to.x && animation.from.y === animation.to.y) {
      complete();
    } else {
      const scheduleAnimation = () => {
        element.style.transform = `translate(${animation.to.x}px, ${animation.to.y}px)`;
      };

      measureFrame = requestAnimationFrame(() => {
        // Force the browser to flush the initial position so the transition
        // reliably runs on slower devices before applying the destination
        // transform on the next frame.
        element.getBoundingClientRect();
        animationFrame = requestAnimationFrame(scheduleAnimation);
      });
    }

    return () => {
      element.removeEventListener('transitionend', handleTransitionEnd);
      window.clearTimeout(fallbackTimeout);
      if (measureFrame !== null) {
        cancelAnimationFrame(measureFrame);
      }
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [animation, onComplete]);

  return (
    <img
      ref={elementRef}
      src={animation.icon}
      alt=""
      aria-hidden="true"
      className="charm-flight"
      data-testid="charm-flight-sprite"
      style={{
        width: `${animation.size.width}px`,
        height: `${animation.size.height}px`,
        transform: `translate(${animation.from.x}px, ${animation.from.y}px)`,
      }}
    />
  );
};

const PlayerConfigModalContent: FC = () => {
  const {
    notchLimit,
    activeCharmIds,
    activeCharmCost,
    canEquipCharm,
    cycleCharmSlot,
    applyCharmPreset,
    setNotchLimit,
    nailUpgrades,
    setNailUpgrade,
    spells,
    setSpellLevel,
    charmDetails,
    charmSynergyStatuses,
    isOvercharmed,
    build,
  } = useBuildConfiguration();

  const charmIconMap = useMemo(() => createCharmIconMap(), []);
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const charmSlotRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const equippedCharmRefs = useRef(new Map<string, HTMLDivElement | null>());
  const previousCharmIdsRef = useRef<string[]>(activeCharmIds);
  const overcharmRef = useRef(isOvercharmed);
  const { trigger: triggerHaptics } = useHapticFeedback();
  const [charmFlights, setCharmFlights] = useState<CharmFlight[]>([]);
  const [panelCharmStates, setPanelCharmStates] = useState<Map<string, PanelCharmState>>(
    () => {
      const initial = new Map<string, PanelCharmState>();
      for (const charmId of activeCharmIds) {
        initial.set(charmId, 'visible');
      }
      return initial;
    },
  );
  const panelStateFallbacks = useRef(new Map<string, number>());

  const clearPanelStateFallback = useCallback((charmId: string) => {
    const timers = panelStateFallbacks.current;
    const fallbackId = timers.get(charmId);
    if (fallbackId !== undefined) {
      window.clearTimeout(fallbackId);
      timers.delete(charmId);
    }
  }, []);

  const finalizePanelState = useCallback(
    (charmId: string, finalState: PanelCharmState | null) => {
      setPanelCharmStates((current) => {
        const next = new Map(current);
        let didChange = false;

        if (finalState === 'visible') {
          const currentState = next.get(charmId);
          if (currentState !== 'visible') {
            next.set(charmId, 'visible');
            didChange = true;
          }
        } else if (next.has(charmId)) {
          next.delete(charmId);
          didChange = true;
        }

        return didChange ? next : current;
      });
    },
    [],
  );

  const schedulePanelStateFallback = useCallback(
    (charmId: string, direction: CharmFlight['direction']) => {
      clearPanelStateFallback(charmId);

      const timeoutId = window.setTimeout(() => {
        panelStateFallbacks.current.delete(charmId);
        finalizePanelState(charmId, direction === 'equip' ? 'visible' : null);
      }, CHARM_FLIGHT_TIMEOUT_MS + 50);

      panelStateFallbacks.current.set(charmId, timeoutId);
    },
    [clearPanelStateFallback, finalizePanelState],
  );

  const notchUsage = `${activeCharmCost}/${notchLimit}`;
  const equippedCharmEntries = useMemo(() => {
    const activeEntries: EquippedCharmEntry[] = [];
    for (const charmId of activeCharmIds) {
      const charm = charmDetails.get(charmId);
      if (!charm) {
        continue;
      }
      const state = panelCharmStates.get(charmId) ?? 'visible';
      activeEntries.push({ charm, state });
    }

    const voidHeartIndex = activeEntries.findIndex(
      (entry) => entry.charm.id === 'void-heart',
    );
    if (voidHeartIndex > 0) {
      const [voidHeart] = activeEntries.splice(voidHeartIndex, 1);
      activeEntries.unshift(voidHeart);
    }

    const exitingEntries: EquippedCharmEntry[] = [];
    for (const [charmId, state] of panelCharmStates.entries()) {
      if (state !== 'exiting' || activeCharmIds.includes(charmId)) {
        continue;
      }
      const charm = charmDetails.get(charmId);
      if (charm) {
        exitingEntries.push({ charm, state });
      }
    }

    return [...activeEntries, ...exitingEntries];
  }, [activeCharmIds, charmDetails, panelCharmStates]);
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
    const wasOvercharmed = overcharmRef.current;
    if (isOvercharmed && !wasOvercharmed) {
      triggerHaptics('warning');
    }

    if (!isOvercharmed && wasOvercharmed) {
      triggerHaptics('success');
    }

    overcharmRef.current = isOvercharmed;
  }, [isOvercharmed, triggerHaptics]);

  useEffect(() => {
    const previous = previousCharmIdsRef.current;
    const newlyEquipped = activeCharmIds.filter((id) => !previous.includes(id));
    const newlyUnequipped = previous.filter((id) => !activeCharmIds.includes(id));
    previousCharmIdsRef.current = activeCharmIds;

    setPanelCharmStates((current) => {
      const next = new Map(current);
      let didChange = false;

      for (const charmId of activeCharmIds) {
        const isNew = newlyEquipped.includes(charmId);
        const state = next.get(charmId);
        if (!state || state === 'exiting') {
          next.set(charmId, isNew ? 'entering' : 'visible');
          didChange = true;
        }
      }

      for (const charmId of newlyUnequipped) {
        if (next.get(charmId) !== 'exiting') {
          next.set(charmId, 'exiting');
          didChange = true;
        }
      }

      return didChange ? next : current;
    });

    if (newlyEquipped.length === 0 && newlyUnequipped.length === 0) {
      return;
    }

    const container = workbenchRef.current;
    if (!container) {
      setPanelCharmStates((current) => {
        const next = new Map(current);
        let didChange = false;

        for (const charmId of newlyEquipped) {
          if (next.get(charmId) === 'entering') {
            next.set(charmId, 'visible');
            didChange = true;
          }
        }

        for (const charmId of newlyUnequipped) {
          if (next.has(charmId)) {
            next.delete(charmId);
            didChange = true;
          }
        }

        return didChange ? next : current;
      });
      return;
    }

    const frame = requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const updates: CharmFlight[] = [];
      const instantVisible: string[] = [];
      const instantRemoval: string[] = [];

      for (const charmId of newlyEquipped) {
        const source = charmSlotRefs.current.get(charmId);
        const target = equippedCharmRefs.current.get(charmId);
        const icon = charmIconMap.get(charmId);

        if (!source || !target || !icon) {
          instantVisible.push(charmId);
          continue;
        }

        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const width = targetRect.width || sourceRect.width;
        const height = targetRect.height || sourceRect.height;

        updates.push({
          key: `${charmId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          charmId,
          direction: 'equip',
          icon,
          from: {
            x: sourceRect.left - containerRect.left + (sourceRect.width - width) / 2,
            y: sourceRect.top - containerRect.top + (sourceRect.height - height) / 2,
          },
          to: {
            x: targetRect.left - containerRect.left,
            y: targetRect.top - containerRect.top,
          },
          size: { width, height },
        });
      }

      for (const charmId of newlyUnequipped) {
        const source = equippedCharmRefs.current.get(charmId);
        const target = charmSlotRefs.current.get(charmId);
        const icon = charmIconMap.get(charmId);

        if (!source || !target || !icon) {
          instantRemoval.push(charmId);
          continue;
        }

        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const width = sourceRect.width || targetRect.width;
        const height = sourceRect.height || targetRect.height;

        updates.push({
          key: `${charmId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          charmId,
          direction: 'unequip',
          icon,
          from: {
            x: sourceRect.left - containerRect.left,
            y: sourceRect.top - containerRect.top,
          },
          to: {
            x: targetRect.left - containerRect.left + (targetRect.width - width) / 2,
            y: targetRect.top - containerRect.top + (targetRect.height - height) / 2,
          },
          size: { width, height },
        });
      }

      if (instantVisible.length > 0 || instantRemoval.length > 0) {
        setPanelCharmStates((current) => {
          const next = new Map(current);
          let didChange = false;

          for (const charmId of instantVisible) {
            if (next.get(charmId) === 'entering') {
              next.set(charmId, 'visible');
              didChange = true;
            }
          }

          for (const charmId of instantRemoval) {
            if (next.has(charmId)) {
              next.delete(charmId);
              didChange = true;
            }
          }

          return didChange ? next : current;
        });
        for (const charmId of instantVisible) {
          clearPanelStateFallback(charmId);
        }
        for (const charmId of instantRemoval) {
          clearPanelStateFallback(charmId);
        }
      }

      if (updates.length > 0) {
        setCharmFlights((current) => {
          const replacedCharmIds = new Set(updates.map((flight) => flight.charmId));
          const preservedFlights = current.filter(
            (flight) => !replacedCharmIds.has(flight.charmId),
          );
          return [...preservedFlights, ...updates];
        });
        for (const flight of updates) {
          schedulePanelStateFallback(flight.charmId, flight.direction);
        }
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [activeCharmIds, charmIconMap, clearPanelStateFallback, schedulePanelStateFallback]);

  const handleCharmFlightComplete = useCallback(
    (flight: CharmFlight) => {
      setCharmFlights((current) => current.filter((item) => item.key !== flight.key));
      clearPanelStateFallback(flight.charmId);
      finalizePanelState(flight.charmId, flight.direction === 'equip' ? 'visible' : null);
    },
    [clearPanelStateFallback, finalizePanelState],
  );

  useEffect(() => {
    if (charmFlights.length > 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPanelCharmStates((current) => {
        let didChange = false;
        const next = new Map(current);

        for (const [charmId, state] of current.entries()) {
          if (state === 'entering') {
            next.set(charmId, 'visible');
            clearPanelStateFallback(charmId);
            didChange = true;
          } else if (state === 'exiting' && !activeCharmIds.includes(charmId)) {
            next.delete(charmId);
            clearPanelStateFallback(charmId);
            didChange = true;
          }
        }

        return didChange ? next : current;
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeCharmIds, charmFlights.length, clearPanelStateFallback]);

  useEffect(() => {
    const timers = panelStateFallbacks.current;
    return () => {
      for (const timeoutId of timers.values()) {
        window.clearTimeout(timeoutId);
      }
      timers.clear();
    };
  }, []);

  return (
    <>
      <section className="modal-section" aria-labelledby="charm-workbench-heading">
        <div className="modal-section__header">
          <h3 id="charm-workbench-heading">Charm Workbench</h3>
        </div>
        <p className="modal-section__description">
          Manage equipped charms, adjust your notch bracelet, and browse the staggered
          inventory grid.
        </p>
        <div className="charm-workbench" ref={workbenchRef}>
          <div className="charm-animation-layer" aria-hidden="true">
            {charmFlights.map((flight) => (
              <CharmFlightSprite
                key={flight.key}
                animation={flight}
                onComplete={handleCharmFlightComplete}
              />
            ))}
          </div>
          <div className="charm-workbench__overview">
            <div className="equipped-panel">
              <h4 className="equipped-panel__title">Equipped</h4>
              <div
                className="equipped-panel__grid"
                role="list"
                aria-live="polite"
                aria-label="Equipped charms"
              >
                {equippedCharmEntries.length > 0 ? (
                  equippedCharmEntries.map(({ charm, state }) => {
                    const icon = charmIconMap.get(charm.id);
                    const isHidden = state !== 'visible';
                    return (
                      <div
                        key={charm.id}
                        role="listitem"
                        className={`equipped-panel__item${
                          isHidden ? ' equipped-panel__item--hidden' : ''
                        }`}
                        aria-hidden={isHidden}
                        title={getCharmTooltip(charm)}
                        ref={(element) => {
                          if (element) {
                            equippedCharmRefs.current.set(charm.id, element);
                          } else {
                            equippedCharmRefs.current.delete(charm.id);
                          }
                        }}
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
                    <span key={index} className={classes.join(' ')} aria-hidden="true" />
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
                Set this to match your save file&apos;s available notches. Reducing the
                limit below your equipped cost cracks the bracelet to warn you that you
                are overcharmed.
              </p>
            </div>
            <CharmSynergyList
              statuses={charmSynergyStatuses}
              charmDetails={charmDetails}
              iconMap={charmIconMap}
            />
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
                      className="charm-slot"
                    >
                      {(() => {
                        const activeId = options.find((id) =>
                          activeCharmIds.includes(id),
                        );
                        const displayId = activeId ?? options[0];
                        const displayCharm = charmDetails.get(displayId);
                        if (!displayCharm) {
                          return null;
                        }

                        const renderVariantButton = (
                          charmId: string,
                          {
                            isStacked,
                            isBackdrop,
                          }: { isStacked?: boolean; isBackdrop?: boolean } = {},
                        ) => {
                          const variantCharm = charmDetails.get(charmId);
                          if (!variantCharm) {
                            return null;
                          }
                          const variantIcon = charmIconMap.get(variantCharm.id);
                          const isVariantActive = activeCharmIds.includes(
                            variantCharm.id,
                          );
                          const canEquipVariant = canEquipCharm(variantCharm.id);
                          const variantClasses = [
                            'charm-token',
                            isStacked ? 'charm-token--stacked' : '',
                            isBackdrop ? 'charm-token--backdrop' : '',
                            isVariantActive ? 'charm-token--active' : 'charm-token--idle',
                            !isVariantActive && !canEquipVariant
                              ? 'charm-token--locked'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ');
                          const handleVariantClick = () => {
                            if (isBackdrop) {
                              cycleCharmSlot(options, variantCharm.id);
                              return;
                            }

                            if (isVariantActive) {
                              cycleCharmSlot(options);
                            } else {
                              cycleCharmSlot(options, variantCharm.id);
                            }
                          };
                          return (
                            <button
                              key={variantCharm.id}
                              type="button"
                              className={variantClasses}
                              onClick={handleVariantClick}
                              disabled={!isVariantActive && !canEquipVariant}
                              aria-pressed={isVariantActive}
                              aria-label={getCharmAriaLabel(variantCharm)}
                              title={getCharmTooltip(variantCharm)}
                              ref={(element) => {
                                if (element) {
                                  charmSlotRefs.current.set(variantCharm.id, element);
                                } else {
                                  charmSlotRefs.current.delete(variantCharm.id);
                                }
                              }}
                            >
                              {variantIcon ? (
                                <img
                                  src={variantIcon}
                                  alt=""
                                  className="charm-token__icon"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <span
                                className="charm-token__hover-label"
                                aria-hidden="true"
                              >
                                {variantCharm.name}
                              </span>
                              <span className="visually-hidden">
                                {getCharmAriaLabel(variantCharm)}
                              </span>
                            </button>
                          );
                        };

                        if (options.length === 1) {
                          return renderVariantButton(displayCharm.id);
                        }

                        const stackedVariants = options.filter(
                          (variantId) => variantId !== displayCharm.id,
                        );

                        return (
                          <div className="charm-token-stack">
                            {stackedVariants.map((variantId) =>
                              renderVariantButton(variantId, {
                                isStacked: true,
                                isBackdrop: true,
                              }),
                            )}
                            {renderVariantButton(displayCharm.id, { isStacked: true })}
                          </div>
                        );
                      })()}
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
              <label className="spell-card__option spell-card__option--muted">
                <input
                  type="radio"
                  name={`spell-${spell.id}`}
                  value="none"
                  checked={build.spellLevels[spell.id] === 'none'}
                  onChange={() => setSpellLevel(spell.id, 'none')}
                />
                <span>Not acquired</span>
              </label>
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
    </>
  );
};

export const PlayerConfigModal: FC<PlayerConfigModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId="player-config-title"
      title="Player Loadout"
      subtitle="Tune your charms, spells, and advanced fight options. Changes apply instantly."
    >
      <PlayerConfigModalContent />
    </Modal>
  );
};
