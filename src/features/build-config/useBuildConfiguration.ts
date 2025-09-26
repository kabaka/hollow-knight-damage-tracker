import { useCallback, useMemo } from 'react';

import {
  CUSTOM_BOSS_ID,
  useFightState,
  type SpellLevel,
} from '../fight-state/FightStateContext';
import type { Charm } from '../../data';
import {
  bossMap,
  bosses,
  bossSequenceMap,
  bossSequences,
  charmMap,
  getSequenceConditionValues,
  nailUpgrades,
  resolveSequenceEntries,
  spells,
  supportedCharmIds,
} from '../../data';

const orderCharmIds = (selected: string[]) => {
  const ordered = supportedCharmIds.filter((charmId) => selected.includes(charmId));
  const extras = selected.filter((id) => !ordered.includes(id));
  return [...ordered, ...extras];
};

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
  const fight = useFightState();
  const { state, actions, derived } = fight;
  const {
    selectedBossId,
    customTargetHp,
    build,
    activeSequenceId,
    sequenceIndex,
    sequenceConditions,
  } = state;

  const selectedTarget = useMemo(() => bossMap.get(selectedBossId), [selectedBossId]);

  const selectedBoss = useMemo(
    () =>
      selectedTarget
        ? bosses.find((boss) => boss.id === selectedTarget.bossId)
        : undefined,
    [selectedTarget],
  );

  const selectedVersion = selectedTarget?.version;

  const activeSequence = useMemo(
    () => (activeSequenceId ? bossSequenceMap.get(activeSequenceId) : undefined),
    [activeSequenceId],
  );

  const sequenceConditionOverrides = activeSequenceId
    ? sequenceConditions[activeSequenceId]
    : undefined;

  const sequenceEntries = useMemo(
    () =>
      activeSequence
        ? resolveSequenceEntries(activeSequence, sequenceConditionOverrides)
        : [],
    [activeSequence, sequenceConditionOverrides],
  );

  const sequenceConditionValues = useMemo(
    () =>
      activeSequence
        ? getSequenceConditionValues(activeSequence, sequenceConditionOverrides)
        : {},
    [activeSequence, sequenceConditionOverrides],
  );

  const cappedSequenceIndex = sequenceEntries.length
    ? Math.min(Math.max(sequenceIndex, 0), sequenceEntries.length - 1)
    : 0;

  const currentSequenceEntry = sequenceEntries[cappedSequenceIndex];
  const isSequenceActive = Boolean(activeSequence);
  const hasPreviousSequenceStage = isSequenceActive && cappedSequenceIndex > 0;
  const hasNextSequenceStage =
    isSequenceActive && cappedSequenceIndex < sequenceEntries.length - 1;
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
      actions.setActiveCharms(orderCharmIds(charmIds));
    },
    [actions],
  );

  const toggleCharm = useCallback(
    (charmId: string) => {
      const isActive = activeCharmIds.includes(charmId);
      if (isActive) {
        setActiveCharms(activeCharmIds.filter((id) => id !== charmId));
        return;
      }

      const conflict = REPLACEABLE_CHARMS.get(charmId);
      const withoutConflict = conflict
        ? activeCharmIds.filter((id) => id !== conflict)
        : activeCharmIds;

      const nextIds = [...withoutConflict, charmId];
      setActiveCharms(nextIds);
    },
    [activeCharmIds, setActiveCharms],
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
      const conflict = REPLACEABLE_CHARMS.get(charmId);
      const withoutConflict = conflict
        ? activeCharmIds.filter((id) => id !== conflict)
        : activeCharmIds;
      const candidate = [...withoutConflict, charmId];
      return calculateCharmCost(candidate) <= notchLimit;
    },
    [activeCharmIds, notchLimit],
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

  return {
    state,
    actions,
    derived,
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
    notchLimit,
    activeCharmIds,
    activeCharmCost,
    canEquipCharm,
    toggleCharm,
    applyCharmPreset,
    setNotchLimit,
    setNailUpgrade,
    setSpellLevel,
    nailUpgrades,
    spells,
    charmDetails,
  };
};
