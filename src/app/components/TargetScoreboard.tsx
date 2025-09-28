import { useMemo, type FC } from 'react';

import type { useFightDerivedStats } from '../../features/fight-state/FightStateContext';
import { formatDecimal, formatNumber, formatStopwatch } from '../../utils/format';
import { BossHealthBar } from './BossHealthBar';
import { StageTimeline } from './StageTimeline';

export type TargetScoreboardProps = {
  readonly derived: ReturnType<typeof useFightDerivedStats>;
  readonly stageLabel: string | null;
  readonly stageProgress: { current: number; total: number } | null;
  readonly onAdvanceStage: () => void;
  readonly onRewindStage: () => void;
  readonly hasNextStage: boolean;
  readonly hasPreviousStage: boolean;
};

export const TargetScoreboard: FC<TargetScoreboardProps> = ({
  derived,
  stageLabel,
  stageProgress,
  onAdvanceStage,
  onRewindStage,
  hasNextStage,
  hasPreviousStage,
}) => {
  const {
    targetHp,
    remainingHp,
    dps,
    elapsedMs,
    estimatedTimeRemainingMs,
    averageDamage,
    actionsPerMinute,
    attacksLogged,
    totalDamage,
  } = derived;
  const metrics = useMemo(
    () => [
      { id: 'elapsed', label: 'Elapsed', value: formatStopwatch(elapsedMs) },
      {
        id: 'estimated-remaining',
        label: 'Est. Remaining',
        value: formatStopwatch(estimatedTimeRemainingMs),
      },
      {
        id: 'dps',
        label: 'DPS',
        value: formatDecimal(dps),
        sublabel: typeof totalDamage === 'number' ? formatNumber(totalDamage) : undefined,
      },
      {
        id: 'average-damage',
        label: 'Avg Dmg',
        value: formatDecimal(averageDamage),
      },
      {
        id: 'actions-per-minute',
        label: 'APM',
        value: formatDecimal(actionsPerMinute),
        sublabel:
          typeof attacksLogged === 'number' ? formatNumber(attacksLogged) : undefined,
      },
    ],
    [
      actionsPerMinute,
      attacksLogged,
      averageDamage,
      dps,
      elapsedMs,
      estimatedTimeRemainingMs,
      totalDamage,
    ],
  );

  return (
    <section className="hud-scoreboard" aria-label="Encounter scoreboard">
      <div className="hud-scoreboard__status">
        <BossHealthBar
          className="hud-health summary-chip summary-chip--accent"
          role="group"
          aria-label="Boss HP"
          label="HP"
          current={remainingHp}
          total={targetHp}
          progressbarAriaLabel="Boss HP"
          valueLabel={`${formatNumber(remainingHp)} / ${formatNumber(targetHp)}`}
        />
        <StageTimeline
          stageLabel={stageLabel}
          stageProgress={stageProgress}
          onAdvance={onAdvanceStage}
          onRewind={onRewindStage}
          hasNext={hasNextStage}
          hasPrevious={hasPreviousStage}
        />
      </div>
      <dl className="hud-metrics">
        {metrics.map((metric) => (
          <div key={metric.id} className="hud-metrics__item" data-metric-id={metric.id}>
            <dt className="hud-metrics__label">{metric.label}</dt>
            <dd className="hud-metrics__value">
              <span className="hud-metrics__value-primary">{metric.value}</span>
              {metric.sublabel ? (
                <span className="hud-metrics__sublabel">{metric.sublabel}</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
