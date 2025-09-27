import {
  AttackCategory,
  AttackEvent,
  FightState,
  MAX_NOTCH_LIMIT,
  MIN_NOTCH_LIMIT,
  SpellLevel,
  ensureSequenceState,
  ensureSpellLevels,
} from './fightReducer';
import { NAIL_ART_IDS } from '../attack-log/attackData';
import type { NailArtId } from '../attack-log/attackData';

const isNailArtId = (id: string): id is NailArtId => NAIL_ART_IDS.has(id as NailArtId);

export const STORAGE_KEY = 'hollow-knight-damage-tracker:fight-state';
export const STORAGE_VERSION = 3;

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
    if (level === 'none' || level === 'base' || level === 'upgrade') {
      sanitized[spellId] = level;
    }
  }

  return sanitized;
};

const sanitizeNotchLimit = (value: unknown, fallback: number): number => {
  const numeric = toFiniteNumber(value);
  const base =
    numeric === null ? fallback : Math.round(Math.max(MIN_NOTCH_LIMIT, numeric));
  return Math.min(MAX_NOTCH_LIMIT, Math.max(MIN_NOTCH_LIMIT, base));
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

    let sanitizedCategory: AttackCategory | null = null;
    if (
      category === 'nail' ||
      category === 'spell' ||
      category === 'nail-art' ||
      category === 'charm'
    ) {
      sanitizedCategory = category;
    } else if (category === 'advanced') {
      sanitizedCategory = isNailArtId(id) ? 'nail-art' : 'spell';
    }

    if (!sanitizedCategory) {
      continue;
    }

    const rawSoulCost = item.soulCost;
    const soulCost =
      rawSoulCost === undefined ? undefined : (toFiniteNumber(rawSoulCost) ?? undefined);

    events.push({
      id,
      label,
      damage,
      category: sanitizedCategory,
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

const sanitizeOptionalTimestamp = (
  value: unknown,
  fallback: number | null,
): number | null => {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return null;
  }

  const numeric = toFiniteNumber(value);
  return numeric === null ? fallback : numeric;
};

const sanitizeSequenceTimestampMap = (
  value: unknown,
  fallback: Record<string, number | null>,
): Record<string, number | null> => {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const sanitized: Record<string, number | null> = { ...fallback };
  for (const [key, raw] of Object.entries(value)) {
    sanitized[key] = sanitizeOptionalTimestamp(raw, fallback[key] ?? null);
  }

  return sanitized;
};

const sanitizeBooleanRecord = (
  value: unknown,
  fallback: Record<string, boolean>,
): Record<string, boolean> => {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const sanitized: Record<string, boolean> = { ...fallback };
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'boolean') {
      sanitized[key] = raw;
    } else if (raw === 'true') {
      sanitized[key] = true;
    } else if (raw === 'false') {
      sanitized[key] = false;
    }
  }

  return sanitized;
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
  const notchLimit = sanitizeNotchLimit(
    persistedBuild.notchLimit,
    fallback.build.notchLimit,
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
  const fightEndTimestamp = sanitizeOptionalTimestamp(
    persisted.fightEndTimestamp,
    fallback.fightEndTimestamp,
  );
  const fightManuallyEnded =
    typeof persisted.fightManuallyEnded === 'boolean'
      ? persisted.fightManuallyEnded
      : fallback.fightManuallyEnded;
  const sequenceFightEndTimestamps = sanitizeSequenceTimestampMap(
    persisted.sequenceFightEndTimestamps,
    fallback.sequenceFightEndTimestamps,
  );
  const sequenceManualEndFlags = sanitizeBooleanRecord(
    persisted.sequenceManualEndFlags,
    fallback.sequenceManualEndFlags,
  );

  return ensureSequenceState(
    ensureSpellLevels({
      selectedBossId,
      customTargetHp,
      build: {
        nailUpgradeId,
        activeCharmIds,
        spellLevels,
        notchLimit,
      },
      damageLog,
      redoStack,
      activeSequenceId,
      sequenceIndex,
      sequenceLogs,
      sequenceRedoStacks,
      sequenceConditions,
      fightEndTimestamp,
      fightManuallyEnded,
      sequenceFightEndTimestamps,
      sequenceManualEndFlags,
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
