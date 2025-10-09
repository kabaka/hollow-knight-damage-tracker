import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

describe('Modal', () => {
  it('locks body scroll while open and restores on unmount', () => {
    document.body.style.overflow = 'auto';

    const handleClose = vi.fn();
    const { unmount } = render(
      <Modal isOpen onClose={handleClose} titleId="modal-title" title="Example">
        <p>Content</p>
      </Modal>,
    );

    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    unmount();

    expect(document.body).toHaveStyle({ overflow: 'auto' });
  });

  it('focuses the close button when opened', async () => {
    const handleClose = vi.fn();

    render(
      <Modal isOpen onClose={handleClose} titleId="modal-title" title="Example">
        <p>Content</p>
      </Modal>,
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });

    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });
  });

  it('invokes onClose when Escape is pressed', () => {
    const handleClose = vi.fn();

    render(
      <Modal isOpen onClose={handleClose} titleId="modal-title" title="Example">
        <p>Content</p>
      </Modal>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when the backdrop is clicked', () => {
    const handleClose = vi.fn();

    render(
      <Modal isOpen onClose={handleClose} titleId="modal-title" title="Example">
        <p>Content</p>
      </Modal>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
