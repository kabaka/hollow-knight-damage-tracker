import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PERSIST_FLUSH_EVENT } from '../../utils/persistenceEvents';
import { useServiceWorkerUpdates } from './useServiceWorkerUpdates';

vi.mock('../../sw-registration', () => ({
  subscribeToServiceWorkerEvents: vi.fn(() => () => {}),
}));

vi.mock('../../features/fight-state/FightStateContext', () => ({
  useFightStateSelector: vi.fn(
    (
      selector: (state: {
        fightStartTimestamp: null;
        fightEndTimestamp: null;
      }) => boolean,
    ) => selector({ fightEndTimestamp: null, fightStartTimestamp: null }),
  ),
}));

const createServiceWorkerMock = () => {
  const listeners = new Map<string, EventListenerOrEventListenerObject>();

  const serviceWorker = {
    controller: null as ServiceWorker | null,
    addEventListener: vi.fn(
      (event: string, listener: EventListenerOrEventListenerObject) => {
        listeners.set(event, listener);
      },
    ),
    removeEventListener: vi.fn((event: string) => {
      listeners.delete(event);
    }),
    dispatch(eventName: string, event: Event = new Event(eventName)) {
      const handler = listeners.get(eventName);
      if (typeof handler === 'function') {
        handler(event);
      } else if (
        handler &&
        typeof (handler as EventListenerObject).handleEvent === 'function'
      ) {
        (handler as EventListenerObject).handleEvent(event);
      }
    },
  } satisfies Partial<ServiceWorker> & {
    dispatch: (eventName: string, event?: Event) => void;
  };

  return serviceWorker;
};

const TestHarness = () => {
  useServiceWorkerUpdates();
  return null;
};

describe('useServiceWorkerUpdates', () => {
  const originalServiceWorker = navigator.serviceWorker;
  const originalDispatchEvent = window.dispatchEvent;
  const originalLocation = window.location;

  const createLocationStub = (reload: () => void): Location => ({
    ancestorOrigins: originalLocation.ancestorOrigins,
    assign: vi.fn(),
    hash: originalLocation.hash,
    host: originalLocation.host,
    hostname: originalLocation.hostname,
    href: originalLocation.href,
    origin: originalLocation.origin,
    pathname: originalLocation.pathname,
    port: originalLocation.port,
    protocol: originalLocation.protocol,
    reload,
    replace: vi.fn(),
    search: originalLocation.search,
    toString: () => originalLocation.toString(),
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker,
    });
    window.dispatchEvent = originalDispatchEvent;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not trigger a reload the first time a controller takes over', () => {
    const serviceWorker = createServiceWorkerMock();

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    });

    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: createLocationStub(reloadMock),
    });

    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    render(<TestHarness />);

    serviceWorker.controller = {} as ServiceWorker;
    act(() => {
      serviceWorker.dispatch('controllerchange');
    });

    expect(dispatchEventSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: PERSIST_FLUSH_EVENT }),
    );
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('flushes persistence and reloads when an existing controller is replaced', () => {
    vi.useFakeTimers();

    const serviceWorker = createServiceWorkerMock();
    serviceWorker.controller = {} as ServiceWorker;

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    });

    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: createLocationStub(reloadMock),
    });

    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    render(<TestHarness />);

    serviceWorker.controller = {} as ServiceWorker;
    act(() => {
      serviceWorker.dispatch('controllerchange');
    });

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: PERSIST_FLUSH_EVENT }),
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
