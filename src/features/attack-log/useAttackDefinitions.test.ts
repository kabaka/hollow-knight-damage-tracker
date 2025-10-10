import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { nailUpgrades, pantheonBindingIds, spells } from '../../data';
import type { FightState } from '../fight-state/FightStateContext';
import { createInitialState } from '../fight-state/fightReducer';
import {
  FURY_MULTIPLIER,
  KEY_SEQUENCE,
  buildAttackGroups,
  buildAttackMetadata,
  useAttackDefinitions,
} from './useAttackDefinitions';
import * as attackDefinitionBuildersModule from './attackDefinitionBuilders';

const DEFAULT_SPELL_LEVELS = Object.fromEntries(
  spells.map((spell) => [spell.id, 'base'] as const),
) as FightState['build']['spellLevels'];

const createFightState = (overrides: Partial<FightState> = {}): FightState => {
  const baseState = createInitialState();

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

    const groups = buildAttackGroups(state.build);
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

    const groups = buildAttackGroups(state.build);
    const spellsGroup = groups.find((group) => group.id === 'spellcasting');
    const vengefulSpirit = spellsGroup?.attacks.find(
      (attack) => attack.id === 'vengeful-spirit-vengefulSpirit',
    );

    expect(vengefulSpirit).toBeDefined();
    expect(vengefulSpirit?.damage).toBe(36);
    expect(vengefulSpirit?.description).toMatch(/flukenest volley/i);
  });

  it("applies Defender's Crest fluke synergy when both charms are equipped", () => {
    const state = createFightState({
      build: {
        nailUpgradeId: 'old-nail',
        activeCharmIds: ['flukenest', 'defenders-crest'],
        spellLevels: DEFAULT_SPELL_LEVELS,
      },
    });

    const groups = buildAttackGroups(state.build);
    const spellsGroup = groups.find((group) => group.id === 'spellcasting');
    const vengefulSpirit = spellsGroup?.attacks.find(
      (attack) => attack.id === 'vengeful-spirit-vengefulSpirit',
    );

    expect(vengefulSpirit).toBeDefined();
    expect(vengefulSpirit?.damage).toBe(22);
    expect(vengefulSpirit?.description).toMatch(/volatile fluke/i);
  });

  it('boosts Sharp Shadow dash damage when Dashmaster is equipped', () => {
    const state = createFightState({
      build: {
        nailUpgradeId: 'old-nail',
        activeCharmIds: ['sharp-shadow', 'dashmaster'],
        spellLevels: DEFAULT_SPELL_LEVELS,
      },
    });

    const groups = buildAttackGroups(state.build);
    const charmGroup = groups.find((group) => group.id === 'charm-effects');
    const sharpShadow = charmGroup?.attacks.find(
      (attack) => attack.id === 'sharp-shadow',
    );

    expect(sharpShadow).toBeDefined();

    const oldNailDamage =
      nailUpgrades.find((upgrade) => upgrade.id === 'old-nail')?.damage ?? 0;

    expect(sharpShadow?.damage).toBe(Math.round(oldNailDamage * 1.5));
    expect(sharpShadow?.description).toMatch(/dashmaster/i);
  });

  it("strengthens Spore Shroom's cloud when paired with Defender's Crest and Deep Focus", () => {
    const state = createFightState({
      build: {
        nailUpgradeId: 'old-nail',
        activeCharmIds: ['spore-shroom', 'defenders-crest', 'deep-focus'],
        spellLevels: DEFAULT_SPELL_LEVELS,
      },
    });

    const groups = buildAttackGroups(state.build);
    const charmGroup = groups.find((group) => group.id === 'charm-effects');
    const sporeCloud = charmGroup?.attacks.find((attack) => attack.id === 'spore-shroom');

    expect(sporeCloud).toBeDefined();
    expect(sporeCloud?.damage).toBe(40);
    expect(sporeCloud?.description).toMatch(/lingering cloud/i);
    expect(sporeCloud?.description).toMatch(/35%/);
  });

  it('groups nail arts separately from standard nail attacks', () => {
    const state = createFightState();

    const groups = buildAttackGroups(state.build);
    const nailArtsGroup = groups.find((group) => group.id === 'nail-arts');

    expect(nailArtsGroup).toBeDefined();
    expect(nailArtsGroup?.attacks.map((attack) => attack.id)).toEqual(
      expect.arrayContaining(['great-slash', 'dash-slash', 'cyclone-slash-hit']),
    );
    const allCategoriesAreNailArts = nailArtsGroup?.attacks.every(
      (attack) => attack.category === 'nail-art',
    );
    expect(allCategoriesAreNailArts).toBe(true);
  });

  it('omits spells that are not yet acquired', () => {
    if (spells.length === 0) {
      throw new Error('Expected at least one spell fixture');
    }

    const [firstSpell] = spells;

    const state = createFightState({
      build: {
        spellLevels: { [firstSpell.id]: 'none' },
      },
    });

    const groups = buildAttackGroups(state.build);
    const spellsGroup = groups.find((group) => group.id === 'spellcasting');
    const attackIds = spellsGroup?.attacks.map((attack) => attack.id) ?? [];

    expect(attackIds.some((id) => id.startsWith(`${firstSpell.id}-`))).toBe(false);
  });

  it('reduces nail damage when the Nail Binding is enabled', () => {
    const state = createFightState({
      build: {
        nailUpgradeId: 'pure-nail',
        activeCharmIds: [],
        spellLevels: DEFAULT_SPELL_LEVELS,
      },
    });

    const [nailGroup] = buildAttackGroups(state.build, {
      bindings: { [pantheonBindingIds.nail]: true },
    });
    const nailStrike = nailGroup.attacks.find((attack) => attack.id === 'nail-strike');
    expect(nailStrike?.damage).toBe(13);

    const strengthState = createFightState({
      build: {
        nailUpgradeId: 'pure-nail',
        activeCharmIds: ['fragile-strength'],
        spellLevels: DEFAULT_SPELL_LEVELS,
      },
    });
    const [strengthGroup] = buildAttackGroups(strengthState.build, {
      bindings: { [pantheonBindingIds.nail]: true },
    });
    const strengthStrike = strengthGroup.attacks.find(
      (attack) => attack.id === 'nail-strike',
    );
    expect(strengthStrike?.damage).toBe(20);
  });

  it('suppresses charm-based bonuses when the Charms Binding is active', () => {
    const state = createFightState({
      build: {
        nailUpgradeId: 'pure-nail',
        activeCharmIds: ['fragile-strength', 'fury-of-the-fallen'],
        spellLevels: DEFAULT_SPELL_LEVELS,
      },
    });

    const groups = buildAttackGroups(state.build, {
      bindings: { [pantheonBindingIds.charms]: true },
    });

    const nailGroup = groups.find((group) => group.id === 'nail-attacks');
    const nailStrike = nailGroup?.attacks.find((attack) => attack.id === 'nail-strike');
    expect(nailStrike?.damage).toBe(
      nailUpgrades.find((upgrade) => upgrade.id === 'pure-nail')?.damage ?? 0,
    );

    const charmGroup = groups.find((group) => group.id === 'charm-effects');
    const furyVariant = charmGroup?.attacks.find(
      (attack) => attack.id === 'nail-strike-fury',
    );
    expect(furyVariant).toBeUndefined();
  });

  it('builds shortcut metadata including hits remaining for each attack', () => {
    const state = createFightState();
    const groups = buildAttackGroups(state.build);
    const { groupsWithMetadata, shortcutMap } = buildAttackMetadata(groups, 100);

    const firstGroup = groupsWithMetadata[0];
    const firstAttack = firstGroup.attacks[0];

    expect(firstAttack.hotkey).toBe(KEY_SEQUENCE[0]);
    expect(firstAttack.hitsRemaining).toBe(Math.ceil(100 / firstAttack.damage));

    expect(shortcutMap.get(KEY_SEQUENCE[0] ?? '')?.id).toBe(firstAttack.id);
  });

  it('memoizes attack definitions when the damage log changes', () => {
    const state = createFightState();

    const { result, rerender } = renderHook(
      ({ currentState, hp }) => useAttackDefinitions(currentState, hp),
      { initialProps: { currentState: state, hp: 100 } },
    );

    const initialGroups = result.current.groupsWithMetadata;
    const initialShortcutMap = result.current.shortcutMap;

    const nextState: FightState = {
      ...state,
      damageLog: [
        ...state.damageLog,
        {
          id: 'nail-strike',
          label: 'Nail Strike',
          damage: 5,
          category: 'nail',
          timestamp: 0,
        },
      ],
    };

    rerender({ currentState: nextState, hp: 100 });

    expect(result.current.groupsWithMetadata).toBe(initialGroups);
    expect(result.current.shortcutMap).toBe(initialShortcutMap);
  });

  it('reuses attack groups while updating metadata when only hp changes', () => {
    const state = createFightState();
    const buildAttackGroupsSpy = vi.spyOn(
      attackDefinitionBuildersModule,
      'buildAttackGroups',
    );

    try {
      const { result, rerender } = renderHook(
        ({ currentState, hp }) => useAttackDefinitions(currentState, hp),
        { initialProps: { currentState: state, hp: 100 } },
      );

      const initialGroup = result.current.groupsWithMetadata[0];
      expect(initialGroup).toBeDefined();
      const initialAttack = initialGroup.attacks[0];
      expect(initialAttack).toBeDefined();
      const initialHitsRemaining = initialAttack.hitsRemaining;

      expect(buildAttackGroupsSpy).toHaveBeenCalledTimes(1);

      rerender({ currentState: state, hp: 80 });

      expect(buildAttackGroupsSpy).toHaveBeenCalledTimes(1);

      const updatedGroup = result.current.groupsWithMetadata[0];
      expect(updatedGroup).toBeDefined();
      const updatedAttack = updatedGroup.attacks[0];
      expect(updatedAttack).toBeDefined();
      const updatedHitsRemaining = updatedAttack.hitsRemaining;

      expect(updatedHitsRemaining).not.toBe(initialHitsRemaining);
      if (updatedAttack.damage > 0) {
        expect(updatedHitsRemaining).toBe(Math.ceil(80 / updatedAttack.damage));
      } else {
        expect(updatedHitsRemaining).toBeNull();
      }
    } finally {
      buildAttackGroupsSpy.mockRestore();
    }
  });
});
