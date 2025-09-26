import type { FC } from 'react';

import { useFightState } from '../fight-state/FightStateContext';
import { Sparkline } from './Sparkline';

const formatInteger = (value: number) => value.toLocaleString();

const formatDecimal = (value: number | null, fractionDigits = 1) =>
  value == null ? '—' : value.toFixed(fractionDigits);

const formatDuration = (elapsedMs: number | null) => {
  if (elapsedMs == null) {
    return '—';
  }

  if (elapsedMs <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const buildCumulativeSeries = (values: number[]) => {
  let runningTotal = 0;
  return values.map((value) => {
    runningTotal += value;
    return runningTotal;
  });
};

export const CombatStatsPanel: FC = () => {
  const {
    state: { damageLog },
    derived: {
      targetHp,
      totalDamage,
      remainingHp,
      attacksLogged,
      averageDamage,
      dps,
      actionsPerMinute,
      elapsedMs,
      estimatedTimeRemainingMs,
    },
  } = useFightState();

  const damagePerHitSeries = damageLog.map((event) => event.damage);
  const cumulativeDamageSeries = buildCumulativeSeries(damagePerHitSeries);
  const remainingHpSeries = cumulativeDamageSeries.map((total) =>
    Math.max(0, targetHp - total),
  );
  const dpsSeries = damageLog.map((event, index) => {
    if (index === 0) {
      return 0;
    }

    const startTimestamp = damageLog[0]?.timestamp ?? event.timestamp;
    const elapsed = event.timestamp - startTimestamp;
    const cumulativeDamage = cumulativeDamageSeries[index] ?? 0;

    if (elapsed <= 0) {
      return cumulativeDamage;
    }

    return cumulativeDamage / (elapsed / 1000);
  });

  const stats = [
    { label: 'Target HP', value: formatInteger(targetHp) },
    {
      label: 'Damage Logged',
      value: formatInteger(totalDamage),
      trend: {
        data: cumulativeDamageSeries,
        ariaLabel: 'Total damage dealt per attack',
      },
    },
    {
      label: 'Remaining HP',
      value: formatInteger(remainingHp),
      trend: {
        data: remainingHpSeries,
        ariaLabel: 'Remaining health after each attack',
      },
    },
    { label: 'Attacks Logged', value: attacksLogged.toString() },
    {
      label: 'Average Damage',
      value: formatDecimal(averageDamage),
      trend: {
        data: damagePerHitSeries,
        ariaLabel: 'Damage dealt per logged attack',
      },
    },
    {
      label: 'DPS',
      value: formatDecimal(dps),
      trend: {
        data: dpsSeries,
        ariaLabel: 'Damage per second trend',
      },
    },
    { label: 'Actions / Min', value: formatDecimal(actionsPerMinute) },
    { label: 'Elapsed', value: formatDuration(elapsedMs) },
    {
      label: 'Estimated Time Remaining',
      value: formatDuration(estimatedTimeRemainingMs),
    },
  ];

  return (
    <div className="data-list" aria-live="polite">
      <p className="section__description">
        These stats update automatically as you log damage. Use them to verify if a build
        can close the gap before enrage timers or stagger opportunities end.
      </p>
      {stats.map((stat) => (
        <div key={stat.label} className="data-list__item">
          <span className="data-list__label">{stat.label}</span>
          <span className="data-list__value">
            <span className="data-list__value-text">{stat.value}</span>
            {stat.trend && stat.trend.data.length >= 2 ? (
              <Sparkline data={stat.trend.data} ariaLabel={stat.trend.ariaLabel} />
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
};
