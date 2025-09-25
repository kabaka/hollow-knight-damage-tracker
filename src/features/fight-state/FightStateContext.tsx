import type { FC, PropsWithChildren } from 'react';
import { createContext, useContext, useMemo, useReducer } from 'react';

import {
  DEFAULT_BOSS_ID,
  DEFAULT_CUSTOM_HP,
  bossMap,
  nailUpgrades,
  spells,
  strengthCharmIds,
} from '../../data';

export type AttackCategory = 'nail' | 'spell' | 'advanced';
export type SpellLevel = 'base' | 'upgrade';

export interface AttackEvent {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  timestamp: number;
  soulCost?: number;
}

export interface BuildState {
  nailUpgradeId: string;
  activeCharmIds: string[];
  spellLevels: Record<string, SpellLevel>;
}

export interface FightState {
  selectedBossId: string;
  customTargetHp: number;
  build: BuildState;
  damageLog: AttackEvent[];
}

export interface AttackInput {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  soulCost?: number;
  timestamp?: number;
}

export interface DerivedStats {
  targetHp: number;
  totalDamage: number;
  remainingHp: number;
  attacksLogged: number;
  averageDamage: number | null;
  elapsedMs: number | null;
  dps: number | null;
  actionsPerMinute: number | null;
}

interface FightContextValue {
  state: FightState;
  derived: DerivedStats;
  actions: {
    selectBoss: (bossId: string) => void;
    setCustomTargetHp: (hp: number) => void;
    setNailUpgrade: (nailUpgradeId: string) => void;
    setActiveCharms: (charmIds: string[]) => void;
    setSpellLevel: (spellId: string, level: SpellLevel) => void;
    logAttack: (input: AttackInput) => void;
    undoLastAttack: () => void;
    resetLog: () => void;
  };
}

export const CUSTOM_BOSS_ID = 'custom';

const initialSpellLevels = (): Record<string, SpellLevel> => {
  const levels: Record<string, SpellLevel> = {};
  for (const spell of spells) {
    levels[spell.id] = 'base';
  }
  return levels;
};

const createInitialState = (): FightState => ({
  selectedBossId: DEFAULT_BOSS_ID,
  customTargetHp: DEFAULT_CUSTOM_HP,
  build: {
    nailUpgradeId: nailUpgrades[0]?.id ?? 'old-nail',
    activeCharmIds: [],
    spellLevels: initialSpellLevels(),
  },
  damageLog: [],
});

const isCustomBoss = (bossId: string) => bossId === CUSTOM_BOSS_ID;

const fightReducer = (state: FightState, action: FightAction): FightState => {
  switch (action.type) {
    case 'selectBoss':
      return {
        ...state,
        selectedBossId: action.bossId,
      };
    case 'setCustomTargetHp':
      return {
        ...state,
        selectedBossId: CUSTOM_BOSS_ID,
        customTargetHp: Math.max(1, Math.round(action.hp)),
      };
    case 'setNailUpgrade':
      return {
        ...state,
        build: {
          ...state.build,
          nailUpgradeId: action.nailUpgradeId,
        },
      };
    case 'setActiveCharms':
      return {
        ...state,
        build: {
          ...state.build,
          activeCharmIds: Array.from(new Set(action.charmIds)),
        },
      };
    case 'setSpellLevel':
      return {
        ...state,
        build: {
          ...state.build,
          spellLevels: {
            ...state.build.spellLevels,
            [action.spellId]: action.level,
          },
        },
      };
    case 'logAttack':
      return {
        ...state,
        damageLog: [
          ...state.damageLog,
          {
            id: `${action.id}-${action.timestamp}`,
            label: action.label,
            damage: action.damage,
            category: action.category,
            timestamp: action.timestamp,
            soulCost: action.soulCost,
          },
        ],
      };
    case 'undoLastAttack': {
      if (state.damageLog.length === 0) {
        return state;
      }
      return {
        ...state,
        damageLog: state.damageLog.slice(0, -1),
      };
    }
    case 'resetLog':
      return {
        ...state,
        damageLog: [],
      };
    default:
      return state;
  }
};

const FightStateContext = createContext<FightContextValue | undefined>(undefined);

type FightAction =
  | { type: 'selectBoss'; bossId: string }
  | { type: 'setCustomTargetHp'; hp: number }
  | { type: 'setNailUpgrade'; nailUpgradeId: string }
  | { type: 'setActiveCharms'; charmIds: string[] }
  | { type: 'setSpellLevel'; spellId: string; level: SpellLevel }
  | {
      type: 'logAttack';
      timestamp: number;
      label: string;
      id: string;
      damage: number;
      category: AttackCategory;
      soulCost?: number;
    }
  | { type: 'undoLastAttack' }
  | { type: 'resetLog' };

const calculateDerivedStats = (state: FightState): DerivedStats => {
  const { damageLog, selectedBossId, customTargetHp } = state;
  const targetHp = isCustomBoss(selectedBossId)
    ? Math.max(1, Math.round(customTargetHp))
    : (bossMap.get(selectedBossId)?.hp ?? DEFAULT_CUSTOM_HP);
  const totalDamage = damageLog.reduce((total, event) => total + event.damage, 0);
  const attacksLogged = damageLog.length;
  const remainingHp = Math.max(0, targetHp - totalDamage);
  const averageDamage = attacksLogged === 0 ? null : totalDamage / attacksLogged;
  const elapsedMs =
    attacksLogged < 2
      ? null
      : damageLog[damageLog.length - 1].timestamp - damageLog[0].timestamp;
  const dps = elapsedMs && elapsedMs > 0 ? totalDamage / (elapsedMs / 1000) : null;
  const actionsPerMinute =
    elapsedMs && elapsedMs > 0 ? attacksLogged / (elapsedMs / 60000) : null;

  return {
    targetHp,
    totalDamage,
    remainingHp,
    attacksLogged,
    averageDamage,
    elapsedMs,
    dps,
    actionsPerMinute,
  };
};

const ensureSpellLevels = (state: FightState): FightState => {
  if (Object.keys(state.build.spellLevels).length > 0) {
    return state;
  }

  return {
    ...state,
    build: {
      ...state.build,
      spellLevels: initialSpellLevels(),
    },
  };
};

export const FightStateProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(fightReducer, undefined, () =>
    ensureSpellLevels(createInitialState()),
  );

  const derived = useMemo(() => calculateDerivedStats(state), [state]);

  const actions = useMemo<FightContextValue['actions']>(
    () => ({
      selectBoss: (bossId) => dispatch({ type: 'selectBoss', bossId }),
      setCustomTargetHp: (hp) => dispatch({ type: 'setCustomTargetHp', hp }),
      setNailUpgrade: (nailUpgradeId) =>
        dispatch({ type: 'setNailUpgrade', nailUpgradeId }),
      setActiveCharms: (charmIds) => dispatch({ type: 'setActiveCharms', charmIds }),
      setSpellLevel: (spellId, level) =>
        dispatch({ type: 'setSpellLevel', spellId, level }),
      logAttack: ({ id, label, damage, category, soulCost, timestamp }) =>
        dispatch({
          type: 'logAttack',
          id,
          label,
          damage,
          category,
          soulCost,
          timestamp: timestamp ?? Date.now(),
        }),
      undoLastAttack: () => dispatch({ type: 'undoLastAttack' }),
      resetLog: () => dispatch({ type: 'resetLog' }),
    }),
    [],
  );

  const value = useMemo<FightContextValue>(
    () => ({ state, derived, actions }),
    [state, derived, actions],
  );

  return (
    <FightStateContext.Provider value={value}>{children}</FightStateContext.Provider>
  );
};

export const useFightState = () => {
  const context = useContext(FightStateContext);
  if (!context) {
    throw new Error('useFightState must be used within a FightStateProvider');
  }
  return context;
};

export const hasStrengthCharm = (charmIds: string[]) =>
  charmIds.some((id) => strengthCharmIds.has(id));
