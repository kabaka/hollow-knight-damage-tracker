import {
  FightState,
  SpellLevel,
  AttackEvent,
  ensureSequenceState,
  ensureSpellLevels,
} from './fightReducer';

export const STORAGE_KEY = 'hollow-knight-damage-tracker:fight-state';
export const STORAGE_VERSION = 1;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const sanitizePositiveInteger = (value: unknown, fallback: number): number => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }
  return Math.max(1, Math.round(numeric));
};

export const sanitizeNonNegativeInteger = (value: unknown, fallback: number): number => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }
  return Math.max(0, Math.round(numeric));
};

export const sanitizeStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && !seen.has(item)) {
      seen.add(item);
      sanitized.push(item);
    }
  }

  return sanitized;
};

export const sanitizeSpellLevels = (
  value: unknown,
  fallback: Record<string, SpellLevel>,
): Record<string, SpellLevel> => {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const sanitized: Record<string, SpellLevel> = { ...fallback };
  for (const [spellId, level] of Object.entries(value)) {
    if (level === 'base' || level === 'upgrade') {
      sanitized[spellId] = level;
    }
  }

  return sanitized;
};

export const sanitizeAttackEvents = (
  value: unknown,
  fallback: AttackEvent[],
): AttackEvent[] => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const events: AttackEvent[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const id = typeof item.id === 'string' ? item.id : null;
    const label = typeof item.label === 'string' ? item.label : null;
    const damage = toFiniteNumber(item.damage);
    const timestamp = toFiniteNumber(item.timestamp);
    const category = item.category;

    if (!id || !label || damage === null || timestamp === null) {
      continue;
    }

    if (
      category !== 'nail' &&
      category !== 'spell' &&
      category !== 'advanced' &&
      category !== 'charm'
    ) {
      continue;
    }

    const rawSoulCost = item.soulCost;
    const soulCost =
      rawSoulCost === undefined ? undefined : (toFiniteNumber(rawSoulCost) ?? undefined);

    events.push({
      id,
      label,
      damage,
      category,
      timestamp,
      soulCost,
    });
  }

  return events;
};

export const sanitizeSequenceEventMap = (
  value: unknown,
  fallback: Record<string, AttackEvent[]>,
): Record<string, AttackEvent[]> => {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const sanitized: Record<string, AttackEvent[]> = {};
  for (const [key, events] of Object.entries(value)) {
    sanitized[key] = sanitizeAttackEvents(events, fallback[key] ?? []);
  }

  return sanitized;
};

const sanitizeSequenceConditions = (
  value: unknown,
  fallback: FightState['sequenceConditions'],
): FightState['sequenceConditions'] => {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const sanitized: FightState['sequenceConditions'] = {};
  for (const [sequenceId, rawConditions] of Object.entries(value)) {
    if (!isRecord(rawConditions)) {
      continue;
    }

    const conditions: Record<string, boolean> = {};
    for (const [conditionId, rawValue] of Object.entries(rawConditions)) {
      if (typeof rawValue === 'boolean') {
        conditions[conditionId] = rawValue;
      } else if (rawValue === 'true') {
        conditions[conditionId] = true;
      } else if (rawValue === 'false') {
        conditions[conditionId] = false;
      }
    }

    if (Object.keys(conditions).length > 0) {
      sanitized[sequenceId] = conditions;
    }
  }

  return { ...fallback, ...sanitized };
};

export const mergePersistedState = (
  persisted: Record<string, unknown>,
  fallback: FightState,
): FightState => {
  const selectedBossId =
    typeof persisted.selectedBossId === 'string'
      ? persisted.selectedBossId
      : fallback.selectedBossId;
  const customTargetHp = sanitizePositiveInteger(
    persisted.customTargetHp,
    fallback.customTargetHp,
  );

  const persistedBuild = isRecord(persisted.build) ? persisted.build : {};
  const nailUpgradeId =
    typeof persistedBuild.nailUpgradeId === 'string'
      ? persistedBuild.nailUpgradeId
      : fallback.build.nailUpgradeId;
  const activeCharmIds = sanitizeStringArray(
    persistedBuild.activeCharmIds,
    fallback.build.activeCharmIds,
  );
  const spellLevels = sanitizeSpellLevels(
    persistedBuild.spellLevels,
    fallback.build.spellLevels,
  );

  const damageLog = sanitizeAttackEvents(persisted.damageLog, fallback.damageLog);
  const redoStack = sanitizeAttackEvents(persisted.redoStack, fallback.redoStack);

  const activeSequenceId =
    typeof persisted.activeSequenceId === 'string' ? persisted.activeSequenceId : null;
  const sequenceIndex = sanitizeNonNegativeInteger(
    persisted.sequenceIndex,
    fallback.sequenceIndex,
  );
  const sequenceLogs = sanitizeSequenceEventMap(
    persisted.sequenceLogs,
    fallback.sequenceLogs,
  );
  const sequenceRedoStacks = sanitizeSequenceEventMap(
    persisted.sequenceRedoStacks,
    fallback.sequenceRedoStacks,
  );
  const sequenceConditions = sanitizeSequenceConditions(
    persisted.sequenceConditions,
    fallback.sequenceConditions,
  );

  return ensureSequenceState(
    ensureSpellLevels({
      selectedBossId,
      customTargetHp,
      build: {
        nailUpgradeId,
        activeCharmIds,
        spellLevels,
      },
      damageLog,
      redoStack,
      activeSequenceId,
      sequenceIndex,
      sequenceLogs,
      sequenceRedoStacks,
      sequenceConditions,
    }),
  );
};

export const restorePersistedState = (fallback: FightState): FightState => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return fallback;
    }

    const parsed = JSON.parse(serialized);
    if (!isRecord(parsed)) {
      return fallback;
    }

    const { version, state } = parsed as {
      version?: unknown;
      state?: unknown;
    };

    if (typeof version !== 'number' || version !== STORAGE_VERSION) {
      return fallback;
    }

    if (!isRecord(state)) {
      return fallback;
    }

    return mergePersistedState(state, fallback);
  } catch {
    return fallback;
  }
};

export const persistStateToStorage = (state: FightState) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload = JSON.stringify({ version: STORAGE_VERSION, state });
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Silently ignore storage errors so the tracker keeps functioning.
  }
};
