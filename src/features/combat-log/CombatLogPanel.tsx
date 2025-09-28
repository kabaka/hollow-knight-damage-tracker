import type { FC } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { bossMap, bossSequenceMap, resolveSequenceEntries } from '../../data';
import {
  useFightDerivedStats,
  useFightState,
  type AttackEvent,
} from '../fight-state/FightStateContext';

const formatNumber = (value: number) => value.toLocaleString();

const formatRelativeTime = (start: number | null, timestamp: number | null) => {
  if (start == null || timestamp == null) {
    return '—';
  }

  const elapsedSeconds = Math.max(0, (timestamp - start) / 1000);
  return `${elapsedSeconds.toFixed(2)}s`;
};

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

const getSequenceContext = (
  sequenceId: string | null,
  sequenceIndex: number,
  sequenceConditions: ReturnType<typeof useFightState>['state']['sequenceConditions'],
) => {
  if (!sequenceId) {
    return null;
  }

  const sequence = bossSequenceMap.get(sequenceId);
  if (!sequence) {
    return null;
  }

  const entries = resolveSequenceEntries(sequence, sequenceConditions[sequenceId]);
  const stage = entries.at(sequenceIndex) ?? null;

  if (!stage) {
    return {
      sequenceName: sequence.name,
      stageLabel: null,
      stageNumber: sequenceIndex + 1,
    };
  }

  return {
    sequenceName: sequence.name,
    stageLabel: stage.target.bossName,
    stageNumber: sequenceIndex + 1,
  };
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

export const CombatLogPanel: FC = () => {
  const {
    state: {
      damageLog,
      redoStack,
      selectedBossId,
      activeSequenceId,
      sequenceIndex,
      sequenceConditions,
    },
  } = useFightState();
  const {
    targetHp,
    fightStartTimestamp,
    fightEndTimestamp,
    frameTimestamp,
    totalDamage,
  } = useFightDerivedStats();

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

  const logViewportRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);
  const allocateEntryId = (prefix: string) => `${prefix}-${entryIdRef.current++}`;

  const targetName = useMemo(() => getTargetName(selectedBossId), [selectedBossId]);
  const sequenceContext = useMemo(
    () => getSequenceContext(activeSequenceId, sequenceIndex, sequenceConditions),
    [activeSequenceId, sequenceConditions, sequenceIndex],
  );

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
      const contextLabel = sequenceContext
        ? `${sequenceContext.sequenceName} – Stage ${sequenceContext.stageNumber}`
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
      if (sequenceContext) {
        nextEntries.push({
          id: allocateEntryId('sequence'),
          type: 'banner',
          message: `${sequenceContext.sequenceName} – Stage ${sequenceContext.stageNumber}`,
          context: sequenceContext.stageLabel ?? undefined,
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
        context: sequenceContext
          ? `${sequenceContext.sequenceName} – Stage ${sequenceContext.stageNumber}`
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
          context: sequenceContext
            ? `${sequenceContext.sequenceName} – Stage ${sequenceContext.stageNumber}`
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
    frameTimestamp,
    redoStack.length,
    selectedBossId,
    sequenceContext,
    sequenceIndex,
    targetHp,
    targetName,
  ]);

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

  if (entries.length === 0) {
    return (
      <div
        className="combat-log"
        role="log"
        aria-live="polite"
        aria-label="Combat history"
      >
        <div className="combat-log__placeholder">Combat log will appear here.</div>
      </div>
    );
  }

  return (
    <div
      ref={logViewportRef}
      className="combat-log"
      role="log"
      aria-live="polite"
      aria-label="Combat history"
    >
      <ol className="combat-log__entries">
        {entries.map((entry) => (
          <li key={entry.id} className="combat-log__entry" data-entry-type={entry.type}>
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
    </div>
  );
};
