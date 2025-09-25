import type { FC } from 'react';
import { useEffect, useMemo } from 'react';

import {
  hasStrengthCharm,
  useFightState,
  type AttackCategory,
} from '../fight-state/FightStateContext';
import { charmMap, nailUpgrades, shamanStoneMultipliers, spells } from '../../data';

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

const FURY_MULTIPLIER = 1.75;
const GRUBBERFLY_BEAM_MULTIPLIER = 0.5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toNumberArray = (value: unknown): number[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'number')
    ? (value as number[])
    : null;

const getNailArtLabel = (id: string) =>
  id === 'cyclone-slash-hit'
    ? 'Cyclone Slash (per hit)'
    : id === 'dash-slash'
      ? 'Dash Slash'
      : 'Great Slash';

const getCharmEffect = (charmId: string, effectType: string) =>
  charmMap.get(charmId)?.effects.find((effect) => effect.type === effectType);

const getCharmEffectRecord = (charmId: string, effectType: string) => {
  const effect = getCharmEffect(charmId, effectType);
  return effect && isRecord(effect.value) ? effect.value : null;
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
  const hasFury = build.activeCharmIds.includes('fury-of-the-fallen');
  const hasShamanStone = build.activeCharmIds.includes('shaman-stone');
  const hasSpellTwister = build.activeCharmIds.includes('spell-twister');
  const hasFlukenest = build.activeCharmIds.includes('flukenest');

  const baseNailDamage = nailUpgrade?.damage ?? 0;
  const strengthMultiplier = hasStrength ? 1.5 : 1;
  const nailDamageExact = baseNailDamage * strengthMultiplier;
  const nailDamage = Math.round(nailDamageExact);
  const furyMultiplier = hasFury ? FURY_MULTIPLIER : 1;
  const furyNailDamageExact = nailDamageExact * furyMultiplier;
  const soulDiscount = hasSpellTwister ? 9 : 0;

  const nailAttacks: AttackDefinition[] = [
    {
      id: 'nail-strike',
      label: 'Nail Strike',
      damage: nailDamage,
      category: 'nail',
      description:
        [
          hasStrength ? 'Includes Strength charm bonus.' : null,
          hasFury ? 'Use the Fury variant below when at 1 HP.' : null,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
    },
  ];

  const advancedAttacks: AttackDefinition[] = Object.entries(NAIL_ART_MULTIPLIERS).map(
    ([id, multiplier]) => {
      const baseLabel = getNailArtLabel(id);
      const notes: string[] = [];
      if (id === 'cyclone-slash-hit') {
        notes.push('Log each Cyclone Slash hit individually.');
      } else {
        notes.push('Nail Art damage.');
      }
      if (hasStrength) {
        notes.push('Includes Strength charm bonus.');
      }
      if (hasFury) {
        notes.push('Use Fury variants from Charm Effects at 1 HP.');
      }
      return {
        id,
        label: baseLabel,
        damage: Math.round(nailDamageExact * multiplier),
        category: 'advanced',
        description: notes.join(' '),
      };
    },
  );

  const spellAttacks: AttackDefinition[] = [];
  const spellUpgrades: AttackDefinition[] = [];

  for (const spell of spells) {
    const level = build.spellLevels[spell.id] ?? 'base';
    const variant = level === 'upgrade' && spell.upgrade ? spell.upgrade : spell.base;
    let baseDamage = getVariantDamage(variant);
    const notes: string[] = [];

    if (hasFlukenest && spell.id === 'vengeful-spirit') {
      const replacements = getCharmEffectRecord(
        'flukenest',
        'spell_replacement',
      ) as Record<string, unknown> | null;
      if (replacements && isRecord(replacements[variant.key])) {
        const replacement = replacements[variant.key] as Record<string, unknown>;
        const totalDamage = toNumber(replacement.totalDamage);
        const projectiles = toNumber(replacement.projectiles);
        const damagePerProjectile = toNumber(replacement.damagePerProjectile);
        if (totalDamage !== null) {
          baseDamage = totalDamage;
          const detailParts: string[] = [];
          if (projectiles !== null) {
            detailParts.push(`${projectiles} projectiles`);
          }
          if (damagePerProjectile !== null) {
            detailParts.push(`${damagePerProjectile} dmg each`);
          }
          const details = detailParts.length > 0 ? ` (${detailParts.join(' • ')})` : '';
          notes.push(`Flukenest volley${details}.`);
        }
      }
    }

    const multiplier = hasShamanStone
      ? (shamanStoneMultipliers.get(variant.key) ?? 1)
      : 1;
    if (hasShamanStone) {
      notes.push('Shaman Stone bonus applied.');
    }
    const damage = Math.round(baseDamage * multiplier);
    const soulCost = Math.max(0, spell.soulCost - soulDiscount);
    if (hasSpellTwister && soulDiscount > 0) {
      notes.push('Spell Twister reduces SOUL cost.');
    }
    const attack: AttackDefinition = {
      id: `${spell.id}-${variant.key}`,
      label: variant.name,
      damage,
      category: 'spell',
      soulCost,
      description: notes.length > 0 ? notes.join(' ') : undefined,
    };
    spellAttacks.push(attack);

    if (level === 'upgrade' && spell.upgrade) {
      spellUpgrades.push({
        ...attack,
        category: 'advanced',
      });
    }
  }

  const charmAttacks: AttackDefinition[] = [];

  const addCharmAttack = (attack: AttackDefinition) => {
    if (attack.damage <= 0) {
      return;
    }
    charmAttacks.push(attack);
  };

  const addNailScaledCharmAttack = (
    id: string,
    label: string,
    damageExact: number,
    baseDescription: string,
    { includeFuryVariant = false }: { includeFuryVariant?: boolean } = {},
  ) => {
    addCharmAttack({
      id,
      label,
      damage: Math.round(damageExact),
      category: 'charm',
      description: baseDescription,
    });

    if (includeFuryVariant && hasFury) {
      addCharmAttack({
        id: `${id}-fury`,
        label: `${label} (Fury)`,
        damage: Math.round(damageExact * furyMultiplier),
        category: 'charm',
        description: 'Requires 1 HP for Fury of the Fallen to trigger.',
      });
    }
  };

  for (const charmId of build.activeCharmIds) {
    switch (charmId) {
      case 'fury-of-the-fallen': {
        if (hasFury) {
          addCharmAttack({
            id: 'nail-strike-fury',
            label: 'Nail Strike (Fury)',
            damage: Math.round(furyNailDamageExact),
            category: 'charm',
            description: 'Requires 1 HP for Fury of the Fallen to trigger.',
          });

          for (const [artId, multiplier] of Object.entries(NAIL_ART_MULTIPLIERS)) {
            addCharmAttack({
              id: `${artId}-fury`,
              label: `${getNailArtLabel(artId)} (Fury)`,
              damage: Math.round(nailDamageExact * multiplier * furyMultiplier),
              category: 'charm',
              description: 'Requires 1 HP for Fury of the Fallen to trigger.',
            });
          }
        }
        break;
      }
      case 'grubberflys-elegy': {
        addCharmAttack({
          id: 'grubberflys-elegy-beam',
          label: "Grubberfly's Elegy Beam",
          damage: Math.round(nailDamageExact * GRUBBERFLY_BEAM_MULTIPLIER),
          category: 'charm',
          description: 'Full-health nail beam. Log each projectile that connects.',
        });
        break;
      }
      case 'thorns-of-agony': {
        addNailScaledCharmAttack(
          'thorns-of-agony',
          'Thorns of Agony Burst',
          nailDamageExact,
          'Retaliation burst equal to current nail damage.',
          { includeFuryVariant: true },
        );
        break;
      }
      case 'sharp-shadow': {
        addNailScaledCharmAttack(
          'sharp-shadow',
          'Sharp Shadow Dash',
          nailDamageExact,
          'Shadow dash contact damage equal to current nail damage.',
          { includeFuryVariant: true },
        );
        break;
      }
      case 'dreamshield': {
        addNailScaledCharmAttack(
          'dreamshield',
          'Dreamshield Hit',
          nailDamageExact,
          'Orbiting shield contact damage equal to current nail damage.',
          { includeFuryVariant: true },
        );
        break;
      }
      case 'defenders-crest': {
        const auraData = getCharmEffectRecord('defenders-crest', 'damage_aura') as {
          minDamage?: unknown;
          maxDamage?: unknown;
          tickRateSeconds?: unknown;
        } | null;
        if (auraData) {
          const minDamage = toNumber(auraData.minDamage);
          const maxDamage = toNumber(auraData.maxDamage);
          const tickRate = toNumber(auraData.tickRateSeconds) ?? 0.25;
          const averageDamage =
            minDamage !== null && maxDamage !== null
              ? (minDamage + maxDamage) / 2
              : (maxDamage ?? minDamage);
          if (averageDamage !== null) {
            addCharmAttack({
              id: 'defenders-crest',
              label: "Defender's Crest Tick",
              damage: Math.round(averageDamage * 100) / 100,
              category: 'charm',
              description: `Toxic cloud tick (~${tickRate.toFixed(2)}s cadence, ${
                minDamage ?? '?'
              }-${maxDamage ?? '?'} damage).`,
            });
          }
        }
        break;
      }
      case 'spore-shroom': {
        const sporeData = getCharmEffectRecord('spore-shroom', 'focus_damage_cloud') as {
          totalDamage?: unknown;
          durationSeconds?: unknown;
        } | null;
        if (sporeData) {
          const totalDamage = toNumber(sporeData.totalDamage);
          const duration = toNumber(sporeData.durationSeconds);
          if (totalDamage !== null) {
            const parts = ['Full spore cloud damage.'];
            if (duration !== null) {
              parts.push(`${duration.toFixed(1)}s duration.`);
            }
            parts.push('Log partial ticks proportionally if needed.');
            addCharmAttack({
              id: 'spore-shroom',
              label: 'Spore Shroom Cloud',
              damage: totalDamage,
              category: 'charm',
              description: parts.join(' '),
            });
          }
        }
        break;
      }
      case 'glowing-womb': {
        const wombData = getCharmEffectRecord('glowing-womb', 'minion_summon') as {
          damage?: unknown;
          soulCost?: unknown;
        } | null;
        if (wombData) {
          const damage = toNumber(wombData.damage);
          const soulCost = toNumber(wombData.soulCost) ?? undefined;
          if (damage !== null) {
            addCharmAttack({
              id: 'glowing-womb',
              label: 'Hatchling Impact',
              damage,
              category: 'charm',
              soulCost,
              description: 'Each hatchling kamikaze deals this damage.',
            });
          }
        }
        break;
      }
      case 'weaversong': {
        const weaverData = getCharmEffectRecord('weaversong', 'minion_summon') as {
          count?: unknown;
          damage?: unknown;
        } | null;
        if (weaverData) {
          const damage = toNumber(weaverData.damage);
          const count = toNumber(weaverData.count);
          if (damage !== null) {
            const info = ['Per weaverling strike.'];
            if (count !== null) {
              info.push(`${count} weaverlings active.`);
            }
            addCharmAttack({
              id: 'weaversong',
              label: 'Weaverling Hit',
              damage,
              category: 'charm',
              description: info.join(' '),
            });
          }
        }
        break;
      }
      case 'grimmchild': {
        const grimmchildData = getCharmEffectRecord('grimmchild', 'minion_summon') as {
          damagePerLevel?: unknown;
        } | null;
        if (grimmchildData) {
          const damagePerLevel = toNumberArray(grimmchildData.damagePerLevel);
          if (damagePerLevel) {
            damagePerLevel.forEach((damage, index) => {
              addCharmAttack({
                id: `grimmchild-level-${index + 1}`,
                label: `Grimmchild Lv.${index + 1}`,
                damage,
                category: 'charm',
                description: 'Per Grimmchild fireball hit.',
              });
            });
          }
        }
        break;
      }
      default:
        break;
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

  if (charmAttacks.length > 0) {
    groups.push({ id: 'charm-effects', label: 'Charm Effects', attacks: charmAttacks });
  }

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
