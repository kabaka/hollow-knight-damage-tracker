import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useVisualViewportCssVars } from './useVisualViewportCssVars';

declare global {
  interface Window {
    visualViewport?: VisualViewport;
  }
}

type ListenerMap = Map<string, Set<EventListener>>;

const createListenerMap = (): ListenerMap => new Map();

const getViewportVar = (name: string) =>
  document.documentElement.style.getPropertyValue(name).trim();

const createMockVisualViewport = (listeners: ListenerMap) => {
  let height = 540;
  let offsetTop = 12;

  const addEventListener = (type: string, listener: EventListener) => {
    const entry = listeners.get(type) ?? new Set<EventListener>();
    entry.add(listener);
    listeners.set(type, entry);
  };

  const removeEventListener = (type: string, listener: EventListener) => {
    const entry = listeners.get(type);
    if (!entry) {
      return;
    }
    entry.delete(listener);
    if (entry.size === 0) {
      listeners.delete(type);
    }
  };

  return {
    get height() {
      return height;
    },
    set height(value: number) {
      height = value;
    },
    get offsetTop() {
      return offsetTop;
    },
    set offsetTop(value: number) {
      offsetTop = value;
    },
    addEventListener,
    removeEventListener,
  } as unknown as VisualViewport;
};

describe('useVisualViewportCssVars', () => {
  const originalInnerHeight = window.innerHeight;
  const originalVisualViewport = window.visualViewport;
  const listeners = createListenerMap();

  beforeEach(() => {
    listeners.clear();
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 812,
    });

    window.visualViewport = createMockVisualViewport(listeners);
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--visual-viewport-height');
    document.documentElement.style.removeProperty('--visual-viewport-offset-top');
    document.documentElement.style.removeProperty('--visual-viewport-offset-bottom');
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: originalInnerHeight,
    });
    window.visualViewport = originalVisualViewport;
  });

  it('applies CSS variables using the current visual viewport metrics', async () => {
    const { unmount } = renderHook(() => useVisualViewportCssVars());

    await waitFor(() => {
      expect(getViewportVar('--visual-viewport-height')).toBe('540.00px');
    });
    expect(getViewportVar('--visual-viewport-offset-top')).toBe('12.00px');
    expect(getViewportVar('--visual-viewport-offset-bottom')).toBe('260.00px');

    unmount();
  });

  it('updates CSS variables when the visual viewport changes', async () => {
    const { unmount } = renderHook(() => useVisualViewportCssVars());

    const resizeListeners = listeners.get('resize');
    expect(resizeListeners?.size).toBeGreaterThanOrEqual(1);

    act(() => {
      if (!window.visualViewport || !resizeListeners) {
        throw new Error('Expected visualViewport listeners to exist');
      }
      window.visualViewport.height = 620;
      window.visualViewport.offsetTop = 0;
      resizeListeners.forEach((listener) => listener(new Event('resize')));
    });

    await waitFor(() => {
      expect(getViewportVar('--visual-viewport-height')).toBe('620.00px');
    });
    expect(getViewportVar('--visual-viewport-offset-top')).toBe('0.00px');
    expect(getViewportVar('--visual-viewport-offset-bottom')).toBe('192.00px');

    unmount();
  });
});
