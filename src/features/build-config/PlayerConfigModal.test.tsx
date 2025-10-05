import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';
import { CharmFlightSprite, PlayerConfigModal } from './PlayerConfigModal';

const openModal = () =>
  renderWithFightProvider(<PlayerConfigModal isOpen onClose={() => {}} />);

const baseAnimation = {
  key: 'flight',
  charmId: 'shaman-stone',
  direction: 'equip' as const,
  icon: '/charms/shaman-stone.png',
  from: { x: 5, y: 10 },
  to: { x: 20, y: 40 },
  size: { width: 32, height: 32 },
} as const;

describe('PlayerConfigModal charms', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retains rapid charm selections without dropping earlier choices', () => {
    vi.useFakeTimers();
    openModal();

    const compassButton = screen.getByRole('button', {
      name: /wayward compass/i,
    });
    const swarmButton = screen.getByRole('button', {
      name: /gathering swarm/i,
    });

    act(() => {
      fireEvent.click(compassButton);
      fireEvent.click(swarmButton);
    });

    act(() => {
      vi.runAllTimers();
    });

    const equippedList = screen.getByRole('list');
    const equippedItems = within(equippedList).getAllByRole('listitem');

    expect(equippedItems).toHaveLength(2);
    expect(equippedItems[0]).toHaveTextContent(/wayward compass/i);
    expect(equippedItems[1]).toHaveTextContent(/gathering swarm/i);
  });
});

describe('CharmFlightSprite', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('waits for a second animation frame before moving to the destination', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const requestSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const onComplete = vi.fn();

    const { container, unmount } = render(
      <CharmFlightSprite animation={baseAnimation} onComplete={onComplete} />,
    );

    const element = container.querySelector('.charm-flight') as HTMLImageElement;
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      width: baseAnimation.size.width,
      height: baseAnimation.size.height,
      top: 10,
      left: 20,
      bottom: 42,
      right: 52,
      x: 20,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect);

    expect(rafCallbacks).toHaveLength(1);
    expect(element.style.transform).toBe('translate(5px, 10px)');

    act(() => {
      rafCallbacks[0](0);
    });

    expect(rectSpy).toHaveBeenCalledTimes(1);
    expect(rafCallbacks).toHaveLength(2);

    act(() => {
      rafCallbacks[1](16);
    });

    expect(element.style.transform).toBe('translate(20px, 40px)');
    expect(onComplete).not.toHaveBeenCalled();

    unmount();

    expect(requestSpy).toHaveBeenCalledTimes(2);
    expect(cancelSpy).toHaveBeenCalledWith(1);
    expect(cancelSpy).toHaveBeenCalledWith(2);
  });

  it('completes immediately when no movement is needed', () => {
    const requestSpy = vi.spyOn(window, 'requestAnimationFrame');
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const onComplete = vi.fn();

    render(
      <CharmFlightSprite
        animation={{
          ...baseAnimation,
          key: 'static-flight',
          from: { x: 12, y: 18 },
          to: { x: 12, y: 18 },
        }}
        onComplete={onComplete}
      />,
    );

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'static-flight' }),
    );
    expect(requestSpy).not.toHaveBeenCalled();
    expect(cancelSpy).not.toHaveBeenCalled();
  });
});
