import type { FC } from 'react';

import type { useFightDerivedStats } from '../../features/fight-state/FightStateContext';
import { BossHealthBar } from '../../components';
import { formatNumber } from '../../utils/format';
import { MobileStatsBar } from './MobileStatsBar';

export type MobilePinnedHudProps = {
  readonly derived: ReturnType<typeof useFightDerivedStats>;
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
  return (
    <div className="mobile-hud-sentinel">
      <div className="mobile-hud" role="group" aria-label="Boss status">
        <div className="mobile-hud__title-row" aria-live="polite">
          <span className="mobile-hud__title">{encounterName}</span>
          {arenaLabel ? <span className="mobile-hud__context">{arenaLabel}</span> : null}
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
        <MobileStatsBar
          derived={derived}
          stageLabel={stageLabel}
          stageProgress={stageProgress}
        />
      </div>
    </div>
  );
};
