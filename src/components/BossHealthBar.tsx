import { type ComponentPropsWithoutRef, type FC } from 'react';

export type BossHealthBarProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  readonly current: number;
  readonly total: number;
  readonly label?: string;
  readonly labelClassName?: string;
  readonly valueLabel?: string;
  readonly valueClassName?: string;
  readonly trackClassName?: string;
  readonly fillClassName?: string;
  readonly progressbarAriaLabel?: string;
  readonly phaseThresholds?: readonly number[];
};

const combineClassNames = (...classes: ReadonlyArray<string | undefined>): string =>
  classes.filter(Boolean).join(' ');

export const BossHealthBar: FC<BossHealthBarProps> = ({
  current,
  total,
  label,
  labelClassName,
  valueLabel,
  valueClassName,
  className,
  trackClassName,
  fillClassName,
  progressbarAriaLabel,
  phaseThresholds,
  ...wrapperProps
}) => {
  const percentRemaining = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
  const markerPercents =
    total > 0 && Array.isArray(phaseThresholds)
      ? phaseThresholds
          .filter(
            (value): value is number =>
              typeof value === 'number' &&
              Number.isFinite(value) &&
              value > 0 &&
              value < total,
          )
          .map((value) => (value / total) * 100)
      : [];

  return (
    <div className={className} {...wrapperProps}>
      {label ? (
        <span
          className={
            labelClassName === undefined
              ? 'hud-health__label'
              : combineClassNames(labelClassName)
          }
        >
          {label}
        </span>
      ) : null}
      <div
        className={combineClassNames('hud-health__track', trackClassName)}
        role="progressbar"
        aria-label={progressbarAriaLabel ?? label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        <div
          className={combineClassNames('hud-health__fill', fillClassName)}
          style={{ width: `${Math.round(percentRemaining * 100)}%` }}
          aria-hidden="true"
        />
        {markerPercents.map((percent, index) => (
          <span
            key={`marker-${index}`}
            className="hud-health__marker"
            data-testid="boss-health-marker"
            style={{ left: `${percent}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      {valueLabel ? (
        <span
          className={
            valueClassName === undefined
              ? 'hud-health__value'
              : combineClassNames(valueClassName)
          }
        >
          {valueLabel}
        </span>
      ) : null}
    </div>
  );
};
