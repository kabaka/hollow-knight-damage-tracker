import { type ComponentPropsWithoutRef, type FC } from 'react';

type BossHealthBarProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  readonly current: number;
  readonly total: number;
  readonly label?: string;
  readonly labelClassName?: string;
  readonly valueLabel?: string;
  readonly valueClassName?: string;
  readonly trackClassName?: string;
  readonly fillClassName?: string;
  readonly progressbarAriaLabel?: string;
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
  ...wrapperProps
}) => {
  const percentRemaining = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;

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
