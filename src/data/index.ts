import rawDamage from './damage.json';
import rawBosses from './bosses.json';
import rawSequences from './sequences.json';
import type {
  Boss,
  BossTarget,
  BossVersion,
  Charm,
  NailUpgrade,
  Spell,
  SpellVariant,
  BossSequence,
  BossSequenceEntry,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumberEntries = (value: unknown) =>
  isRecord(value)
    ? Object.entries(value).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      )
    : [];

export const charms = rawDamage.charms as Charm[];
export const charmMap = new Map(charms.map((charm) => [charm.id, charm]));
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

type RawSequenceEntry = {
  boss: string;
  version: string;
};

type RawSequence = {
  id: string;
  name: string;
  category?: string;
  entries: RawSequenceEntry[];
};

const rawSequenceData = rawSequences as RawSequence[];

const normalizeSequenceVersion = (version: string) => {
  const normalized = version.trim().toLowerCase();
  if (normalized === '' || normalized === 'standard') {
    return 'Standard';
  }
  if (normalized === 'final boss') {
    return 'Attuned';
  }
  return version;
};

const resolveSequenceTarget = (entry: RawSequenceEntry) => {
  const normalizedVersion = normalizeSequenceVersion(entry.version);
  return (
    parsedBossTargets.find(
      (target) =>
        target.bossName === entry.boss &&
        (target.version.title === normalizedVersion || normalizedVersion === ''),
    ) ?? parsedBossTargets.find((target) => target.bossName === entry.boss)
  );
};

const parsedSequences: BossSequence[] = rawSequenceData
  .map((sequence) => {
    const sequenceId = toSlug(sequence.id || sequence.name);
    const entries: BossSequenceEntry[] = sequence.entries
      .map((entry, index) => {
        const target = resolveSequenceTarget(entry);
        if (!target) {
          return null;
        }
        return {
          id: `${sequenceId}__${index}`,
          target,
        } satisfies BossSequenceEntry;
      })
      .filter((entry): entry is BossSequenceEntry => Boolean(entry));

    return {
      id: sequenceId,
      name: sequence.name,
      category: sequence.category ?? 'Boss Sequences',
      entries,
    } satisfies BossSequence;
  })
  .filter((sequence) => sequence.entries.length > 0);

export const bossSequences = parsedSequences;
export const bossSequenceMap = new Map(
  bossSequences.map((sequence) => [sequence.id, sequence]),
);

const defaultBossTargetId = `${toSlug('False Knight')}__standard`;

const defaultBossTarget =
  bossTargets.find((target) => target.id === defaultBossTargetId) ?? bossTargets[0];

export const DEFAULT_BOSS_ID = defaultBossTarget?.id ?? defaultBossTargetId;
export const DEFAULT_CUSTOM_HP = 2100;

export const supportedCharmIds = [
  'fragile-strength',
  'unbreakable-strength',
  'fury-of-the-fallen',
  'shaman-stone',
  'spell-twister',
  'quick-slash',
  'grubberflys-elegy',
  'flukenest',
  'thorns-of-agony',
  'sharp-shadow',
  'dreamshield',
  'defenders-crest',
  'spore-shroom',
  'glowing-womb',
  'weaversong',
  'grimmchild',
] as const;

export const strengthCharmIds = new Set(['fragile-strength', 'unbreakable-strength']);

const shamanStoneEffect = charms
  .find((charm) => charm.id === 'shaman-stone')
  ?.effects.find((effect) => effect.type === 'spell_damage_multiplier');

export const shamanStoneMultipliers = new Map(toNumberEntries(shamanStoneEffect?.value));
