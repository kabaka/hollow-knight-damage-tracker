import type { FC, KeyboardEvent } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import type { Charm } from '../../data';

import { MAX_NOTCH_LIMIT, MIN_NOTCH_LIMIT } from '../fight-state/fightReducer';
import { charmGridLayout, useBuildConfiguration } from './useBuildConfiguration';
import { useHapticFeedback } from '../../utils/haptics';
import { Modal } from '../../components/Modal';
import { CharmSynergyList } from '../../components/CharmSynergyList';
import { EncounterSetupPanel } from '../encounter-setup/EncounterSetupPanel';

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

type EquippedNotchSlot =
  | {
      type: 'charm';
      charm: Charm;
      state: PanelCharmState;
      key: string;
      slotIndex: number;
      isPrimary: boolean;
      isOverflow: boolean;
      isZeroCost: boolean;
    }
  | {
      type: 'empty';
      key: string;
      slotIndex: number;
    };

export const CHARM_FLIGHT_TIMEOUT_MS = 600;

type TabId = 'charms' | 'synergies' | 'nail' | 'spells' | 'boss';

type TabDefinition = {
  readonly id: TabId;
  readonly label: string;
  readonly tabId: string;
  readonly panelId: string;
};

type NavItem =
  | { readonly type: 'tab'; readonly tab: TabDefinition }
  | { readonly type: 'separator'; readonly id: string };

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
    bosses,
    bossSelectValue,
    handleBossChange,
    selectedBoss,
    selectedBossId,
    handleBossVersionChange,
    selectedTarget,
    selectedVersion,
    customTargetHp,
    handleCustomHpChange,
    bossSequences,
    sequenceSelectValue,
    handleSequenceChange,
    sequenceEntries,
    cappedSequenceIndex,
    handleSequenceStageChange,
    sequenceConditionValues,
    handleSequenceConditionToggle,
    sequenceBindingValues,
    handleSequenceBindingToggle,
  } = useBuildConfiguration();

  const charmIconMap = useMemo(() => createCharmIconMap(), []);
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const charmSlotRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const equippedCharmRefs = useRef(new Map<string, HTMLDivElement | null>());
  const previousCharmIdsRef = useRef<string[]>(activeCharmIds);
  const overcharmRef = useRef(isOvercharmed);
  const { trigger: triggerHaptics } = useHapticFeedback();
  const [charmFlights, setCharmFlights] = useState<CharmFlight[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('charms');
  const [panelCharmStates, setPanelCharmStates] = useState<Map<string, PanelCharmState>>(
    () => {
      const initial = new Map<string, PanelCharmState>();
      for (const charmId of activeCharmIds) {
        initial.set(charmId, 'visible');
      }
      return initial;
    },
  );
  const tabBaseId = useId();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    charms: null,
    synergies: null,
    nail: null,
    spells: null,
    boss: null,
  });
  const tabDefinitions = useMemo<TabDefinition[]>(
    () => [
      {
        id: 'charms',
        label: 'Charms',
        tabId: `${tabBaseId}-tab-charms`,
        panelId: `${tabBaseId}-panel-charms`,
      },
      {
        id: 'synergies',
        label: 'Charm Synergies',
        tabId: `${tabBaseId}-tab-synergies`,
        panelId: `${tabBaseId}-panel-synergies`,
      },
      {
        id: 'nail',
        label: 'Nail',
        tabId: `${tabBaseId}-tab-nail`,
        panelId: `${tabBaseId}-panel-nail`,
      },
      {
        id: 'spells',
        label: 'Spells',
        tabId: `${tabBaseId}-tab-spells`,
        panelId: `${tabBaseId}-panel-spells`,
      },
      {
        id: 'boss',
        label: 'Boss Fight',
        tabId: `${tabBaseId}-tab-boss`,
        panelId: `${tabBaseId}-panel-boss`,
      },
    ],
    [tabBaseId],
  );
  const tabOrder = useMemo(() => tabDefinitions.map((tab) => tab.id), [tabDefinitions]);
  const tabMap = useMemo(() => {
    const map = new Map<TabId, TabDefinition>();
    for (const tab of tabDefinitions) {
      map.set(tab.id, tab);
    }
    return map;
  }, [tabDefinitions]);
  const navigationItems = useMemo<NavItem[]>(() => {
    const order: (TabId | 'separator')[] = [
      'charms',
      'synergies',
      'nail',
      'spells',
      'separator',
      'boss',
    ];
    const items: NavItem[] = [];
    const included = new Set<TabId>();
    for (const entry of order) {
      if (entry === 'separator') {
        if (tabMap.has('boss')) {
          items.push({ type: 'separator', id: `${tabBaseId}-separator` });
        }
        continue;
      }
      const tab = tabMap.get(entry);
      if (tab) {
        items.push({ type: 'tab', tab });
        included.add(entry);
      }
    }
    for (const tab of tabDefinitions) {
      if (!included.has(tab.id)) {
        items.push({ type: 'tab', tab });
      }
    }
    return items;
  }, [tabBaseId, tabDefinitions, tabMap]);
  const focusTab = useCallback((tabId: TabId) => {
    const target = tabRefs.current[tabId];
    if (target) {
      target.focus();
    }
  }, []);
  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentId: TabId) => {
      const currentIndex = tabOrder.indexOf(currentId);
      if (currentIndex === -1) {
        return;
      }

      let nextIndex = currentIndex;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        nextIndex = (currentIndex + 1) % tabOrder.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
      } else if (event.key === 'Home') {
        event.preventDefault();
        nextIndex = 0;
      } else if (event.key === 'End') {
        event.preventDefault();
        nextIndex = tabOrder.length - 1;
      } else {
        return;
      }

      const nextTab = tabOrder[nextIndex];
      setActiveTab(nextTab);
      focusTab(nextTab);
    },
    [focusTab, tabOrder],
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
  const equippedNotchSlots = useMemo(() => {
    const slots: EquippedNotchSlot[] = [];
    let notchSlotCount = 0;

    for (const entry of equippedCharmEntries) {
      const { charm, state } = entry;
      const cost = Math.max(0, charm.cost);

      if (cost === 0) {
        slots.push({
          type: 'charm',
          charm,
          state,
          key: `${charm.id}-free`,
          slotIndex: notchSlotCount,
          isPrimary: true,
          isOverflow: false,
          isZeroCost: true,
        });
        continue;
      }

      for (let index = 0; index < cost; index += 1) {
        slots.push({
          type: 'charm',
          charm,
          state,
          key: `${charm.id}-${index}`,
          slotIndex: notchSlotCount,
          isPrimary: index === 0,
          isOverflow: notchSlotCount >= notchLimit,
          isZeroCost: false,
        });
        notchSlotCount += 1;
      }
    }

    const totalSlots = Math.max(notchLimit, notchSlotCount);
    for (let index = notchSlotCount; index < totalSlots; index += 1) {
      slots.push({
        type: 'empty',
        key: `empty-${index}`,
        slotIndex: index,
      });
    }

    return slots;
  }, [equippedCharmEntries, notchLimit]);

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

  const renderPanel = (tabId: TabId) => {
    switch (tabId) {
      case 'charms':
        return (
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
                <div
                  className={`equipped-overview${
                    isOvercharmed ? ' equipped-overview--overcharmed' : ''
                  }`}
                >
                  <div className="equipped-overview__body">
                    <div className="equipped-overview__header">
                      <h4 className="equipped-overview__title">Equipped</h4>
                      <span className="equipped-overview__usage">{notchUsage}</span>
                    </div>
                    <div
                      className="equipped-overview__slots"
                      role="list"
                      aria-live="polite"
                      aria-label="Equipped charms"
                    >
                      {equippedNotchSlots.map((slot) => {
                        if (slot.type === 'empty') {
                          return (
                            <div
                              key={slot.key}
                              className="equipped-overview__slot equipped-overview__slot--empty"
                              data-testid="notch-slot-empty"
                              aria-hidden="true"
                            />
                          );
                        }

                        const icon = charmIconMap.get(slot.charm.id);
                        const isHidden = slot.state !== 'visible';
                        const classes = ['equipped-overview__slot'];
                        if (slot.isZeroCost) {
                          classes.push('equipped-overview__slot--free');
                        } else {
                          classes.push('equipped-overview__slot--filled');
                        }
                        if (slot.isOverflow) {
                          classes.push('equipped-overview__slot--overflow');
                        }
                        if (isHidden) {
                          classes.push('equipped-overview__slot--hidden');
                        }

                        return (
                          <div
                            key={slot.key}
                            className={classes.join(' ')}
                            data-testid={
                              slot.isZeroCost
                                ? 'notch-slot-free'
                                : slot.isOverflow
                                  ? 'notch-slot-overflow'
                                  : 'notch-slot-filled'
                            }
                            role={slot.isPrimary ? 'listitem' : 'presentation'}
                            aria-hidden={slot.isPrimary ? undefined : 'true'}
                            title={getCharmTooltip(slot.charm)}
                            ref={(element) => {
                              if (!slot.isPrimary) {
                                return;
                              }
                              if (element) {
                                equippedCharmRefs.current.set(slot.charm.id, element);
                              } else {
                                equippedCharmRefs.current.delete(slot.charm.id);
                              }
                            }}
                          >
                            {icon ? (
                              <img
                                src={icon}
                                alt=""
                                className="equipped-overview__icon"
                                aria-hidden="true"
                              />
                            ) : null}
                            {slot.isPrimary ? (
                              <span className="visually-hidden">
                                {getCharmAriaLabel(slot.charm)}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {activeCharmIds.length === 0 ? (
                      <p className="equipped-overview__empty" aria-live="polite">
                        No charms equipped.
                      </p>
                    ) : null}
                  </div>
                  <label className="equipped-overview__slider" htmlFor="notch-limit">
                    <span className="equipped-overview__slider-label">Notch limit</span>
                    <input
                      id="notch-limit"
                      type="range"
                      min={MIN_NOTCH_LIMIT}
                      max={MAX_NOTCH_LIMIT}
                      value={notchLimit}
                      onChange={(event) => {
                        setNotchLimit(Number(event.target.value));
                      }}
                    />
                  </label>
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
                      className={`charm-grid__row${
                        rowIndex % 2 === 1 ? ' charm-grid__row--offset' : ''
                      }`}
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
                                isVariantActive
                                  ? 'charm-token--active'
                                  : 'charm-token--idle',
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
                                {renderVariantButton(displayCharm.id, {
                                  isStacked: true,
                                })}
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
                      onClick={() => {
                        applyCharmPreset(preset.charmIds);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="preset-buttons__button"
                    onClick={() => {
                      applyCharmPreset([]);
                    }}
                  >
                    Clear charms
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      case 'synergies':
        return (
          <section className="modal-section" aria-labelledby="charm-synergies-heading">
            <div className="modal-section__header">
              <h3 id="charm-synergies-heading">Charm Synergies</h3>
            </div>
            <p className="modal-section__description">
              Track which combinations are active and explore other resonance bonuses.
            </p>
            <CharmSynergyList
              statuses={charmSynergyStatuses}
              charmDetails={charmDetails}
              iconMap={charmIconMap}
            />
          </section>
        );
      case 'spells':
        return (
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
                      onChange={() => {
                        setSpellLevel(spell.id, 'none');
                      }}
                    />
                    <span>Not acquired</span>
                  </label>
                  <label className="spell-card__option">
                    <input
                      type="radio"
                      name={`spell-${spell.id}`}
                      value="base"
                      checked={build.spellLevels[spell.id] === 'base'}
                      onChange={() => {
                        setSpellLevel(spell.id, 'base');
                      }}
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
                        onChange={() => {
                          setSpellLevel(spell.id, 'upgrade');
                        }}
                      />
                      <span>{spell.upgrade.name}</span>
                    </label>
                  ) : null}
                </fieldset>
              ))}
            </div>
          </section>
        );
      case 'nail':
        return (
          <section className="modal-section" aria-labelledby="nail-heading">
            <div className="modal-section__header">
              <h3 id="nail-heading">Nail Forge</h3>
            </div>
            <p className="modal-section__description">
              Select your smithing progress so damage calculations stay accurate.
            </p>
            <div className="form-grid">
              <label className="form-grid__field" htmlFor="nail-level">
                <span>Nail upgrade</span>
                <select
                  id="nail-level"
                  value={build.nailUpgradeId}
                  onChange={(event) => {
                    setNailUpgrade(event.target.value);
                  }}
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
        );
      case 'boss':
        return (
          <section className="modal-section" aria-labelledby="boss-fight-heading">
            <div className="modal-section__header">
              <h3 id="boss-fight-heading">Boss Fight</h3>
            </div>
            <p className="modal-section__description">
              Configure your encounter target, Godhome bindings, and sequence progress.
            </p>
            <EncounterSetupPanel
              isOpen={activeTab === 'boss'}
              bosses={bosses}
              bossSelectValue={bossSelectValue}
              onBossChange={handleBossChange}
              selectedBoss={selectedBoss}
              selectedBossId={selectedBossId}
              onBossVersionChange={handleBossVersionChange}
              selectedTarget={selectedTarget}
              selectedVersion={selectedVersion}
              customTargetHp={customTargetHp}
              onCustomHpChange={handleCustomHpChange}
              bossSequences={bossSequences}
              sequenceSelectValue={sequenceSelectValue}
              onSequenceChange={handleSequenceChange}
              sequenceEntries={sequenceEntries}
              cappedSequenceIndex={cappedSequenceIndex}
              onStageSelect={handleSequenceStageChange}
              sequenceConditionValues={sequenceConditionValues}
              onConditionToggle={handleSequenceConditionToggle}
              sequenceBindingValues={sequenceBindingValues}
              onBindingToggle={handleSequenceBindingToggle}
            />
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-tabs">
      <nav className="modal-tabs__nav" aria-label="Player configuration sections">
        <ul className="modal-tabs__list" role="tablist" aria-orientation="vertical">
          {navigationItems.map((item) => {
            if (item.type === 'separator') {
              return (
                <li
                  key={item.id}
                  className="modal-tabs__separator"
                  role="presentation"
                  aria-hidden="true"
                />
              );
            }

            const { tab } = item;
            const isActive = activeTab === tab.id;
            return (
              <li key={tab.id} className="modal-tabs__item">
                <button
                  ref={(element) => {
                    tabRefs.current[tab.id] = element;
                  }}
                  type="button"
                  id={tab.tabId}
                  role="tab"
                  className={`modal-tabs__button${
                    isActive ? ' modal-tabs__button--active' : ''
                  }`}
                  aria-selected={isActive}
                  aria-controls={tab.panelId}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  onKeyDown={(event) => {
                    handleTabKeyDown(event, tab.id);
                  }}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="modal-tabs__panels">
        {tabDefinitions.map((tab) => (
          <section
            key={tab.id}
            id={tab.panelId}
            role="tabpanel"
            aria-labelledby={tab.tabId}
            hidden={activeTab !== tab.id}
            className="modal-tabs__panel"
          >
            {renderPanel(tab.id)}
          </section>
        ))}
      </div>
    </div>
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
