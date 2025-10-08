import type { FC } from 'react';

import type { DerivedStats } from '../features/fight-state/FightStateContext';
import { formatDecimal, formatNumber, formatStopwatch } from '../utils/format';

export type MobileStatsBarProps = {
  readonly derived: DerivedStats;
  readonly phaseLabel: string | null;
  readonly phaseProgress: { current: number; total: number } | null;
};

type MobileStat = {
  readonly id: string;
  readonly label: string;
  readonly primary: string;
  readonly meta?: string | null;
  readonly title?: string;
};

export const MobileStatsBar: FC<MobileStatsBarProps> = ({
  derived,
  phaseLabel,
  phaseProgress,
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
      id: 'phase',
      label: 'Phase',
      primary:
        phaseProgress != null ? `${phaseProgress.current}/${phaseProgress.total}` : '—',
      title: phaseLabel ?? undefined,
    },
  ];

  return (
    <dl className="mobile-stats" aria-label="Combat metrics">
      {metrics.map((metric) => (
        <div key={metric.id} className="mobile-stats__item" title={metric.title}>
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
