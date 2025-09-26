import { describe, expect, it } from 'vitest';

import { nailUpgrades, spells } from '../../data';
import type { FightState } from '../fight-state/FightStateContext';
import {
  FURY_MULTIPLIER,
  KEY_SEQUENCE,
  buildAttackGroups,
  buildAttackMetadata,
} from './useAttackDefinitions';

const DEFAULT_SPELL_LEVELS = Object.fromEntries(
  spells.map((spell) => [spell.id, 'base'] as const),
) as FightState['build']['spellLevels'];

const createFightState = (overrides: Partial<FightState> = {}): FightState => {
  const baseState: FightState = {
    selectedBossId: 'false-knight__standard',
    customTargetHp: 0,
    build: {
      nailUpgradeId: 'old-nail',
      activeCharmIds: [],
      spellLevels: { ...DEFAULT_SPELL_LEVELS },
    },
    damageLog: [],
    redoStack: [],
    activeSequenceId: null,
    sequenceIndex: 0,
    sequenceLogs: {},
    sequenceRedoStacks: {},
    sequenceConditions: {},
  };

  return {
    ...baseState,
    ...overrides,
    build: {
      ...baseState.build,
      ...(overrides.build ?? {}),
      spellLevels: {
        ...baseState.build.spellLevels,
        ...(overrides.build?.spellLevels ?? {}),
      },
    },
  };
};

describe('useAttackDefinitions helpers', () => {
  it('adds fury variants for nail damage when Fury of the Fallen is equipped', () => {
    const state = createFightState({
      build: {
        nailUpgradeId: 'old-nail',
        activeCharmIds: ['fury-of-the-fallen'],
        spellLevels: DEFAULT_SPELL_LEVELS,
      },
    });

    const groups = buildAttackGroups(state);
    const charmGroup = groups.find((group) => group.id === 'charm-effects');
    expect(charmGroup).toBeDefined();

    const furyAttack = charmGroup?.attacks.find(
      (attack) => attack.id === 'nail-strike-fury',
    );
    expect(furyAttack).toBeDefined();

    const oldNailDamage =
      nailUpgrades.find((upgrade) => upgrade.id === 'old-nail')?.damage ?? 0;
    const expectedDamage = Math.round(oldNailDamage * FURY_MULTIPLIER);

    expect(furyAttack?.damage).toBe(expectedDamage);
    expect(furyAttack?.description).toMatch(/requires 1 hp/i);
  });

  it('replaces Vengeful Spirit damage with Flukenest volley details when equipped', () => {
    const state = createFightState({
      build: {
        nailUpgradeId: 'old-nail',
        activeCharmIds: ['flukenest'],
        spellLevels: DEFAULT_SPELL_LEVELS,
      },
    });

    const groups = buildAttackGroups(state);
    const spellsGroup = groups.find((group) => group.id === 'spellcasting');
    const vengefulSpirit = spellsGroup?.attacks.find(
      (attack) => attack.id === 'vengeful-spirit-vengefulSpirit',
    );

    expect(vengefulSpirit).toBeDefined();
    expect(vengefulSpirit?.damage).toBe(36);
    expect(vengefulSpirit?.description).toMatch(/flukenest volley/i);
  });

  it('omits spells that are not yet acquired', () => {
    const [firstSpell] = spells;
    if (!firstSpell) {
      throw new Error('Expected at least one spell fixture');
    }

    const state = createFightState({
      build: {
        spellLevels: { [firstSpell.id]: 'none' },
      },
    });

    const groups = buildAttackGroups(state);
    const spellsGroup = groups.find((group) => group.id === 'spellcasting');
    const attackIds = spellsGroup?.attacks.map((attack) => attack.id) ?? [];

    expect(attackIds.some((id) => id.startsWith(`${firstSpell.id}-`))).toBe(false);
  });

  it('builds shortcut metadata including hits remaining for each attack', () => {
    const state = createFightState();
    const groups = buildAttackGroups(state);
    const { groupsWithMetadata, shortcutMap } = buildAttackMetadata(groups, 100);

    const firstGroup = groupsWithMetadata[0];
    const firstAttack = firstGroup.attacks[0];

    expect(firstAttack.hotkey).toBe(KEY_SEQUENCE[0]);
    expect(firstAttack.hitsRemaining).toBe(Math.ceil(100 / firstAttack.damage));

    expect(shortcutMap.get(KEY_SEQUENCE[0] ?? '')?.id).toBe(firstAttack.id);
  });
});
