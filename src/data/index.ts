import rawDamage from './damage.json';
import rawBosses from './bosses.json';
import type {
  Boss,
  BossTarget,
  BossVersion,
  Charm,
  NailUpgrade,
  Spell,
  SpellVariant,
} from './types';

export type {
  Boss,
  BossTarget,
  BossVersion,
  Charm,
  NailUpgrade,
  Spell,
  SpellVariant,
} from './types';

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

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export const charms = rawDamage.charms as Charm[];
export const nailUpgrades = rawDamage.nailUpgrades as NailUpgrade[];
export const spells = rawDamage.spells.map((spell) => ({
  ...spell,
  base: mapVariant(spell.base),
  upgrade: spell.upgrade ? mapVariant(spell.upgrade) : undefined,
})) as Spell[];

type RawBossVersion = {
  title: string;
  health: number;
};

type RawBoss = {
  name: string;
  description: string;
  location: string;
  health: number;
  godhomeVersions?: RawBossVersion[];
};

const rawBossData = rawBosses as RawBoss[];

const parsedBosses: Boss[] = rawBossData.map((boss) => {
  const bossId = toSlug(boss.name);
  const baseVersion: BossVersion = {
    id: 'standard',
    title: 'Standard',
    hp: boss.health,
    type: 'base',
    targetId: `${bossId}__standard`,
  };

  const godhomeVersions: BossVersion[] = (boss.godhomeVersions ?? []).map((version) => {
    const versionId = toSlug(version.title);
    return {
      id: versionId,
      title: version.title,
      hp: version.health,
      type: 'godhome',
      targetId: `${bossId}__${versionId}`,
    } satisfies BossVersion;
  });

  return {
    id: bossId,
    name: boss.name,
    description: boss.description,
    location: boss.location,
    versions: [baseVersion, ...godhomeVersions],
  } satisfies Boss;
});

export const bosses = parsedBosses;

const parsedBossTargets: BossTarget[] = parsedBosses.flatMap((boss) =>
  boss.versions.map((version) => ({
    id: version.targetId,
    bossId: boss.id,
    bossName: boss.name,
    location: boss.location,
    description: boss.description,
    hp: version.hp,
    version,
  })),
);

export const bossTargets = parsedBossTargets;

export const bossMap = new Map(bossTargets.map((target) => [target.id, target]));
export const nailUpgradeMap = new Map(
  nailUpgrades.map((upgrade) => [upgrade.id, upgrade]),
);
export const spellMap = new Map(spells.map((spell) => [spell.id, spell]));

const defaultBossTargetId = `${toSlug('False Knight')}__standard`;

const defaultBossTarget =
  bossTargets.find((target) => target.id === defaultBossTargetId) ?? bossTargets[0];

export const DEFAULT_BOSS_ID = defaultBossTarget?.id ?? defaultBossTargetId;
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
