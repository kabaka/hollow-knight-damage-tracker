import type { FC } from 'react';

import { useFightState } from '../fight-state/FightStateContext';

const formatInteger = (value: number) => value.toLocaleString();

const formatDecimal = (value: number | null, fractionDigits = 1) =>
  value == null ? '—' : value.toFixed(fractionDigits);

const formatDuration = (elapsedMs: number | null) => {
  if (!elapsedMs || elapsedMs <= 0) {
    return '—';
  }

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const CombatStatsPanel: FC = () => {
  const {
    derived: {
      targetHp,
      totalDamage,
      remainingHp,
      attacksLogged,
      averageDamage,
      dps,
      actionsPerMinute,
      elapsedMs,
    },
  } = useFightState();

  const stats = [
    { label: 'Target HP', value: formatInteger(targetHp) },
    { label: 'Damage Logged', value: formatInteger(totalDamage) },
    { label: 'Remaining HP', value: formatInteger(remainingHp) },
    { label: 'Attacks Logged', value: attacksLogged.toString() },
    { label: 'Average Damage', value: formatDecimal(averageDamage) },
    { label: 'DPS', value: formatDecimal(dps) },
    { label: 'Actions / Min', value: formatDecimal(actionsPerMinute) },
    { label: 'Elapsed', value: formatDuration(elapsedMs) },
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
          <span className="data-list__value">{stat.value}</span>
        </div>
      ))}
    </div>
  );
};
