import { useCallback, useMemo } from 'react';

import {
  CUSTOM_BOSS_ID,
  useFightActions,
  useFightStateSelector,
  type SpellLevel,
} from '../fight-state/FightStateContext';
import { MAX_OVERCHARM_OVERFLOW } from '../fight-state/fightReducer';
import type { Charm } from '../../data';
import {
  bossMap,
  bosses,
  bossSequences,
  charmMap,
  charmSynergies,
  nailUpgrades,
  spells,
  supportedCharmIds,
} from '../../data';
import { useSequenceContext } from '../fight-state/useSequenceContext';

const getCharmCost = (charmId: string) => charmMap.get(charmId)?.cost ?? 0;

const calculateCharmCost = (charmIds: string[]) =>
  charmIds.reduce((total, id) => total + getCharmCost(id), 0);

const REPLACEABLE_CHARMS = new Map<string, string>([
  ['fragile-heart', 'unbreakable-heart'],
  ['unbreakable-heart', 'fragile-heart'],
  ['fragile-greed', 'unbreakable-greed'],
  ['unbreakable-greed', 'fragile-greed'],
  ['fragile-strength', 'unbreakable-strength'],
  ['unbreakable-strength', 'fragile-strength'],
  ['grimmchild', 'carefree-melody'],
  ['carefree-melody', 'grimmchild'],
  ['kingsoul', 'void-heart'],
  ['void-heart', 'kingsoul'],
]);

const resolveCharmConflict = (charmIds: string[], charmId: string) => {
  const conflict = REPLACEABLE_CHARMS.get(charmId);
  return conflict ? charmIds.filter((id) => id !== conflict) : charmIds;
};

export const charmGridLayout = [
  [
    ['wayward-compass'],
    ['gathering-swarm'],
    ['stalwart-shell'],
    ['soul-catcher'],
    ['shaman-stone'],
    ['soul-eater'],
    ['dashmaster'],
    ['sprintmaster'],
    ['grubsong'],
    ['grubberflys-elegy'],
  ],
  [
    ['fragile-heart', 'unbreakable-heart'],
    ['fragile-greed', 'unbreakable-greed'],
    ['fragile-strength', 'unbreakable-strength'],
    ['spell-twister'],
    ['steady-body'],
    ['heavy-blow'],
    ['quick-slash'],
    ['longnail'],
    ['mark-of-pride'],
    ['fury-of-the-fallen'],
  ],
  [
    ['thorns-of-agony'],
    ['baldur-shell'],
    ['flukenest'],
    ['defenders-crest'],
    ['glowing-womb'],
    ['quick-focus'],
    ['deep-focus'],
    ['lifeblood-heart'],
    ['lifeblood-core'],
    ['jonis-blessing'],
  ],
  [
    ['hiveblood'],
    ['spore-shroom'],
    ['sharp-shadow'],
    ['shape-of-unn'],
    ['nailmasters-glory'],
    ['weaversong'],
    ['dream-wielder'],
    ['dreamshield'],
    ['grimmchild', 'carefree-melody'],
    ['kingsoul', 'void-heart'],
  ],
] as const;

export const useBuildConfiguration = () => {
  const actions = useFightActions();
  const selectedBossId = useFightStateSelector((state) => state.selectedBossId);
  const customTargetHp = useFightStateSelector((state) => state.customTargetHp);
  const build = useFightStateSelector((state) => state.build);

  const {
    activeSequenceId,
    activeSequence,
    sequenceEntries,
    sequenceConditionValues,
    cappedSequenceIndex,
    currentSequenceEntry,
    isSequenceActive,
    hasNextSequenceStage,
    hasPreviousSequenceStage,
  } = useSequenceContext();

  const selectedTarget = useMemo(() => bossMap.get(selectedBossId), [selectedBossId]);

  const selectedBoss = useMemo(
    () =>
      selectedTarget
        ? bosses.find((boss) => boss.id === selectedTarget.bossId)
        : undefined,
    [selectedTarget],
  );

  const selectedVersion = selectedTarget?.version;

  const sequenceSelectValue = activeSequenceId ?? '';

  const bossSelectValue =
    selectedBossId === CUSTOM_BOSS_ID
      ? CUSTOM_BOSS_ID
      : (selectedTarget?.bossId ?? CUSTOM_BOSS_ID);

  const notchLimit = build.notchLimit;
  const activeCharmIds = build.activeCharmIds;
  const activeCharmCost = useMemo(
    () => calculateCharmCost(activeCharmIds),
    [activeCharmIds],
  );
  const isOvercharmed = activeCharmCost > notchLimit;

  const setNailUpgrade = useCallback(
    (nailUpgradeId: string) => {
      actions.setNailUpgrade(nailUpgradeId);
    },
    [actions],
  );

  const setSpellLevel = useCallback(
    (spellId: string, level: SpellLevel) => {
      actions.setSpellLevel(spellId, level);
    },
    [actions],
  );

  const setNotchLimit = useCallback(
    (value: number) => {
      actions.setCharmNotchLimit(value);
    },
    [actions],
  );

  const setActiveCharms = useCallback(
    (charmIds: string[]) => {
      actions.setActiveCharms(charmIds);
    },
    [actions],
  );

  const updateActiveCharms = useCallback(
    (updater: (charmIds: string[]) => string[]) => {
      actions.updateActiveCharms(updater);
    },
    [actions],
  );

  const toggleCharm = useCallback(
    (charmId: string) => {
      updateActiveCharms((current) => {
        if (current.includes(charmId)) {
          return current.filter((id) => id !== charmId);
        }

        const withoutConflict = resolveCharmConflict(current, charmId);

        return [...withoutConflict, charmId];
      });
    },
    [updateActiveCharms],
  );

  const cycleCharmSlot = useCallback(
    (charmIds: readonly string[], targetId?: string) => {
      if (charmIds.length === 0) {
        return;
      }

      updateActiveCharms((current) => {
        if (targetId) {
          if (current.includes(targetId)) {
            return current.filter((id) => id !== targetId);
          }

          const withoutSlot = current.filter((id) => !charmIds.includes(id));
          const withoutConflict = resolveCharmConflict(withoutSlot, targetId);
          return [...withoutConflict, targetId];
        }

        const activeIndex = charmIds.findIndex((id) => current.includes(id));

        if (activeIndex === -1) {
          const target = charmIds[0];
          const withoutConflict = resolveCharmConflict(current, target);
          return [...withoutConflict, target];
        }

        const currentId = charmIds[activeIndex];
        const nextIndex = activeIndex + 1;

        if (nextIndex < charmIds.length) {
          const nextId = charmIds[nextIndex];
          const withoutSlot = current.filter((id) => !charmIds.includes(id));
          const withoutConflict = resolveCharmConflict(withoutSlot, nextId);
          return [...withoutConflict, nextId];
        }

        return current.filter((id) => id !== currentId);
      });
    },
    [updateActiveCharms],
  );

  const applyCharmPreset = useCallback(
    (charmIds: string[]) => {
      setActiveCharms(charmIds);
    },
    [setActiveCharms],
  );

  const canEquipCharm = useCallback(
    (charmId: string) => {
      if (activeCharmIds.includes(charmId)) {
        return true;
      }

      if (isOvercharmed) {
        return false;
      }

      const conflict = REPLACEABLE_CHARMS.get(charmId);
      const withoutConflict = conflict
        ? activeCharmIds.filter((id) => id !== conflict)
        : activeCharmIds;
      const candidate = [...withoutConflict, charmId];
      const cost = calculateCharmCost(candidate);
      return cost <= notchLimit || cost <= notchLimit + MAX_OVERCHARM_OVERFLOW;
    },
    [activeCharmIds, notchLimit, isOvercharmed],
  );

  const handleSequenceChange = useCallback(
    (sequenceId: string) => {
      if (sequenceId === '') {
        actions.stopSequence();
        return;
      }
      actions.startSequence(sequenceId);
    },
    [actions],
  );

  const handleSequenceStageChange = useCallback(
    (index: number) => {
      actions.setSequenceStage(index);
    },
    [actions],
  );

  const handleAdvanceSequence = useCallback(() => {
    if (hasNextSequenceStage) {
      actions.advanceSequenceStage();
    }
  }, [actions, hasNextSequenceStage]);

  const handleRewindSequence = useCallback(() => {
    if (hasPreviousSequenceStage) {
      actions.rewindSequenceStage();
    }
  }, [actions, hasPreviousSequenceStage]);

  const handleSequenceConditionToggle = useCallback(
    (conditionId: string, enabled: boolean) => {
      if (!activeSequence) {
        return;
      }
      actions.setSequenceCondition(activeSequence.id, conditionId, enabled);
    },
    [actions, activeSequence],
  );

  const handleBossChange = useCallback(
    (bossId: string) => {
      if (bossId === CUSTOM_BOSS_ID) {
        actions.selectBoss(CUSTOM_BOSS_ID);
        return;
      }

      const nextBoss = bosses.find((boss) => boss.id === bossId);
      const preferredTitle = selectedVersion?.title;
      const matchingVersion = preferredTitle
        ? nextBoss?.versions.find((version) => version.title === preferredTitle)
        : undefined;
      const nextTargetId = (matchingVersion ?? nextBoss?.versions[0])?.targetId;
      if (nextTargetId) {
        actions.selectBoss(nextTargetId);
      }
    },
    [actions, selectedVersion],
  );

  const handleBossVersionChange = useCallback(
    (targetId: string) => {
      actions.selectBoss(targetId);
    },
    [actions],
  );

  const handleCustomHpChange = useCallback(
    (value: number | string) => {
      const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
      if (Number.isNaN(parsed)) {
        return;
      }
      actions.setCustomTargetHp(parsed);
    },
    [actions],
  );

  const charmDetails = useMemo(() => {
    const details = new Map<string, Charm>();
    for (const charmId of supportedCharmIds) {
      const charm = charmMap.get(charmId);
      if (charm) {
        details.set(charmId, charm);
      }
    }
    return details;
  }, []);

  const charmSynergyStatuses = useMemo(() => {
    const activeSet = new Set(activeCharmIds);
    return charmSynergies.map((synergy) => ({
      synergy,
      isActive: synergy.charmIds.every((id) => activeSet.has(id)),
    }));
  }, [activeCharmIds]);

  return {
    actions,
    selectedBossId,
    bosses,
    bossMap,
    bossSequences,
    activeSequence,
    sequenceEntries,
    sequenceConditionValues,
    hasNextSequenceStage,
    hasPreviousSequenceStage,
    sequenceSelectValue,
    handleSequenceChange,
    handleSequenceStageChange,
    handleAdvanceSequence,
    handleRewindSequence,
    handleSequenceConditionToggle,
    currentSequenceEntry,
    cappedSequenceIndex,
    selectedTarget,
    selectedBoss,
    selectedVersion,
    bossSelectValue,
    handleBossChange,
    handleBossVersionChange,
    handleCustomHpChange,
    customTargetHp,
    isSequenceActive,
    build,
    notchLimit,
    activeCharmIds,
    activeCharmCost,
    canEquipCharm,
    toggleCharm,
    cycleCharmSlot,
    applyCharmPreset,
    setNotchLimit,
    setNailUpgrade,
    setSpellLevel,
    nailUpgrades,
    spells,
    charmDetails,
    charmSynergyStatuses,
    isOvercharmed,
  };
};
