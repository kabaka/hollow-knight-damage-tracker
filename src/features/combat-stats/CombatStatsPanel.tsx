import type { FC } from 'react';

import { useFightState } from '../fight-state/FightStateContext';
import { Sparkline, type SparklinePoint } from './Sparkline';

const FRAMES_PER_SECOND = 60;
const FRAME_DURATION_MS = 1000 / FRAMES_PER_SECOND;

const formatInteger = (value: number) => value.toLocaleString();

const formatDecimal = (value: number | null, fractionDigits = 1) =>
  value == null ? '—' : value.toFixed(fractionDigits);

const formatDuration = (elapsedMs: number | null) => {
  if (elapsedMs == null) {
    return '—';
  }

  if (elapsedMs <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

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

export const CombatStatsPanel: FC = () => {
  const {
    state: { damageLog },
    derived: {
      targetHp,
      totalDamage,
      remainingHp,
      attacksLogged,
      averageDamage,
      dps,
      actionsPerMinute,
      elapsedMs,
      estimatedTimeRemainingMs,
      fightEndTimestamp,
      fightStartTimestamp,
      frameTimestamp,
    },
  } = useFightState();

  const timelineEndTimestamp =
    fightEndTimestamp ?? (fightStartTimestamp != null ? frameTimestamp : null);
  const timeline = buildTimeline(damageLog, targetHp, timelineEndTimestamp);
  const cumulativeDamageSeries = toSparklineSeries(
    timeline,
    (point) => point.cumulativeDamage,
  );
  const remainingHpSeries = toSparklineSeries(timeline, (point) => point.remainingHp);
  const damagePerFrameSeries = toSparklineSeries(timeline, (point) => point.frameDamage);
  const dpsSeries = toSparklineSeries(timeline, (point) => point.dps);

  const stats = [
    { label: 'Target HP', value: formatInteger(targetHp) },
    {
      label: 'Damage Logged',
      value: formatInteger(totalDamage),
      trend: {
        data: cumulativeDamageSeries,
        ariaLabel: 'Total damage dealt over time',
      },
    },
    {
      label: 'Remaining HP',
      value: formatInteger(remainingHp),
      trend: {
        data: remainingHpSeries,
        ariaLabel: 'Remaining health over time',
      },
    },
    { label: 'Attacks Logged', value: attacksLogged.toString() },
    {
      label: 'Average Damage',
      value: formatDecimal(averageDamage),
      trend: {
        data: damagePerFrameSeries,
        ariaLabel: 'Damage dealt per logged attack over time',
      },
    },
    {
      label: 'DPS',
      value: formatDecimal(dps),
      trend: {
        data: dpsSeries,
        ariaLabel: 'Damage per second trend over time',
      },
    },
    { label: 'Actions / Min', value: formatDecimal(actionsPerMinute) },
    { label: 'Elapsed', value: formatDuration(elapsedMs) },
    {
      label: 'Estimated Time Remaining',
      value: formatDuration(estimatedTimeRemainingMs),
    },
  ];

  return (
    <div className="data-list" aria-live="polite">
      <p className="section__description">
        These stats update automatically as you log damage. Use them to verify if a build
        can close the gap before enrage timers or stagger opportunities end.
      </p>
      {stats.map((stat) => (
        <div key={stat.label} className="data-list__item">
          <span className="data-list__label">{stat.label}</span>
          <span className="data-list__value">
            <span className="data-list__value-text">{stat.value}</span>
            {stat.trend && stat.trend.data.length >= 2 ? (
              <Sparkline data={stat.trend.data} ariaLabel={stat.trend.ariaLabel} />
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
};
