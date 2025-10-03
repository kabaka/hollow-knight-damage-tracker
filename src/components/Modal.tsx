import { useEffect, useRef, type FC, type ReactNode } from 'react';

type ModalProps = {
  readonly isOpen: boolean;
  readonly titleId: string;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly onClose: () => void;
  readonly children: ReactNode;
};

const useModalLifecycle = (isOpen: boolean, onClose: () => void) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    queueMicrotask(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return closeButtonRef;
};

export const Modal: FC<ModalProps> = ({
  isOpen,
  titleId,
  title,
  subtitle,
  onClose,
  children,
}) => {
  const closeButtonRef = useModalLifecycle(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="modal__backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <h2 id={titleId} className="modal__title">
              {title}
            </h2>
            {subtitle ? <p className="modal__subtitle">{subtitle}</p> : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="modal__close"
            onClick={onClose}
          >
            Close
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
};

export type { ModalProps };
