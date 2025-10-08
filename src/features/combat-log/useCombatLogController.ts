import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { bossMap } from '../../data';
import { formatNumber, formatRelativeTime } from '../../utils/format';
import { PERSIST_FLUSH_EVENT } from '../../utils/persistenceEvents';
import { scheduleIdleTask } from '../../utils/scheduleIdleTask';
import {
  useFightDerivedStats,
  useFightState,
  type AttackEvent,
} from '../fight-state/FightStateContext';
import { useSequenceContext } from '../fight-state/useSequenceContext';

export type CombatLogEntry =
  | {
      id: string;
      type: 'banner';
      message: string;
      context?: string;
    }
  | {
      id: string;
      type: 'event';
      timestamp: string;
      message: string;
      detail?: string;
    };

type PersistedCombatLogState = {
  version: number;
  entries: CombatLogEntry[];
  entryId: number;
  currentFight: {
    startTimestamp: number | null;
    targetId: string | null;
    sequenceId: string | null;
    sequenceIndex: number;
  };
  runningDamage: number;
  targetHp: number | null;
  lastFightEnd: number | null;
  processedEventIds: string[];
};

export type CombatLogControllerValue = {
  entries: CombatLogEntry[];
  logViewportRef: RefObject<HTMLDivElement>;
  handleResetLog: () => void;
};

const STORAGE_KEY = 'hollow-knight-damage-tracker:combat-log';
const STORAGE_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 800;
const PERSIST_IDLE_TIMEOUT_MS = 1000;
const AUTO_SCROLL_EPSILON_PX = 48;

const getTargetName = (targetId: string | null) => {
  if (!targetId) {
    return 'Custom target';
  }

  const target = bossMap.get(targetId);
  return target?.bossName ?? 'Custom target';
};

const createAttackDetail = (
  event: AttackEvent,
  cumulativeDamage: number,
  targetHp: number | null,
) => {
  const remaining = targetHp != null ? Math.max(0, targetHp - cumulativeDamage) : null;
  const segments = [
    `${formatNumber(event.damage)} dmg`,
    `total ${formatNumber(cumulativeDamage)}`,
  ];

  if (remaining != null) {
    segments.push(`${formatNumber(remaining)} HP left`);
  }

  return segments.join(' · ');
};

export const useCombatLogController = (): CombatLogControllerValue => {
  const {
    state: { damageLog, redoStack, selectedBossId },
    actions,
  } = useFightState();
  const { targetHp, fightStartTimestamp, fightEndTimestamp, totalDamage } =
    useFightDerivedStats();
  const {
    activeSequenceId,
    sequenceIndex,
    labels: sequenceLabels,
  } = useSequenceContext();

  const [entries, setEntries] = useState<CombatLogEntry[]>([]);
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const currentFightRef = useRef<{
    startTimestamp: number | null;
    targetId: string | null;
    sequenceId: string | null;
    sequenceIndex: number;
  }>({
    startTimestamp: null,
    targetId: null,
    sequenceId: null,
    sequenceIndex: 0,
  });
  const runningDamageRef = useRef<number>(0);
  const targetHpRef = useRef<number | null>(null);
  const lastFightEndRef = useRef<number | null>(null);
  const lastDamageCountRef = useRef<number>(0);
  const hasHydratedRef = useRef<boolean>(false);
  const cancelPersistRef = useRef<(() => void) | null>(null);
  const persistDebounceTimeoutRef = useRef<number | null>(null);
  const persistDirtyRef = useRef(false);
  const lastPersistTimestampRef = useRef(0);
  const entriesRef = useRef<CombatLogEntry[]>([]);
  const shouldAutoScrollRef = useRef(true);

  const logViewportRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);
  const allocateEntryId = (prefix: string) => `${prefix}-${entryIdRef.current++}`;

  const targetName = useMemo(() => getTargetName(selectedBossId), [selectedBossId]);

  useEffect(() => {
    if (typeof window === 'undefined' || hasHydratedRef.current) {
      return;
    }

    try {
      const serialized = window.sessionStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        hasHydratedRef.current = true;
        return;
      }

      const parsed = JSON.parse(serialized) as PersistedCombatLogState | null;
      if (!parsed || parsed.version !== STORAGE_VERSION) {
        hasHydratedRef.current = true;
        return;
      }

      const {
        entries: storedEntries,
        entryId,
        currentFight,
        runningDamage,
        targetHp: storedTargetHp,
        lastFightEnd,
        processedEventIds,
      } = parsed;

      const sanitizedEntries = Array.isArray(storedEntries) ? storedEntries : [];
      if (sanitizedEntries.length > 0) {
        setEntries(sanitizedEntries);
      }

      entryIdRef.current = Number.isFinite(entryId) ? entryId : sanitizedEntries.length;
      currentFightRef.current = {
        startTimestamp:
          typeof currentFight.startTimestamp === 'number'
            ? currentFight.startTimestamp
            : null,
        targetId:
          typeof currentFight.targetId === 'string' ? currentFight.targetId : null,
        sequenceId:
          typeof currentFight.sequenceId === 'string' ? currentFight.sequenceId : null,
        sequenceIndex:
          typeof currentFight.sequenceIndex === 'number' ? currentFight.sequenceIndex : 0,
      };
      runningDamageRef.current = Number.isFinite(runningDamage) ? runningDamage : 0;
      targetHpRef.current =
        storedTargetHp === null || Number.isFinite(storedTargetHp)
          ? (storedTargetHp ?? null)
          : null;
      lastFightEndRef.current = Number.isFinite(lastFightEnd) ? lastFightEnd : null;
      processedEventIdsRef.current = new Set(
        Array.isArray(processedEventIds) ? processedEventIds : [],
      );
    } catch {
      // Ignore hydration issues so the log can rebuild from fight state.
    } finally {
      hasHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    const nextEntries: CombatLogEntry[] = [];
    const processedEventIds = processedEventIdsRef.current;
    const currentFight = currentFightRef.current;

    const hasTargetChanged = currentFight.targetId !== selectedBossId;
    const isSequenceTransition =
      activeSequenceId != null &&
      (currentFight.sequenceId !== activeSequenceId ||
        currentFight.sequenceIndex !== sequenceIndex ||
        hasTargetChanged);
    if (hasTargetChanged) {
      currentFight.targetId = selectedBossId;
      currentFight.sequenceId = activeSequenceId;
      currentFight.sequenceIndex = sequenceIndex;
      const contextLabel = sequenceLabels
        ? `${sequenceLabels.sequenceName} – Stage ${sequenceLabels.stageNumber}`
        : undefined;
      nextEntries.push({
        id: allocateEntryId('target'),
        type: 'banner',
        message: `Target: ${targetName}`,
        context: contextLabel ?? undefined,
      });
    } else if (
      currentFight.sequenceId !== activeSequenceId ||
      currentFight.sequenceIndex !== sequenceIndex
    ) {
      currentFight.sequenceId = activeSequenceId;
      currentFight.sequenceIndex = sequenceIndex;
      if (sequenceLabels) {
        nextEntries.push({
          id: allocateEntryId('sequence'),
          type: 'banner',
          message: `${sequenceLabels.sequenceName} – Stage ${sequenceLabels.stageNumber}`,
          context: sequenceLabels.stageLabel ?? undefined,
        });
      }
    }

    const isNewFight =
      fightStartTimestamp != null && fightStartTimestamp !== currentFight.startTimestamp;

    if (isNewFight) {
      currentFight.startTimestamp = fightStartTimestamp;
      runningDamageRef.current = 0;
      targetHpRef.current = targetHp;
      lastFightEndRef.current = null;
      nextEntries.push({
        id: allocateEntryId('fight-start-banner'),
        type: 'banner',
        message: `Fight started vs ${targetName}`,
        context: sequenceLabels
          ? `${sequenceLabels.sequenceName} – Stage ${sequenceLabels.stageNumber}`
          : undefined,
      });
      nextEntries.push({
        id: allocateEntryId('fight-start'),
        type: 'event',
        timestamp: '0.00s',
        message: 'Starting HP',
        detail: formatNumber(targetHp),
      });
    }

    if (
      fightStartTimestamp == null &&
      currentFight.startTimestamp != null &&
      damageLog.length === 0 &&
      redoStack.length === 0 &&
      fightEndTimestamp == null
    ) {
      if (!isSequenceTransition) {
        nextEntries.push({
          id: allocateEntryId('fight-reset'),
          type: 'banner',
          message: 'Fight reset',
        });
      }
      currentFight.startTimestamp = null;
      runningDamageRef.current = 0;
      targetHpRef.current = null;
      lastFightEndRef.current = null;
    }

    const previousCount = lastDamageCountRef.current;
    let startIndex = previousCount;

    if (previousCount > damageLog.length) {
      startIndex = damageLog.length;
      processedEventIds.clear();
      runningDamageRef.current = 0;
      for (const event of damageLog) {
        processedEventIds.add(event.id);
        runningDamageRef.current += event.damage;
      }
    } else {
      startIndex = Math.max(0, Math.min(previousCount, damageLog.length));
    }

    for (let index = startIndex; index < damageLog.length; index += 1) {
      const event = damageLog[index];
      if (processedEventIds.has(event.id)) {
        continue;
      }

      processedEventIds.add(event.id);

      if (currentFight.startTimestamp == null) {
        currentFight.startTimestamp = fightStartTimestamp ?? event.timestamp;
        runningDamageRef.current = 0;
        targetHpRef.current = targetHp;
        nextEntries.push({
          id: allocateEntryId('fight-autostart'),
          type: 'banner',
          message: `Fight started vs ${targetName}`,
          context: sequenceLabels
            ? `${sequenceLabels.sequenceName} – Stage ${sequenceLabels.stageNumber}`
            : undefined,
        });
        nextEntries.push({
          id: allocateEntryId('fight-autostart-initial'),
          type: 'event',
          timestamp: '0.00s',
          message: 'Starting HP',
          detail: formatNumber(targetHp),
        });
      }

      runningDamageRef.current += event.damage;
      const eventTimestamp = formatRelativeTime(
        currentFight.startTimestamp,
        event.timestamp,
      );
      nextEntries.push({
        id: allocateEntryId('event'),
        type: 'event',
        timestamp: eventTimestamp,
        message: event.label,
        detail: createAttackDetail(event, runningDamageRef.current, targetHpRef.current),
      });
    }

    if (
      fightEndTimestamp != null &&
      currentFight.startTimestamp != null &&
      fightEndTimestamp !== lastFightEndRef.current
    ) {
      lastFightEndRef.current = fightEndTimestamp;
      const timestamp = formatRelativeTime(
        currentFight.startTimestamp,
        fightEndTimestamp,
      );
      const fightWasCleared =
        targetHpRef.current != null && runningDamageRef.current >= targetHpRef.current;
      nextEntries.push({
        id: allocateEntryId('fight-end'),
        type: 'event',
        timestamp,
        message: fightWasCleared ? 'Victory' : 'Fight ended',
        detail: `Total ${formatNumber(runningDamageRef.current)} dmg`,
      });
    }

    if (nextEntries.length > 0) {
      setEntries((previous) => [...previous, ...nextEntries]);
    }

    lastDamageCountRef.current = damageLog.length;
  }, [
    activeSequenceId,
    damageLog,
    fightEndTimestamp,
    fightStartTimestamp,
    redoStack.length,
    selectedBossId,
    sequenceLabels,
    sequenceIndex,
    targetHp,
    targetName,
  ]);

  const clearPersistTimers = useCallback(() => {
    if (persistDebounceTimeoutRef.current !== null) {
      window.clearTimeout(persistDebounceTimeoutRef.current);
      persistDebounceTimeoutRef.current = null;
    }

    cancelPersistRef.current?.();
    cancelPersistRef.current = null;
  }, []);

  const buildPersistPayload = useCallback((): PersistedCombatLogState => {
    return {
      version: STORAGE_VERSION,
      entries: entriesRef.current,
      entryId: entryIdRef.current,
      currentFight: { ...currentFightRef.current },
      runningDamage: runningDamageRef.current,
      targetHp: targetHpRef.current,
      lastFightEnd: lastFightEndRef.current,
      processedEventIds: Array.from(processedEventIdsRef.current),
    };
  }, []);

  const persistNow = useCallback(() => {
    if (!hasHydratedRef.current || typeof window === 'undefined') {
      return;
    }

    const payload = buildPersistPayload();

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      lastPersistTimestampRef.current = Date.now();
      persistDirtyRef.current = false;
    } catch {
      // Ignore persistence errors to keep the log responsive.
    }
  }, [buildPersistPayload]);

  const schedulePersist = useCallback(() => {
    if (!hasHydratedRef.current || typeof window === 'undefined') {
      return;
    }

    persistDirtyRef.current = true;

    const scheduleIdle = () => {
      cancelPersistRef.current?.();
      cancelPersistRef.current = scheduleIdleTask(
        () => {
          cancelPersistRef.current = null;

          if (!persistDirtyRef.current) {
            return;
          }

          const now = Date.now();
          const lastPersist = lastPersistTimestampRef.current;
          const hasPersistedBefore = lastPersist > 0;
          const elapsed = hasPersistedBefore
            ? now - lastPersist
            : Number.POSITIVE_INFINITY;
          if (hasPersistedBefore && elapsed < PERSIST_DEBOUNCE_MS) {
            if (persistDebounceTimeoutRef.current === null) {
              const delay = Math.max(0, PERSIST_DEBOUNCE_MS - elapsed);
              persistDebounceTimeoutRef.current = window.setTimeout(() => {
                persistDebounceTimeoutRef.current = null;
                schedulePersist();
              }, delay);
            }
            return;
          }

          persistNow();
        },
        { timeout: PERSIST_IDLE_TIMEOUT_MS },
      );
    };

    if (cancelPersistRef.current || persistDebounceTimeoutRef.current !== null) {
      return;
    }

    const now = Date.now();
    const lastPersist = lastPersistTimestampRef.current;
    const hasPersistedBefore = lastPersist > 0;
    const elapsed = hasPersistedBefore ? now - lastPersist : Number.POSITIVE_INFINITY;
    if (!hasPersistedBefore || elapsed >= PERSIST_DEBOUNCE_MS) {
      scheduleIdle();
    } else {
      const delay = Math.max(0, PERSIST_DEBOUNCE_MS - elapsed);
      persistDebounceTimeoutRef.current = window.setTimeout(() => {
        persistDebounceTimeoutRef.current = null;
        scheduleIdle();
      }, delay);
    }
  }, [persistNow]);

  const flushPersist = useCallback(() => {
    if (!hasHydratedRef.current || typeof window === 'undefined') {
      return;
    }

    clearPersistTimers();

    if (!persistDirtyRef.current) {
      return;
    }

    persistNow();
  }, [clearPersistTimers, persistNow]);

  useEffect(() => {
    if (!hasHydratedRef.current || typeof window === 'undefined') {
      return;
    }
    entriesRef.current = entries;
    schedulePersist();
  }, [entries, schedulePersist]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushPersist();
      }
    };

    const handlePageHide = () => {
      flushPersist();
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [flushPersist]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleFlush: EventListener = () => {
      flushPersist();
    };

    window.addEventListener(PERSIST_FLUSH_EVENT, handleFlush);

    return () => {
      window.removeEventListener(PERSIST_FLUSH_EVENT, handleFlush);
    };
  }, [flushPersist]);

  useEffect(
    () => () => {
      flushPersist();
    },
    [flushPersist],
  );

  useEffect(() => {
    if (entries.length === 0) {
      shouldAutoScrollRef.current = true;
      return;
    }

    const viewport = logViewportRef.current;
    if (!viewport || !shouldAutoScrollRef.current) {
      return;
    }

    const nextTop = viewport.scrollHeight;
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ top: nextTop });
    } else {
      viewport.scrollTop = nextTop;
    }
  }, [entries]);

  useEffect(() => {
    const viewport = logViewportRef.current;
    if (!viewport) {
      return;
    }

    const updateAutoScrollFlag = () => {
      const distanceFromBottom =
        viewport.scrollHeight - (viewport.scrollTop + viewport.clientHeight);
      shouldAutoScrollRef.current = distanceFromBottom <= AUTO_SCROLL_EPSILON_PX;
    };

    updateAutoScrollFlag();
    viewport.addEventListener('scroll', updateAutoScrollFlag, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', updateAutoScrollFlag);
    };
  }, []);

  useEffect(() => {
    if (damageLog.length === 0) {
      processedEventIdsRef.current = new Set();
    }
  }, [damageLog.length]);

  useEffect(() => {
    if (totalDamage === 0 && damageLog.length === 0) {
      runningDamageRef.current = 0;
    }
  }, [damageLog.length, totalDamage]);

  const resetToInitialBanner = useCallback(() => {
    const contextLabel = sequenceLabels
      ? `${sequenceLabels.sequenceName} – Stage ${sequenceLabels.stageNumber}`
      : undefined;

    entryIdRef.current = 0;
    processedEventIdsRef.current = new Set();
    runningDamageRef.current = 0;
    targetHpRef.current = targetHp;
    lastFightEndRef.current = null;
    lastDamageCountRef.current = 0;
    currentFightRef.current = {
      startTimestamp: null,
      targetId: selectedBossId,
      sequenceId: activeSequenceId,
      sequenceIndex,
    };

    const entryId = `target-${entryIdRef.current++}`;
    setEntries([
      {
        id: entryId,
        type: 'banner',
        message: `Target: ${targetName}`,
        context: contextLabel ?? undefined,
      },
    ]);
  }, [
    activeSequenceId,
    selectedBossId,
    sequenceIndex,
    sequenceLabels,
    targetHp,
    targetName,
  ]);

  const handleResetLog = useCallback(() => {
    resetToInitialBanner();
    actions.resetLog();
  }, [actions, resetToInitialBanner]);

  return {
    entries,
    logViewportRef,
    handleResetLog,
  };
};
