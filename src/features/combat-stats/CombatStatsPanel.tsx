import type { FC } from 'react';
import { useMemo } from 'react';

import { useFightDerivedStats, useFightState } from '../fight-state/FightStateContext';
import { Sparkline, type SparklinePoint } from './Sparkline';

const FRAMES_PER_SECOND = 60;
const FRAME_DURATION_MS = 1000 / FRAMES_PER_SECOND;

const formatInteger = (value: number) => value.toLocaleString();

const formatDecimal = (value: number | null, fractionDigits = 1) =>
  value == null ? '—' : value.toFixed(fractionDigits);

interface TimelinePoint {
  time: number;
  cumulativeDamage: number;
  remainingHp: number;
  frameDamage: number;
  dps: number;
}

const buildTimeline = (
  damageLog: { timestamp: number; damage: number }[],
  targetHp: number,
  endTimestamp: number | null,
): TimelinePoint[] => {
  if (damageLog.length === 0) {
    return [];
  }

  const startTime = damageLog[0]?.timestamp ?? 0;
  const lastEventTimestamp = damageLog[damageLog.length - 1]?.timestamp ?? startTime;
  const resolvedEndTime = Math.max(
    lastEventTimestamp,
    endTimestamp ?? lastEventTimestamp,
  );
  const totalDuration = Math.max(FRAME_DURATION_MS, resolvedEndTime - startTime);
  const frameCount = Math.ceil(totalDuration / FRAME_DURATION_MS) + 1;

  const timeline: TimelinePoint[] = [];
  let cumulativeDamage = 0;
  let eventIndex = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const elapsed = frame === frameCount - 1 ? totalDuration : frame * FRAME_DURATION_MS;
    const frameTimestamp = startTime + elapsed;
    let frameDamage = 0;

    while (
      eventIndex < damageLog.length &&
      damageLog[eventIndex]?.timestamp <= frameTimestamp
    ) {
      const event = damageLog[eventIndex];
      cumulativeDamage += event.damage;
      frameDamage += event.damage;
      eventIndex += 1;
    }

    const elapsedSeconds = elapsed / 1000;
    const dps = elapsedSeconds > 0 ? cumulativeDamage / elapsedSeconds : 0;
    const remainingHp = Math.max(0, targetHp - cumulativeDamage);
    timeline.push({
      time: elapsed,
      cumulativeDamage,
      remainingHp,
      frameDamage,
      dps,
    });
  }

  return timeline;
};

const toSparklineSeries = (
  timeline: TimelinePoint[],
  selector: (point: TimelinePoint) => number,
): SparklinePoint[] =>
  timeline.map((point) => ({ time: point.time, value: selector(point) }));

const buildDamagePerHitSeries = (
  damageLog: { timestamp: number; damage: number }[],
): SparklinePoint[] =>
  damageLog.map((event, index) => ({ time: index + 1, value: event.damage }));

const buildDpsBucketSeries = (timeline: TimelinePoint[]): SparklinePoint[] => {
  if (timeline.length === 0) {
    return [];
  }

  const series: SparklinePoint[] = [];
  let currentBucketIndex = 0;
  let bucketStart = 0;
  let bucketDamage = 0;

  for (const point of timeline) {
    const pointBucketIndex = Math.floor(point.time / 1000);

    while (currentBucketIndex < pointBucketIndex) {
      const bucketDurationSeconds = 1;
      series.push({
        time: (currentBucketIndex + 1) * 1000,
        value: bucketDurationSeconds > 0 ? bucketDamage / bucketDurationSeconds : 0,
      });
      currentBucketIndex += 1;
      bucketStart = currentBucketIndex * 1000;
      bucketDamage = 0;
    }

    bucketDamage += point.frameDamage;

    const elapsedInBucket = point.time - bucketStart;

    if (elapsedInBucket <= 0) {
      series.push({ time: point.time, value: bucketDamage });
      continue;
    }

    const bucketDurationSeconds = Math.min(elapsedInBucket, 1000) / 1000;
    series.push({
      time: point.time,
      value: bucketDurationSeconds > 0 ? bucketDamage / bucketDurationSeconds : 0,
    });
  }

  return series;
};

export const CombatStatsPanel: FC = () => {
  const {
    state: { damageLog },
  } = useFightState();
  const {
    targetHp,
    totalDamage,
    remainingHp,
    attacksLogged,
    averageDamage,
    actionsPerMinute,
    fightEndTimestamp,
    fightStartTimestamp,
    frameTimestamp,
  } = useFightDerivedStats();

  const timeline = useMemo(
    () => buildTimeline(damageLog, targetHp, fightEndTimestamp),
    [damageLog, targetHp, fightEndTimestamp],
  );

  const liveTimelinePoint = useMemo(() => {
    if (
      timeline.length === 0 ||
      fightEndTimestamp != null ||
      fightStartTimestamp == null
    ) {
      return null;
    }

    const lastPoint = timeline[timeline.length - 1];
    const elapsed = Math.max(0, frameTimestamp - fightStartTimestamp);

    if (elapsed <= lastPoint.time) {
      return null;
    }

    const elapsedSeconds = elapsed / 1000;
    const cumulativeDamage = lastPoint.cumulativeDamage;

    return {
      time: elapsed,
      cumulativeDamage,
      remainingHp: Math.max(0, targetHp - cumulativeDamage),
      frameDamage: 0,
      dps: elapsedSeconds > 0 ? cumulativeDamage / elapsedSeconds : 0,
    } satisfies TimelinePoint;
  }, [timeline, fightEndTimestamp, fightStartTimestamp, frameTimestamp, targetHp]);

  const timelineWithLive = useMemo(() => {
    if (!liveTimelinePoint) {
      return timeline;
    }

    const lastPoint = timeline[timeline.length - 1];

    if (
      lastPoint &&
      lastPoint.time === liveTimelinePoint.time &&
      lastPoint.cumulativeDamage === liveTimelinePoint.cumulativeDamage &&
      lastPoint.remainingHp === liveTimelinePoint.remainingHp
    ) {
      return timeline;
    }

    return [...timeline, liveTimelinePoint];
  }, [timeline, liveTimelinePoint]);

  const cumulativeDamageSeries = useMemo(
    () => toSparklineSeries(timelineWithLive, (point) => point.cumulativeDamage),
    [timelineWithLive],
  );
  const remainingHpSeries = useMemo(
    () => toSparklineSeries(timelineWithLive, (point) => point.remainingHp),
    [timelineWithLive],
  );
  const damagePerHitSeries = useMemo(
    () => buildDamagePerHitSeries(damageLog),
    [damageLog],
  );
  const dpsSeries = useMemo(
    () => buildDpsBucketSeries(timelineWithLive),
    [timelineWithLive],
  );

  const stats = [
    { id: 'target-hp', label: 'Target HP', value: formatInteger(targetHp) },
    {
      id: 'damage-logged',
      label: 'Damage Logged',
      value: formatInteger(totalDamage),
      trend: {
        data: cumulativeDamageSeries,
        ariaLabel: 'Total damage dealt over time',
      },
    },
    {
      id: 'remaining-hp',
      label: 'Remaining HP',
      value: formatInteger(remainingHp),
      trend: {
        data: remainingHpSeries,
        ariaLabel: 'Remaining health over time',
        valueDomain: [0, targetHp],
      },
    },
    { id: 'attacks-logged', label: 'Attacks Logged', value: attacksLogged.toString() },
    {
      id: 'average-damage',
      label: 'Average Damage',
      value: formatDecimal(averageDamage),
      trend: {
        data: damagePerHitSeries,
        ariaLabel: 'Damage dealt per logged attack',
      },
    },
    {
      id: 'dps',
      label: 'DPS',
      trend: {
        data: dpsSeries,
        ariaLabel: 'Damage per second trend',
      },
    },
    {
      id: 'actions-per-minute',
      label: 'Actions / Min',
      value: formatDecimal(actionsPerMinute),
    },
  ];

  const isLowHealth = targetHp > 0 && remainingHp > 0 && remainingHp / targetHp <= 0.25;

  return (
    <div className="data-list" aria-live="polite">
      {stats.map((stat) => (
        <div key={stat.id} className="data-list__item" data-stat-id={stat.id}>
          <span className="data-list__label">{stat.label}</span>
          <span className="data-list__value">
            {stat.value != null ? (
              <span
                className="data-list__value-text"
                data-low-health={
                  stat.id === 'remaining-hp' && isLowHealth ? 'true' : undefined
                }
              >
                {stat.value}
              </span>
            ) : null}
            {stat.trend && stat.trend.data.length >= 2 ? (
              <Sparkline
                data={stat.trend.data}
                ariaLabel={stat.trend.ariaLabel}
                valueDomain={stat.trend.valueDomain}
              />
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
};
