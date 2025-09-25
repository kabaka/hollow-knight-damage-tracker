import type { FC } from 'react';
import { useMemo } from 'react';

import {
  hasStrengthCharm,
  useFightState,
  type AttackCategory,
} from '../fight-state/FightStateContext';
import { nailUpgrades, shamanStoneMultipliers, spells } from '../../data';

type AttackDefinition = {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  soulCost?: number;
  description?: string;
};

type AttackGroup = {
  id: string;
  label: string;
  attacks: AttackDefinition[];
};

const NAIL_ART_MULTIPLIERS: Record<string, number> = {
  'great-slash': 2.5,
  'dash-slash': 2,
  'cyclone-slash-hit': 1,
};

const getVariantDamage = (variant: (typeof spells)[number]['base']) => {
  if (typeof variant.damage === 'number') {
    return variant.damage;
  }
  if (typeof variant.totalDamage === 'number') {
    return variant.totalDamage;
  }
  if (Array.isArray(variant.damageBreakdown)) {
    return variant.damageBreakdown.reduce((total, hit) => total + hit.damage, 0);
  }
  return 0;
};

const buildAttackGroups = (
  state: ReturnType<typeof useFightState>['state'],
): AttackGroup[] => {
  const { build } = state;

  const nailUpgrade =
    nailUpgrades.find((upgrade) => upgrade.id === build.nailUpgradeId) ?? nailUpgrades[0];
  const hasStrength = hasStrengthCharm(build.activeCharmIds);
  const baseNailDamage = nailUpgrade?.damage ?? 0;
  const nailDamage = Math.round(baseNailDamage * (hasStrength ? 1.5 : 1));
  const hasShamanStone = build.activeCharmIds.includes('shaman-stone');
  const hasSpellTwister = build.activeCharmIds.includes('spell-twister');
  const soulDiscount = hasSpellTwister ? 9 : 0;

  const nailAttacks: AttackDefinition[] = [
    {
      id: 'nail-strike',
      label: 'Nail Strike',
      damage: nailDamage,
      category: 'nail',
      description: hasStrength ? 'Includes Strength charm bonus.' : undefined,
    },
  ];

  const advancedAttacks: AttackDefinition[] = Object.entries(NAIL_ART_MULTIPLIERS).map(
    ([id, multiplier]) => {
      const baseLabel =
        id === 'cyclone-slash-hit'
          ? 'Cyclone Slash (per hit)'
          : id === 'dash-slash'
            ? 'Dash Slash'
            : 'Great Slash';
      return {
        id,
        label: baseLabel,
        damage: Math.round(nailDamage * multiplier),
        category: 'advanced',
        description:
          id === 'cyclone-slash-hit'
            ? 'Log each Cyclone Slash hit individually.'
            : 'Nail Art damage.',
      };
    },
  );

  const spellAttacks: AttackDefinition[] = [];
  const spellUpgrades: AttackDefinition[] = [];

  for (const spell of spells) {
    const level = build.spellLevels[spell.id] ?? 'base';
    const variant = level === 'upgrade' && spell.upgrade ? spell.upgrade : spell.base;
    const baseDamage = getVariantDamage(variant);
    const multiplier = hasShamanStone
      ? (shamanStoneMultipliers.get(variant.key) ?? 1)
      : 1;
    const damage = Math.round(baseDamage * multiplier);
    const soulCost = Math.max(0, spell.soulCost - soulDiscount);
    const attack: AttackDefinition = {
      id: `${spell.id}-${variant.key}`,
      label: variant.name,
      damage,
      category: 'spell',
      soulCost,
      description: hasShamanStone ? 'Shaman Stone bonus applied.' : undefined,
    };
    spellAttacks.push(attack);

    if (level === 'upgrade' && spell.upgrade) {
      spellUpgrades.push({
        ...attack,
        category: 'advanced',
      });
    }
  }

  const groups: AttackGroup[] = [
    { id: 'nail-attacks', label: 'Nail Attacks', attacks: nailAttacks },
    { id: 'spellcasting', label: 'Spells', attacks: spellAttacks },
    {
      id: 'advanced-techniques',
      label: 'Advanced Techniques',
      attacks: [...advancedAttacks, ...spellUpgrades],
    },
  ];

  return groups;
};

export const AttackLogPanel: FC = () => {
  const fight = useFightState();
  const { actions } = fight;

  const attackGroups = useMemo(() => buildAttackGroups(fight.state), [fight.state]);

  return (
    <div>
      <p className="section__description">
        Log each successful hit to reduce the boss health target. Use the buttons below to
        record standard swings, spells, and advanced techniques with the appropriate
        modifiers applied.
      </p>
      <div className="attack-groups">
        {attackGroups.map((group) => (
          <section key={group.id} className="attack-group">
            <h3 className="attack-group__title">{group.label}</h3>
            <div className="button-grid" role="group" aria-label={group.label}>
              {group.attacks.map((attack) => (
                <button
                  key={attack.id}
                  type="button"
                  className="button-grid__button"
                  onClick={() =>
                    actions.logAttack({
                      id: attack.id,
                      label: attack.label,
                      damage: attack.damage,
                      category: attack.category,
                      soulCost: attack.soulCost,
                    })
                  }
                >
                  <span className="button-grid__label">{attack.label}</span>
                  <span className="button-grid__meta">
                    <span className="button-grid__damage" aria-hidden="true">
                      {attack.damage}
                    </span>
                    {typeof attack.soulCost === 'number' ? (
                      <span className="button-grid__soul" aria-label="Soul cost">
                        {attack.soulCost} SOUL
                      </span>
                    ) : null}
                  </span>
                  {attack.description ? (
                    <span className="button-grid__description">{attack.description}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
