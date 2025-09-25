import type { FC } from 'react';

const attackPresets = [
  { id: 'nail-swing', label: 'Nail Swing', damage: 13 },
  { id: 'dash-slash', label: 'Dash Slash', damage: 17 },
  { id: 'great-slash', label: 'Great Slash', damage: 20 },
  { id: 'shade-soul', label: 'Shade Soul', damage: 30 },
  { id: 'abyss-shriek', label: 'Abyss Shriek', damage: 80 },
];

export const AttackLogPanel: FC = () => {
  return (
    <div>
      <p className="section__description">
        Log each successful hit to reduce the boss health target. The real-time log and
        undo controls will be implemented in the next milestone.
      </p>
      <div className="button-grid" role="group" aria-label="Record an attack">
        {attackPresets.map((attack) => (
          <button key={attack.id} type="button" className="button-grid__button">
            <span>{attack.label}</span>
            <span aria-hidden="true">{attack.damage}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
