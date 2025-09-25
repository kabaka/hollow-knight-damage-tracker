import rawDamage from './damage.json';
import rawBosses from './bosses.json';
import type { Boss, Charm, NailUpgrade, Spell, SpellVariant } from './types';

export type { Boss, Charm, NailUpgrade, Spell, SpellVariant } from './types';

const toVariantKey = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((segment, index) =>
      index === 0
        ? segment.toLowerCase()
        : segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join('');

const mapVariant = (variant: Omit<SpellVariant, 'key'>): SpellVariant => ({
  ...variant,
  key: toVariantKey(variant.name),
});

export const charms = rawDamage.charms as Charm[];
export const nailUpgrades = rawDamage.nailUpgrades as NailUpgrade[];
export const spells = rawDamage.spells.map((spell) => ({
  ...spell,
  base: mapVariant(spell.base),
  upgrade: spell.upgrade ? mapVariant(spell.upgrade) : undefined,
})) as Spell[];

export const bosses = rawBosses.bosses as Boss[];

export const bossMap = new Map(bosses.map((boss) => [boss.id, boss]));
export const nailUpgradeMap = new Map(
  nailUpgrades.map((upgrade) => [upgrade.id, upgrade]),
);
export const spellMap = new Map(spells.map((spell) => [spell.id, spell]));

export const DEFAULT_BOSS_ID = 'false-knight';
export const DEFAULT_CUSTOM_HP = 2100;

export const keyCharmIds = [
  'fragile-strength',
  'unbreakable-strength',
  'shaman-stone',
  'spell-twister',
  'quick-slash',
];

export const strengthCharmIds = new Set(['fragile-strength', 'unbreakable-strength']);

const shamanStoneEffect = charms
  .find((charm) => charm.id === 'shaman-stone')
  ?.effects.find((effect) => effect.type === 'spell_damage_multiplier');

export const shamanStoneMultipliers = new Map(
  shamanStoneEffect &&
  shamanStoneEffect.value &&
  typeof shamanStoneEffect.value === 'object'
    ? Object.entries(shamanStoneEffect.value)
    : [],
);
