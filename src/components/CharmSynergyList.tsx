import { useMemo, useState, type FC } from 'react';

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

type CharmSynergySection = {
  key: string;
  label: string;
  items: CharmSynergyStatus[];
};

const CATEGORY_LABELS = new Map<string, string>([
  ['movement', 'Movement'],
  ['combat', 'Combat'],
  ['healing-defense', 'Healing & Defense'],
  ['minion', 'Minions'],
]);

const CATEGORY_ORDER = ['movement', 'combat', 'healing-defense', 'minion'] as const;

const isPresetCategory = (
  category: string,
): category is (typeof CATEGORY_ORDER)[number] =>
  CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number]);

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
  const [showAllSynergies, setShowAllSynergies] = useState(false);

  const activeCount = useMemo(
    () => statuses.reduce((total, status) => (status.isActive ? total + 1 : total), 0),
    [statuses],
  );

  const visibleStatuses = useMemo(
    () => (showAllSynergies ? statuses : statuses.filter((status) => status.isActive)),
    [showAllSynergies, statuses],
  );

  const grouped = useMemo(() => {
    const collection = new Map<string, CharmSynergyStatus[]>();
    for (const status of visibleStatuses) {
      const list = collection.get(status.synergy.category) ?? [];
      list.push(status);
      collection.set(status.synergy.category, list);
    }
    return collection;
  }, [visibleStatuses]);

  const orderedCategories = useMemo(
    () => [
      ...CATEGORY_ORDER.filter((category) => grouped.has(category)),
      ...[...grouped.keys()].filter((category) => !isPresetCategory(category)),
    ],
    [grouped],
  );

  const categorySections = useMemo<CharmSynergySection[]>(() => {
    return orderedCategories
      .map((category) => {
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
        return {
          key: category,
          label: getCategoryLabel(category),
          items: sortedItems,
        };
      })
      .filter((section): section is CharmSynergySection => section !== null);
  }, [grouped, orderedCategories]);

  const shouldHideCategories = !showAllSynergies;

  const sections = useMemo<CharmSynergySection[]>(() => {
    if (!shouldHideCategories) {
      return categorySections;
    }

    if (categorySections.length === 0) {
      return [];
    }

    return [
      {
        key: 'active-only',
        label: '',
        items: categorySections.flatMap((section) => section.items),
      },
    ];
  }, [categorySections, shouldHideCategories]);

  const toggleLabel = showAllSynergies ? 'Show active synergies' : 'Show all synergies';

  if (statuses.length === 0) {
    return null;
  }

  return (
    <div className="synergy-panel">
      <div className="synergy-panel__header">
        <h4 className="synergy-panel__title">Synergies</h4>
        <div className="synergy-panel__meta">
          <span
            className="synergy-panel__summary"
            aria-label={`${activeCount} active synergies`}
          >
            {activeCount}/{statuses.length}
          </span>
          <button
            type="button"
            className="synergy-panel__toggle"
            onClick={() => {
              setShowAllSynergies((previous) => !previous);
            }}
            aria-pressed={showAllSynergies}
          >
            {toggleLabel}
          </button>
        </div>
      </div>
      {sections.map(({ key, label, items }) => {
        return (
          <div key={key} className="synergy-section">
            {label ? <h5 className="synergy-section__title">{label}</h5> : null}
            <ul className="synergy-list">
              {items.map(({ synergy, isActive }) => {
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
