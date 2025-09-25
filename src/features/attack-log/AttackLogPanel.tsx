import type { FC } from 'react';
import { useEffect, useMemo } from 'react';

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

type AttackWithMetadata = AttackDefinition & {
  hotkey?: string;
  hitsRemaining: number | null;
};

type AttackGroupWithMetadata = {
  id: string;
  label: string;
  attacks: AttackWithMetadata[];
};

const KEY_SEQUENCE = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '0',
  'q',
  'w',
  'e',
  'r',
  't',
  'y',
  'u',
  'i',
  'o',
  'p',
  'a',
  's',
  'd',
  'f',
  'g',
  'h',
  'j',
  'k',
  'l',
  ';',
  'z',
  'x',
  'c',
  'v',
  'b',
  'n',
  'm',
  ',',
  '.',
  '/',
];

const RESET_SHORTCUT_KEY = 'Escape';

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
  const { actions, state, derived } = fight;
  const { damageLog, redoStack } = state;

  const attackGroups = useMemo(() => buildAttackGroups(state), [state]);

  const { groupsWithMetadata, shortcutMap } = useMemo(() => {
    const map = new Map<string, AttackDefinition>();
    let hotkeyIndex = 0;

    const groups: AttackGroupWithMetadata[] = attackGroups.map((group) => ({
      ...group,
      attacks: group.attacks.map((attack) => {
        const hotkey = KEY_SEQUENCE[hotkeyIndex];
        hotkeyIndex += 1;

        if (hotkey) {
          map.set(hotkey, attack);
        }

        const hitsRemaining =
          attack.damage > 0
            ? Math.ceil(Math.max(0, derived.remainingHp) / attack.damage)
            : null;

        return {
          ...attack,
          hotkey,
          hitsRemaining,
        } satisfies AttackWithMetadata;
      }),
    }));

    return { groupsWithMetadata: groups, shortcutMap: map };
  }, [attackGroups, derived.remainingHp]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const interactiveElement = target.closest(
          'input, textarea, select, [contenteditable="true"]',
        );
        if (interactiveElement) {
          return;
        }
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === RESET_SHORTCUT_KEY) {
        if (state.damageLog.length === 0 && state.redoStack.length === 0) {
          return;
        }
        event.preventDefault();
        actions.resetLog();
        return;
      }

      if (key.length === 1) {
        const attack = shortcutMap.get(key);
        if (!attack) {
          return;
        }

        event.preventDefault();
        actions.logAttack({
          id: attack.id,
          label: attack.label,
          damage: attack.damage,
          category: attack.category,
          soulCost: attack.soulCost,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, shortcutMap, state.damageLog.length, state.redoStack.length]);

  return (
    <div>
      <p className="section__description">
        Log each successful hit to reduce the boss health target. Use the buttons below to
        record standard swings, spells, and advanced techniques with the appropriate
        modifiers applied.
      </p>
      <div className="quick-actions" role="group" aria-label="Attack log controls">
        <button
          type="button"
          className="quick-actions__button"
          onClick={actions.undoLastAttack}
          disabled={damageLog.length === 0}
        >
          Undo
        </button>
        <button
          type="button"
          className="quick-actions__button"
          onClick={actions.redoLastAttack}
          disabled={redoStack.length === 0}
        >
          Redo
        </button>
        <button
          type="button"
          className="quick-actions__button"
          onClick={actions.resetLog}
          aria-keyshortcuts="Esc"
          disabled={damageLog.length === 0 && redoStack.length === 0}
        >
          Quick reset (Esc)
        </button>
      </div>
      <div className="attack-groups">
        {groupsWithMetadata.map((group) => (
          <section key={group.id} className="attack-group">
            <h3 className="attack-group__title">{group.label}</h3>
            <div className="button-grid" role="group" aria-label={group.label}>
              {group.attacks.map((attack) => (
                <button
                  key={attack.id}
                  type="button"
                  className="button-grid__button"
                  aria-keyshortcuts={attack.hotkey?.toUpperCase()}
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
                  <div className="button-grid__header">
                    <span className="button-grid__label">{attack.label}</span>
                    {attack.hotkey ? (
                      <span className="button-grid__hotkey" aria-hidden="true">
                        {attack.hotkey.toUpperCase()}
                      </span>
                    ) : null}
                  </div>
                  {attack.hotkey ? (
                    <span className="visually-hidden">
                      Shortcut key {attack.hotkey.toUpperCase()}.
                    </span>
                  ) : null}
                  <span className="button-grid__meta">
                    <span className="button-grid__damage" aria-label="Damage per hit">
                      {attack.damage}
                    </span>
                    {typeof attack.soulCost === 'number' ? (
                      <span className="button-grid__soul" aria-label="Soul cost">
                        {attack.soulCost} SOUL
                      </span>
                    ) : null}
                    {typeof attack.hitsRemaining === 'number' ? (
                      <span
                        className="button-grid__hits"
                        aria-label="Hits to finish with this attack"
                      >
                        Hits to finish: {attack.hitsRemaining}
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
