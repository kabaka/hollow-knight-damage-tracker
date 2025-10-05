import type { FC } from 'react';

import type { useFightDerivedStats } from '../../features/fight-state/FightStateContext';
import { formatDecimal, formatNumber, formatStopwatch } from '../../utils/format';

export type MobileStatsBarProps = {
  readonly derived: ReturnType<typeof useFightDerivedStats>;
  readonly stageLabel: string | null;
  readonly stageProgress: { current: number; total: number } | null;
};

type MobileStat = {
  readonly id: string;
  readonly label: string;
  readonly primary: string;
  readonly meta?: string | null;
};

export const MobileStatsBar: FC<MobileStatsBarProps> = ({
  derived,
  stageLabel,
  stageProgress,
}) => {
  const {
    elapsedMs,
    estimatedTimeRemainingMs,
    dps,
    totalDamage,
    averageDamage,
    actionsPerMinute,
    attacksLogged,
  } = derived;

  const metrics: MobileStat[] = [
    {
      id: 'elapsed',
      label: 'Elapsed',
      primary: formatStopwatch(elapsedMs),
    },
    {
      id: 'estimated-remaining',
      label: 'Est. Remaining',
      primary: formatStopwatch(estimatedTimeRemainingMs),
    },
    {
      id: 'dps',
      label: 'DPS',
      primary: formatDecimal(dps),
      meta: formatNumber(totalDamage),
    },
    {
      id: 'average-damage',
      label: 'Avg Dmg',
      primary: formatDecimal(averageDamage),
    },
    {
      id: 'actions-per-minute',
      label: 'APM',
      primary: formatDecimal(actionsPerMinute),
      meta: formatNumber(attacksLogged),
    },
    {
      id: 'stage',
      label: 'Stage',
      primary: stageLabel ?? '—',
      meta:
        stageProgress != null ? `${stageProgress.current}/${stageProgress.total}` : null,
    },
  ];

  return (
    <dl className="mobile-stats" aria-label="Combat metrics">
      {metrics.map((metric) => (
        <div key={metric.id} className="mobile-stats__item">
          <dt className="mobile-stats__label">{metric.label}</dt>
          <dd className="mobile-stats__value">
            <span className="mobile-stats__value-primary">{metric.primary}</span>
            {metric.meta ? (
              <span className="mobile-stats__value-meta">({metric.meta})</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
};
