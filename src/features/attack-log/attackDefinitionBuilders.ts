import {
  charmMap,
  charmSynergyKeyMap,
  getCharmSynergyKey,
  nailUpgrades,
  shamanStoneMultipliers,
  spells,
} from '../../data';
import { NAIL_ARTS } from './attackData';
import {
  hasStrengthCharm,
  type AttackCategory,
  type FightState,
} from '../fight-state/FightStateContext';

export type AttackDefinition = {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  soulCost?: number;
  description?: string;
};

export type AttackGroup = {
  id: string;
  label: string;
  attacks: AttackDefinition[];
};

export type AttackWithMetadata = AttackDefinition & {
  hotkey?: string;
  hitsRemaining: number | null;
};

export type AttackGroupWithMetadata = {
  id: string;
  label: string;
  attacks: AttackWithMetadata[];
};

export const KEY_SEQUENCE = [
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

export const RESET_SHORTCUT_KEY = 'Escape';

export const FURY_MULTIPLIER = 1.75;
const GRUBBERFLY_BEAM_MULTIPLIER = 0.5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'number');

const toNumberArray = (value: unknown): number[] | null =>
  isNumberArray(value) ? value : null;

const getCharmEffect = (charmId: string, effectType: string) =>
  charmMap.get(charmId)?.effects.find((effect) => effect.type === effectType);

const getCharmEffectRecord = (charmId: string, effectType: string) => {
  const effect = getCharmEffect(charmId, effectType);
  return effect && isRecord(effect.value) ? effect.value : null;
};

const getCharmSynergy = (charmIds: readonly string[]) =>
  charmSynergyKeyMap.get(getCharmSynergyKey(charmIds));

const getCharmSynergyEffect = (charmIds: readonly string[], effectType: string) =>
  getCharmSynergy(charmIds)?.effects.find((effect) => effect.type === effectType) ?? null;

const getCharmSynergyEffectRecord = (charmIds: readonly string[], effectType: string) => {
  const effect = getCharmSynergyEffect(charmIds, effectType);
  return effect && isRecord(effect.value) ? effect.value : null;
};

const getCharmSynergyEffectNumber = (charmIds: readonly string[], effectType: string) => {
  const effect = getCharmSynergyEffect(charmIds, effectType);
  return effect ? toNumber(effect.value) : null;
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

export function buildAttackGroups(build: FightState['build']): AttackGroup[] {
  if (nailUpgrades.length === 0) {
    throw new Error('Nail upgrade data is unavailable.');
  }

  const fallbackNailUpgrade = nailUpgrades[0];

  const nailUpgrade =
    nailUpgrades.find((upgrade) => upgrade.id === build.nailUpgradeId) ??
    fallbackNailUpgrade;
  const hasStrength = hasStrengthCharm(build.activeCharmIds);
  const hasFury = build.activeCharmIds.includes('fury-of-the-fallen');
  const hasShamanStone = build.activeCharmIds.includes('shaman-stone');
  const hasSpellTwister = build.activeCharmIds.includes('spell-twister');
  const hasFlukenest = build.activeCharmIds.includes('flukenest');
  const hasDashmaster = build.activeCharmIds.includes('dashmaster');
  const hasDefendersCrest = build.activeCharmIds.includes('defenders-crest');
  const hasDeepFocus = build.activeCharmIds.includes('deep-focus');
  const hasGrubsong = build.activeCharmIds.includes('grubsong');

  const baseNailDamage = nailUpgrade.damage;
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

  const nailArtLabelMap = new Map<string, string>(
    NAIL_ARTS.map<[string, string]>((art) => [art.id, art.label]),
  );

  const nailArtAttacks: AttackDefinition[] = NAIL_ARTS.map(
    ({ id, label, multiplier, baseDescription }) => {
      const notes: string[] = [baseDescription];
      if (hasStrength) {
        notes.push('Includes Strength charm bonus.');
      }
      if (hasFury) {
        notes.push('Use Fury variants from Charm Effects at 1 HP.');
      }
      return {
        id,
        label,
        damage: Math.round(nailDamageExact * multiplier),
        category: 'nail-art',
        description: notes.join(' '),
      };
    },
  );

  const spellAttacks: AttackDefinition[] = [];

  for (const spell of spells) {
    const level = build.spellLevels[spell.id];
    if (level === 'none') {
      continue;
    }
    const variant = level === 'upgrade' && spell.upgrade ? spell.upgrade : spell.base;
    let baseDamage = getVariantDamage(variant);
    const notes: string[] = [];

    if (hasFlukenest && spell.id === 'vengeful-spirit') {
      const crestReplacement = hasDefendersCrest
        ? getCharmSynergyEffectRecord(
            ['flukenest', 'defenders-crest'],
            'spell_replacement',
          )
        : null;
      const replacements =
        crestReplacement ?? getCharmEffectRecord('flukenest', 'spell_replacement');
      const replacement = replacements?.[variant.key];
      if (isRecord(replacement)) {
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
          if (hasDefendersCrest && crestReplacement) {
            notes.push(
              `Defender's Crest synergy: volatile fluke${details} with lingering dung cloud.`,
            );
          } else {
            notes.push(`Flukenest volley${details}.`);
          }
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

          for (const { id: artId, multiplier } of NAIL_ARTS) {
            addCharmAttack({
              id: `${artId}-fury`,
              label: `${nailArtLabelMap.get(artId) ?? artId} (Fury)`,
              damage: Math.round(nailDamageExact * multiplier * furyMultiplier),
              category: 'charm',
              description: 'Requires 1 HP for Fury of the Fallen to trigger.',
            });
          }
        }
        break;
      }
      case 'grubberflys-elegy': {
        const descriptionParts = [
          'Full-health nail beam. Log each projectile that connects.',
        ];
        if (hasFury) {
          descriptionParts.push(
            'At 1 HP, Fury of the Fallen disables Elegy beams—use the Fury nail variants below.',
          );
        }
        addCharmAttack({
          id: 'grubberflys-elegy-beam',
          label: "Grubberfly's Elegy Beam",
          damage: Math.round(nailDamageExact * GRUBBERFLY_BEAM_MULTIPLIER),
          category: 'charm',
          description: descriptionParts.join(' '),
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
        const synergyMultiplier = hasDashmaster
          ? (getCharmSynergyEffectNumber(
              ['dashmaster', 'sharp-shadow'],
              'shadow_dash_damage_nail_multiplier',
            ) ?? 1.5)
          : 1;
        const shadowDescription = hasDashmaster
          ? 'Shadow dash contact damage boosted to 1.5× nail damage thanks to Dashmaster.'
          : 'Shadow dash contact damage equal to current nail damage.';
        addNailScaledCharmAttack(
          'sharp-shadow',
          'Sharp Shadow Dash',
          nailDamageExact * synergyMultiplier,
          shadowDescription,
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
        const auraData = getCharmEffectRecord('defenders-crest', 'damage_aura');
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
        const crestEnhancedData = hasDefendersCrest
          ? getCharmSynergyEffectRecord(
              ['spore-shroom', 'defenders-crest'],
              'focus_damage_cloud',
            )
          : null;
        const sporeData =
          crestEnhancedData ?? getCharmEffectRecord('spore-shroom', 'focus_damage_cloud');
        if (sporeData) {
          const totalDamage = toNumber(sporeData.totalDamage);
          const duration = toNumber(sporeData.durationSeconds);
          if (totalDamage !== null) {
            const parts = ['Full spore cloud damage.'];
            if (duration !== null) {
              parts.push(`${duration.toFixed(1)}s duration.`);
            }
            if (hasDefendersCrest && crestEnhancedData) {
              parts.push("Defender's Crest synergy adds a heavier lingering cloud.");
            }
            const radiusMultiplier = hasDeepFocus
              ? getCharmSynergyEffectNumber(
                  ['spore-shroom', 'deep-focus'],
                  'focus_damage_cloud_radius_multiplier',
                )
              : null;
            if (radiusMultiplier && radiusMultiplier > 1) {
              const radiusIncrease = Math.round((radiusMultiplier - 1) * 100);
              parts.push(`${radiusIncrease}% larger radius with Deep Focus.`);
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
        const wombData = getCharmEffectRecord('glowing-womb', 'minion_summon');
        if (wombData) {
          const damage = toNumber(wombData.damage);
          const soulCost = toNumber(wombData.soulCost) ?? undefined;
          if (damage !== null) {
            const descriptionParts = ['Each hatchling kamikaze deals this damage.'];
            if (
              hasDefendersCrest &&
              getCharmSynergy(['glowing-womb', 'defenders-crest'])
            ) {
              descriptionParts.push(
                "Defender's Crest synergy causes hatchlings to explode into a lingering cloud.",
              );
            }
            addCharmAttack({
              id: 'glowing-womb',
              label: 'Hatchling Impact',
              damage,
              category: 'charm',
              soulCost,
              description: descriptionParts.join(' '),
            });
          }
        }
        break;
      }
      case 'weaversong': {
        const weaverData = getCharmEffectRecord('weaversong', 'minion_summon');
        if (weaverData) {
          const damage = toNumber(weaverData.damage);
          const count = toNumber(weaverData.count);
          if (damage !== null) {
            const info = ['Per weaverling strike.'];
            if (count !== null) {
              info.push(`${count} weaverlings active.`);
            }
            if (hasGrubsong && getCharmSynergy(['weaversong', 'grubsong'])) {
              info.push('Generates SOUL on hit when paired with Grubsong.');
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
        const grimmchildData = getCharmEffectRecord('grimmchild', 'minion_summon');
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
    { id: 'nail-arts', label: 'Nail Arts', attacks: nailArtAttacks },
    { id: 'spellcasting', label: 'Spells', attacks: spellAttacks },
  ];

  if (charmAttacks.length > 0) {
    groups.push({ id: 'charm-effects', label: 'Charm Effects', attacks: charmAttacks });
  }

  return groups;
}

export const buildAttackMetadata = (
  attackGroups: AttackGroup[],
  remainingHp: number,
): {
  groupsWithMetadata: AttackGroupWithMetadata[];
  shortcutMap: Map<string, AttackDefinition>;
} => {
  const shortcutMap = new Map<string, AttackDefinition>();
  let hotkeyIndex = 0;

  const groupsWithMetadata = attackGroups.map((group) => ({
    ...group,
    attacks: group.attacks.map((attack) => {
      const hotkey = KEY_SEQUENCE[hotkeyIndex];
      hotkeyIndex += 1;

      if (hotkey) {
        shortcutMap.set(hotkey, attack);
      }

      const hitsRemaining =
        attack.damage > 0 ? Math.ceil(Math.max(0, remainingHp) / attack.damage) : null;

      return {
        ...attack,
        hotkey,
        hitsRemaining,
      } satisfies AttackWithMetadata;
    }),
  }));

  return { groupsWithMetadata, shortcutMap };
};
