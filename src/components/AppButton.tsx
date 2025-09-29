import type { ButtonHTMLAttributes, ForwardedRef } from 'react';
import { forwardRef } from 'react';

type AppButtonVariant = 'bevel' | 'pill';
type AppButtonSize = 'md' | 'sm';

type AppButtonProps = {
  readonly variant?: AppButtonVariant;
  readonly size?: AppButtonSize;
  readonly icon?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClassMap: Record<AppButtonVariant, string> = {
  bevel: 'app-button--bevel',
  pill: 'app-button--pill',
};

const sizeClassMap: Record<AppButtonSize, string> = {
  md: 'app-button--md',
  sm: 'app-button--sm',
};

const AppButtonComponent = (
  {
    variant = 'bevel',
    size = 'md',
    className,
    children,
    icon,
    type = 'button',
    ...rest
  }: AppButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
) => (
  <button
    ref={ref}
    className={['app-button', variantClassMap[variant], sizeClassMap[size], className]
      .filter(Boolean)
      .join(' ')}
    type={type}
    {...rest}
  >
    {icon ? (
      <span aria-hidden="true" className="app-button__icon">
        {icon}
      </span>
    ) : null}
    <span className="app-button__label">{children}</span>
  </button>
);

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  AppButtonComponent,
);
