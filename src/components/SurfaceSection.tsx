import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

export type SurfaceSectionProps<T extends ElementType = 'section'> = {
  readonly as?: T;
  readonly title: ReactNode;
  readonly titleId: string;
  readonly titleAs?: ElementType;
  readonly actions?: ReactNode;
  readonly description?: ReactNode;
  readonly bodyClassName?: string;
  readonly headerClassName?: string;
  readonly actionsClassName?: string;
  readonly variant?: 'panel' | 'navbar';
  readonly contentRef?: (element: HTMLElement | null) => void;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'title' | 'titleAs' | 'children'> & {
    readonly children: ReactNode;
  };

export const SurfaceSection = <T extends ElementType = 'section'>(
  props: SurfaceSectionProps<T>,
) => {
  const {
    as,
    title,
    titleId,
    titleAs: TitleComponent = 'h2',
    actions,
    description,
    children,
    className,
    bodyClassName,
    headerClassName,
    actionsClassName,
    variant = 'panel',
    contentRef,
    ...rest
  } = props;

  const Component: ElementType = as ?? 'section';

  return (
    <Component
      aria-labelledby={titleId}
      className={[
        'surface-section',
        variant === 'navbar' ? 'surface-section--navbar' : 'surface-section--panel',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <div
        className={[
          'surface-section__header',
          variant === 'navbar' ? 'surface-section__header--navbar' : null,
          headerClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <TitleComponent id={titleId} className="surface-section__title">
          {title}
        </TitleComponent>
        {actions ? (
          <div
            className={[
              'surface-section__actions',
              variant === 'navbar' ? 'surface-section__actions--navbar' : null,
              actionsClassName,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {description ? (
        <div className="surface-section__description">{description}</div>
      ) : null}
      <div
        ref={contentRef}
        className={[
          'surface-section__body',
          variant === 'navbar'
            ? 'surface-section__body--navbar'
            : 'surface-section__body--panel',
          bodyClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </Component>
  );
};
