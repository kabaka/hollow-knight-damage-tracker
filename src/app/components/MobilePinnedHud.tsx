import type { FC } from 'react';

import type { useFightDerivedStats } from '../../features/fight-state/FightStateContext';
import { formatNumber } from '../../utils/format';
import { BossHealthBar } from './BossHealthBar';

export type MobilePinnedHudProps = {
  readonly derived: ReturnType<typeof useFightDerivedStats>;
  readonly encounterName: string;
};

export const MobilePinnedHud: FC<MobilePinnedHudProps> = ({ derived, encounterName }) => {
  const { targetHp, remainingHp } = derived;
  return (
    <div className="mobile-hud-sentinel">
      <div className="mobile-hud" role="group" aria-label="Boss status">
        <span className="mobile-hud__title" aria-live="polite">
          {encounterName}
        </span>
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
      </div>
    </div>
  );
};
