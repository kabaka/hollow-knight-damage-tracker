import type { FC } from 'react';

const placeholderStats = [
  { label: 'Target HP', value: '2,100' },
  { label: 'Damage Logged', value: '0' },
  { label: 'Remaining HP', value: '2,100' },
  { label: 'Average Damage', value: '—' },
  { label: 'DPS', value: '—' },
  { label: 'Actions / Min', value: '—' },
];

export const CombatStatsPanel: FC = () => {
  return (
    <div className="data-list" aria-live="polite">
      <p className="section__description">
        This summary will update as soon as attack logging is wired to persistent state.
        For now it describes the metrics we will surface.
      </p>
      {placeholderStats.map((stat) => (
        <div key={stat.label} className="data-list__item">
          <span className="data-list__label">{stat.label}</span>
          <span className="data-list__value">{stat.value}</span>
        </div>
      ))}
    </div>
  );
};
