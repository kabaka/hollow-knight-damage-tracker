import type { FC, PropsWithChildren, RefObject } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AppButton } from '../../components/AppButton';
import { bossMap } from '../../data';
import { formatNumber, formatRelativeTime } from '../../utils/format';
import {
  useFightDerivedStats,
  useFightState,
  type AttackEvent,
} from '../fight-state/FightStateContext';
import { useSequenceContext } from '../fight-state/useSequenceContext';

type CombatLogEntry =
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

const STORAGE_KEY = 'hollow-knight-damage-tracker:combat-log';
const STORAGE_VERSION = 1;

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

type CombatLogContextValue = {
  entries: CombatLogEntry[];
  logViewportRef: RefObject<HTMLDivElement>;
  handleResetLog: () => void;
};

const CombatLogContext = createContext<CombatLogContextValue | null>(null);

const useCombatLogContext = () => {
  const context = useContext(CombatLogContext);
  if (!context) {
    throw new Error('useCombatLogContext must be used within a CombatLogProvider');
  }
  return context;
};

const useCombatLogController = (): CombatLogContextValue => {
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

    for (const event of damageLog) {
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

  useEffect(() => {
    if (!hasHydratedRef.current || typeof window === 'undefined') {
      return;
    }

    try {
      const payload: PersistedCombatLogState = {
        version: STORAGE_VERSION,
        entries,
        entryId: entryIdRef.current,
        currentFight: { ...currentFightRef.current },
        runningDamage: runningDamageRef.current,
        targetHp: targetHpRef.current,
        lastFightEnd: lastFightEndRef.current,
        processedEventIds: Array.from(processedEventIdsRef.current),
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore persistence errors to keep the log responsive.
    }
  }, [entries]);

  useEffect(() => {
    if (entries.length === 0) {
      return;
    }
    const viewport = logViewportRef.current;
    if (!viewport) {
      return;
    }
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ top: viewport.scrollHeight });
    } else {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [entries]);

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

export const CombatLogProvider: FC<PropsWithChildren> = ({ children }) => {
  const { entries, logViewportRef, handleResetLog } = useCombatLogController();
  const contextValue = useMemo(
    () => ({ entries, logViewportRef, handleResetLog }),
    [entries, handleResetLog, logViewportRef],
  );

  return (
    <CombatLogContext.Provider value={contextValue}>{children}</CombatLogContext.Provider>
  );
};

export const CombatLogPanel: FC = () => {
  const { entries, logViewportRef } = useCombatLogContext();

  return (
    <div className="combat-log__wrapper">
      <div
        ref={logViewportRef}
        className="combat-log"
        role="log"
        aria-live="polite"
        aria-label="Combat history"
      >
        {entries.length === 0 ? (
          <div className="combat-log__placeholder">Combat log will appear here.</div>
        ) : (
          <ol className="combat-log__entries">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="combat-log__entry"
                data-entry-type={entry.type}
              >
                {entry.type === 'event' ? (
                  <>
                    <span className="combat-log__timestamp">{entry.timestamp}</span>
                    <div className="combat-log__content">
                      <span className="combat-log__message">{entry.message}</span>
                      {entry.detail ? (
                        <span className="combat-log__detail">{entry.detail}</span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="combat-log__banner">
                    <span className="combat-log__message">{entry.message}</span>
                    {entry.context ? (
                      <span className="combat-log__context">{entry.context}</span>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export const CombatLogClearButton: FC = () => {
  const { handleResetLog } = useCombatLogContext();

  return (
    <AppButton type="button" onClick={handleResetLog} aria-label="Clear combat log">
      Clear
    </AppButton>
  );
};
