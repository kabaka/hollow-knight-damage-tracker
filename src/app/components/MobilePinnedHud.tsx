import { useEffect, useId, useState, type FC } from 'react';

import type { DerivedStats } from '../../features/fight-state/FightStateContext';
import { BossHealthBar, MobileStatsBar } from '../../components';
import { formatNumber } from '../../utils/format';

const STORAGE_KEY = 'hkdt.mobileHudExpanded';

const getStoredExpansionState = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'expanded') {
      return true;
    }
    if (stored === 'collapsed') {
      return false;
    }
  } catch (error) {
    console.error('Failed to read mobile HUD state from storage', error);
  }
  return false;
};

const storeExpansionState = (isExpanded: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, isExpanded ? 'expanded' : 'collapsed');
  } catch (error) {
    console.error('Failed to persist mobile HUD state', error);
  }
};

export type MobilePinnedHudProps = {
  readonly derived: DerivedStats;
  readonly encounterName: string;
  readonly arenaLabel: string | null;
  readonly stageLabel: string | null;
  readonly stageProgress: { current: number; total: number } | null;
};

export const MobilePinnedHud: FC<MobilePinnedHudProps> = ({
  derived,
  encounterName,
  arenaLabel,
  stageLabel,
  stageProgress,
}) => {
  const { targetHp, remainingHp } = derived;
  const [isExpanded, setIsExpanded] = useState<boolean>(() => getStoredExpansionState());
  const statsPanelId = useId();
  const toggleLabelId = useId();
  const titleId = useId();
  const contextId = useId();

  useEffect(() => {
    storeExpansionState(isExpanded);
  }, [isExpanded]);

  const toggleHud = (): void => {
    setIsExpanded((previous) => !previous);
  };

  const hudClassName = isExpanded ? 'mobile-hud is-expanded' : 'mobile-hud is-collapsed';
  const labelledBy = [toggleLabelId, titleId, arenaLabel ? contextId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="mobile-hud-sentinel">
      <button
        type="button"
        className={hudClassName}
        aria-expanded={isExpanded}
        aria-controls={statsPanelId}
        aria-labelledby={labelledBy}
        onClick={toggleHud}
      >
        <span id={toggleLabelId} className="sr-only">
          Boss status — tap to expand or collapse combat metrics
        </span>
        <div className="mobile-hud__title-row" aria-live="polite">
          <span id={titleId} className="mobile-hud__title">
            {encounterName}
          </span>
          {arenaLabel ? (
            <span id={contextId} className="mobile-hud__context">
              {arenaLabel}
            </span>
          ) : null}
        </div>
        <BossHealthBar
          className="mobile-hud__health"
          role="group"
          aria-label="Boss HP"
          current={remainingHp}
          total={targetHp}
          progressbarAriaLabel="Boss HP"
          trackClassName="mobile-hud__track"
          valueLabel={`${formatNumber(remainingHp)} / ${formatNumber(targetHp)}`}
          valueClassName="mobile-hud__value"
        />
        <div
          id={statsPanelId}
          className="mobile-hud__metrics"
          hidden={!isExpanded}
          aria-hidden={!isExpanded}
        >
          <MobileStatsBar
            derived={derived}
            stageLabel={stageLabel}
            stageProgress={stageProgress}
          />
        </div>
        <span className="mobile-hud__toggle-tab" aria-hidden="true">
          <svg className="mobile-hud__toggle-icon" viewBox="0 0 16 16" focusable="false">
            <path d="M2.47 5.97a.75.75 0 0 1 1.06 0L8 10.44l4.47-4.47a.75.75 0 0 1 1.06 1.06l-5 5a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </span>
      </button>
    </div>
  );
};
