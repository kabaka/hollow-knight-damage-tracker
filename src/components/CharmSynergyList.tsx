import type { FC } from 'react';

import type { Charm, CharmSynergy } from '../data';

export type CharmSynergyStatus = {
  synergy: CharmSynergy;
  isActive: boolean;
};

type CharmSynergyListProps = {
  readonly statuses: CharmSynergyStatus[];
  readonly charmDetails: Map<string, Charm>;
  readonly iconMap: Map<string, string>;
};

const CATEGORY_LABELS = new Map<string, string>([
  ['movement', 'Movement'],
  ['combat', 'Combat'],
  ['healing-defense', 'Healing & Defense'],
  ['minion', 'Minions'],
]);

const CATEGORY_ORDER = ['movement', 'combat', 'healing-defense', 'minion'] as const;

const getCategoryLabel = (category: string) => {
  const preset = CATEGORY_LABELS.get(category);
  if (preset) {
    return preset;
  }
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

export const CharmSynergyList: FC<CharmSynergyListProps> = ({
  statuses,
  charmDetails,
  iconMap,
}) => {
  if (statuses.length === 0) {
    return null;
  }

  const activeCount = statuses.reduce(
    (total, status) => (status.isActive ? total + 1 : total),
    0,
  );

  const grouped = new Map<string, CharmSynergyStatus[]>();
  for (const status of statuses) {
    const list = grouped.get(status.synergy.category) ?? [];
    list.push(status);
    grouped.set(status.synergy.category, list);
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((category) => grouped.has(category)),
    ...[...grouped.keys()].filter(
      (category) => !CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number]),
    ),
  ];

  return (
    <div className="synergy-panel">
      <div className="synergy-panel__header">
        <h4 className="synergy-panel__title">Synergies</h4>
        <span
          className="synergy-panel__summary"
          aria-label={`${activeCount} active synergies`}
        >
          {activeCount}/{statuses.length}
        </span>
      </div>
      {orderedCategories.map((category) => {
        const items = grouped.get(category);
        if (!items || items.length === 0) {
          return null;
        }
        const sortedItems = [...items].sort((a, b) => {
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
          }
          return a.synergy.name.localeCompare(b.synergy.name);
        });
        const label = getCategoryLabel(category);
        return (
          <div key={category} className="synergy-section">
            <h5 className="synergy-section__title">{label}</h5>
            <ul className="synergy-list" role="list">
              {sortedItems.map(({ synergy, isActive }) => {
                const statusClasses = ['synergy-list__item'];
                if (isActive) {
                  statusClasses.push('synergy-list__item--active');
                }
                return (
                  <li key={synergy.id} className={statusClasses.join(' ')}>
                    <div className="synergy-list__icons" aria-hidden="true">
                      {synergy.charmIds.map((charmId) => {
                        const icon = iconMap.get(charmId);
                        const charm = charmDetails.get(charmId);
                        if (!icon || !charm) {
                          return null;
                        }
                        const iconClasses = ['synergy-list__icon'];
                        if (!isActive) {
                          iconClasses.push('synergy-list__icon--inactive');
                        }
                        return (
                          <img
                            key={charmId}
                            src={icon}
                            alt=""
                            className={iconClasses.join(' ')}
                          />
                        );
                      })}
                    </div>
                    <div className="synergy-list__body">
                      <p className="synergy-list__name">{synergy.name}</p>
                      <p className="synergy-list__description">{synergy.description}</p>
                    </div>
                    <div
                      className="synergy-list__status"
                      title={isActive ? 'Synergy active' : 'Synergy inactive'}
                    >
                      <span
                        className={`synergy-list__status-dot${
                          isActive ? ' synergy-list__status-dot--active' : ''
                        }`}
                        aria-hidden="true"
                      />
                      <span className="visually-hidden">
                        {isActive ? 'Synergy active' : 'Synergy inactive'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};
