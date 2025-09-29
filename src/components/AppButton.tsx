import type { ButtonHTMLAttributes, ForwardedRef } from 'react';
import { forwardRef } from 'react';

type AppButtonSize = 'md' | 'sm';

type AppButtonProps = {
  readonly size?: AppButtonSize;
  readonly shortcut?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const sizeClassMap: Record<AppButtonSize, string> = {
  md: 'app-button--md',
  sm: 'app-button--sm',
};

const AppButtonComponent = (
  {
    size = 'md',
    shortcut,
    className,
    children,
    type = 'button',
    ...rest
  }: AppButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
) => {
  const displayShortcut = shortcut?.trim();

  return (
    <button
      ref={ref}
      className={[
        'app-button',
        'app-button--bevel',
        sizeClassMap[size],
        displayShortcut ? 'app-button--has-shortcut' : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      type={type}
      {...rest}
    >
      <span className="app-button__label">{children}</span>
      {displayShortcut ? (
        <span aria-hidden="true" className="app-button__shortcut">
          {displayShortcut}
        </span>
      ) : null}
    </button>
  );
};

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  AppButtonComponent,
);
