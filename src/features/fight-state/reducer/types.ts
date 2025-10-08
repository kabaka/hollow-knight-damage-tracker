import type { BossSequenceEntry } from '../../../data';

export const CUSTOM_BOSS_ID = 'custom';

export type AttackCategory = 'nail' | 'spell' | 'nail-art' | 'charm';
export type SpellLevel = 'none' | 'base' | 'upgrade';

export interface AttackEvent {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  timestamp: number;
  soulCost?: number;
}

export interface DamageLogAggregates {
  totalDamage: number;
  attacksLogged: number;
  firstAttackTimestamp: number | null;
  lastAttackTimestamp: number | null;
}

export interface BuildState {
  nailUpgradeId: string;
  activeCharmIds: string[];
  spellLevels: Record<string, SpellLevel>;
  notchLimit: number;
}

export interface FightState {
  selectedBossId: string;
  customTargetHp: number;
  build: BuildState;
  damageLog: AttackEvent[];
  damageLogAggregates: DamageLogAggregates;
  damageLogVersion: number;
  redoStack: AttackEvent[];
  activeSequenceId: string | null;
  sequenceIndex: number;
  sequenceLogs: Partial<Record<string, AttackEvent[]>>;
  sequenceLogAggregates: Partial<Record<string, DamageLogAggregates>>;
  sequenceRedoStacks: Partial<Record<string, AttackEvent[]>>;
  sequenceConditions: Partial<Record<string, Record<string, boolean>>>;
  fightStartTimestamp: number | null;
  fightManuallyStarted: boolean;
  fightEndTimestamp: number | null;
  fightManuallyEnded: boolean;
  sequenceFightStartTimestamps: Partial<Record<string, number | null>>;
  sequenceManualStartFlags: Partial<Record<string, boolean>>;
  sequenceFightEndTimestamps: Partial<Record<string, number | null>>;
  sequenceManualEndFlags: Partial<Record<string, boolean>>;
}

export interface AttackInput {
  id: string;
  label: string;
  damage: number;
  category: AttackCategory;
  soulCost?: number;
  timestamp?: number;
}

export type FightAction =
  | { type: 'selectBoss'; bossId: string }
  | { type: 'setCustomTargetHp'; hp: number }
  | { type: 'setNailUpgrade'; nailUpgradeId: string }
  | { type: 'setActiveCharms'; charmIds: string[] }
  | {
      type: 'updateActiveCharms';
      updater: (charmIds: string[]) => string[];
    }
  | { type: 'setCharmNotchLimit'; notchLimit: number }
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
  | { type: 'redoLastAttack' }
  | { type: 'resetLog' }
  | { type: 'resetSequence' }
  | { type: 'startFight'; timestamp: number }
  | { type: 'endFight'; timestamp: number }
  | { type: 'startSequence'; sequenceId: string }
  | { type: 'stopSequence' }
  | { type: 'setSequenceStage'; index: number }
  | { type: 'advanceSequence' }
  | { type: 'rewindSequence' }
  | {
      type: 'setSequenceCondition';
      sequenceId: string;
      conditionId: string;
      enabled: boolean;
    };

export type ResolvedSequenceEntries = {
  sequence: { entries: BossSequenceEntry[] } | undefined;
  entries: BossSequenceEntry[];
};
