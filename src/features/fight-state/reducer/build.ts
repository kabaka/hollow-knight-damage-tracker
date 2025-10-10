import {
  DEFAULT_BOSS_ID,
  DEFAULT_CUSTOM_HP,
  charmMap,
  nailUpgrades,
  spells,
} from '../../../data';
import type { BuildState, FightState, SpellLevel } from './types';
import { createEmptyAggregates } from './aggregates';

export const MIN_NOTCH_LIMIT = 3;
export const MAX_NOTCH_LIMIT = 11;
export const MAX_OVERCHARM_OVERFLOW = 5;

export const clampNotchLimit = (value: number) =>
  Math.min(MAX_NOTCH_LIMIT, Math.max(MIN_NOTCH_LIMIT, Math.round(value)));

const getCharmCost = (charmId: string) => charmMap.get(charmId)?.cost ?? 0;

export const clampCharmSelection = (charmIds: string[], notchLimit: number) => {
  if (notchLimit <= 0) {
    return [];
  }

  const uniqueOrdered = charmIds.filter((id, index) => charmIds.indexOf(id) === index);
  const selected: string[] = [];
  let totalCost = 0;
  let hasOverflow = false;

  for (const id of uniqueOrdered) {
    const cost = getCharmCost(id);
    const nextCost = totalCost + cost;
    if (nextCost > notchLimit) {
      if (hasOverflow || nextCost > notchLimit + MAX_OVERCHARM_OVERFLOW) {
        continue;
      }
      hasOverflow = true;
    }

    selected.push(id);
    totalCost = nextCost;
  }

  return selected;
};

export const initialSpellLevels = (): Record<string, SpellLevel> => {
  const levels: Record<string, SpellLevel> = {};
  for (const spell of spells) {
    levels[spell.id] = 'base';
  }
  return levels;
};

export const createInitialBuild = (): BuildState => ({
  nailUpgradeId: nailUpgrades[0]?.id ?? 'old-nail',
  activeCharmIds: [],
  spellLevels: initialSpellLevels(),
  notchLimit: MAX_NOTCH_LIMIT,
});

export const createInitialState = (): FightState => ({
  selectedBossId: DEFAULT_BOSS_ID,
  customTargetHp: DEFAULT_CUSTOM_HP,
  build: createInitialBuild(),
  damageLog: [],
  damageLogAggregates: createEmptyAggregates(),
  damageLogVersion: 0,
  redoStack: [],
  activeSequenceId: null,
  sequenceIndex: 0,
  sequenceLogs: {},
  sequenceLogAggregates: {},
  sequenceRedoStacks: {},
  sequenceConditions: {},
  sequenceBindings: {},
  fightStartTimestamp: null,
  fightManuallyStarted: false,
  fightEndTimestamp: null,
  fightManuallyEnded: false,
  sequenceFightStartTimestamps: {},
  sequenceManualStartFlags: {},
  sequenceFightEndTimestamps: {},
  sequenceManualEndFlags: {},
});

const ensureNotchLimit = (state: FightState): FightState => {
  const desiredLimit =
    typeof state.build.notchLimit === 'number'
      ? clampNotchLimit(state.build.notchLimit)
      : MAX_NOTCH_LIMIT;

  const clampedCharms = clampCharmSelection(state.build.activeCharmIds, desiredLimit);
  const hasSameLimit = state.build.notchLimit === desiredLimit;
  const hasSameCharms =
    clampedCharms.length === state.build.activeCharmIds.length &&
    clampedCharms.every((id, index) => state.build.activeCharmIds[index] === id);

  if (hasSameLimit && hasSameCharms) {
    return state;
  }

  return {
    ...state,
    build: {
      ...state.build,
      notchLimit: desiredLimit,
      activeCharmIds: clampedCharms,
    },
  };
};

export const ensureSpellLevels = (state: FightState): FightState => {
  if (Object.keys(state.build.spellLevels).length === 0) {
    return ensureNotchLimit({
      ...state,
      build: {
        ...state.build,
        spellLevels: initialSpellLevels(),
      },
    });
  }

  return ensureNotchLimit(state);
};
