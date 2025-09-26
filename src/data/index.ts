import rawDamage from './damage.json';
import rawBosses from './bosses.json';
import rawSequences from './sequences.json';
import type {
  Boss,
  BossSequence,
  BossSequenceCondition,
  BossSequenceEntry,
  BossSequenceEntryCondition,
  BossTarget,
  BossVersion,
  Charm,
  NailUpgrade,
  Spell,
  SpellVariant,
} from './types';

export type {
  Boss,
  BossSequence,
  BossSequenceCondition,
  BossSequenceEntry,
  BossSequenceEntryCondition,
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

type RawSequenceConditionDefinition = {
  id: string;
  label?: string;
  description?: string;
  defaultEnabled?: boolean;
};

type RawSequenceEntryCondition = {
  id: string;
  mode?: BossSequenceEntryCondition['mode'];
  replacement?: { boss: string; version?: string };
};

type RawSequenceEntry = {
  boss: string;
  version?: string;
  condition?: RawSequenceEntryCondition;
};

type RawSequence = {
  id: string;
  name: string;
  category?: string;
  conditions?: RawSequenceConditionDefinition[];
  entries: RawSequenceEntry[];
};

const rawSequenceData = rawSequences as RawSequence[];

const normalizeSequenceVersion = (version: string | undefined) => {
  if (!version) {
    return '';
  }
  const normalized = version.trim().toLowerCase();
  if (normalized === '' || normalized === 'standard') {
    return 'Standard';
  }
  if (normalized === 'final boss') {
    return 'Attuned';
  }
  return version;
};

const resolveSequenceTarget = (entry: { boss: string; version?: string }) => {
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
    const conditionDefinitions = new Map<string, BossSequenceCondition>();

    const ensureConditionDefinition = (
      definition: RawSequenceConditionDefinition | undefined,
      fallbackId: string,
      fallbackLabel: string,
    ) => {
      const conditionId = definition?.id ?? fallbackId;
      if (!conditionId) {
        return null;
      }

      if (conditionDefinitions.has(conditionId)) {
        return conditionDefinitions.get(conditionId) ?? null;
      }

      const label = definition?.label?.trim() || fallbackLabel;
      const condition: BossSequenceCondition = {
        id: conditionId,
        label,
        description: definition?.description?.trim() || undefined,
        defaultEnabled: Boolean(definition?.defaultEnabled),
      };
      conditionDefinitions.set(conditionId, condition);
      return condition;
    };

    (sequence.conditions ?? []).forEach((rawCondition) => {
      if (!rawCondition.id) {
        return;
      }
      ensureConditionDefinition(
        rawCondition,
        rawCondition.id,
        rawCondition.label?.trim() || rawCondition.id.replace(/-/g, ' '),
      );
    });

    const parseEntryCondition = (
      entry: RawSequenceEntry,
    ): BossSequenceEntryCondition | undefined => {
      if (!entry.condition || typeof entry.condition.id !== 'string') {
        return undefined;
      }

      const baseDefinition = (sequence.conditions ?? []).find(
        (definition) => definition.id === entry.condition?.id,
      );

      ensureConditionDefinition(baseDefinition, entry.condition.id, entry.boss);

      const mode: BossSequenceEntryCondition['mode'] =
        entry.condition.mode === 'replace' ? 'replace' : 'include';

      const replacementTarget =
        mode === 'replace' && entry.condition.replacement
          ? resolveSequenceTarget(entry.condition.replacement)
          : undefined;

      return {
        id: entry.condition.id,
        mode,
        replacementTarget,
      } satisfies BossSequenceEntryCondition;
    };

    const entries: BossSequenceEntry[] = sequence.entries
      .map((entry, index) => {
        const target = resolveSequenceTarget(entry);
        if (!target) {
          return null;
        }

        const condition = parseEntryCondition(entry);

        return {
          id: `${sequenceId}__${index}`,
          target,
          condition,
        } satisfies BossSequenceEntry;
      })
      .filter((entry): entry is BossSequenceEntry => Boolean(entry));

    return {
      id: sequenceId,
      name: sequence.name,
      category: sequence.category ?? 'Boss Sequences',
      entries,
      conditions: Array.from(conditionDefinitions.values()),
    } satisfies BossSequence;
  })
  .filter((sequence) => sequence.entries.length > 0);

export const bossSequences = parsedSequences;
export const bossSequenceMap = new Map(
  bossSequences.map((sequence) => [sequence.id, sequence]),
);

const buildConditionDefaults = (sequence: BossSequence) =>
  sequence.conditions.reduce<Record<string, boolean>>((acc, condition) => {
    acc[condition.id] = condition.defaultEnabled ?? false;
    return acc;
  }, {});

export const getSequenceConditionValues = (
  sequence: BossSequence,
  overrides: Record<string, boolean> | undefined,
) => {
  const defaults = buildConditionDefaults(sequence);
  if (!overrides) {
    return defaults;
  }

  const values = { ...defaults };
  for (const [conditionId, value] of Object.entries(overrides)) {
    if (typeof value === 'boolean') {
      values[conditionId] = value;
    }
  }
  return values;
};

export const resolveSequenceEntries = (
  sequence: BossSequence,
  overrides?: Record<string, boolean>,
) => {
  const values = getSequenceConditionValues(sequence, overrides);
  return sequence.entries.flatMap((entry) => {
    if (!entry.condition) {
      return [entry];
    }

    const isEnabled = values[entry.condition.id] ?? false;
    if (entry.condition.mode === 'include') {
      return isEnabled ? [entry] : [];
    }

    if (entry.condition.mode === 'replace') {
      if (isEnabled && entry.condition.replacementTarget) {
        return [{ ...entry, target: entry.condition.replacementTarget }];
      }
      return [entry];
    }

    return [entry];
  });
};

const defaultBossTargetId = `${toSlug('False Knight')}__standard`;

const defaultBossTarget =
  bossTargets.find((target) => target.id === defaultBossTargetId) ?? bossTargets[0];

export const DEFAULT_BOSS_ID = defaultBossTarget?.id ?? defaultBossTargetId;
export const DEFAULT_CUSTOM_HP = 2100;

export const supportedCharmIds = [
  'wayward-compass',
  'gathering-swarm',
  'stalwart-shell',
  'soul-catcher',
  'shaman-stone',
  'soul-eater',
  'dashmaster',
  'sprintmaster',
  'grubsong',
  'grubberflys-elegy',
  'fragile-heart',
  'unbreakable-heart',
  'fragile-greed',
  'unbreakable-greed',
  'fragile-strength',
  'unbreakable-strength',
  'spell-twister',
  'steady-body',
  'heavy-blow',
  'quick-slash',
  'longnail',
  'mark-of-pride',
  'fury-of-the-fallen',
  'thorns-of-agony',
  'baldur-shell',
  'flukenest',
  'defenders-crest',
  'glowing-womb',
  'quick-focus',
  'deep-focus',
  'lifeblood-heart',
  'lifeblood-core',
  'jonis-blessing',
  'hiveblood',
  'spore-shroom',
  'sharp-shadow',
  'shape-of-unn',
  'nailmasters-glory',
  'weaversong',
  'dream-wielder',
  'dreamshield',
  'grimmchild',
  'carefree-melody',
  'kingsoul',
  'void-heart',
] as const;

export const strengthCharmIds = new Set(['fragile-strength', 'unbreakable-strength']);

const shamanStoneEffect = charms
  .find((charm) => charm.id === 'shaman-stone')
  ?.effects.find((effect) => effect.type === 'spell_damage_multiplier');

export const shamanStoneMultipliers = new Map(toNumberEntries(shamanStoneEffect?.value));
