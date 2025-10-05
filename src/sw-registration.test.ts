import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ServiceWorkerUpdateEvent } from './sw-registration';

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

type RegisterSWOptions = {
  onRegistered?: (registration?: ServiceWorkerRegistration) => void;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisterError?: (error: unknown) => void;
};

const registerSWMock = vi.fn<(options?: RegisterSWOptions) => UpdateServiceWorker>();

vi.mock('virtual:pwa-register', () => ({
  registerSW: registerSWMock,
}));

afterEach(() => {
  registerSWMock.mockReset();
  vi.resetModules();
});

describe('setupServiceWorkerRegistration', () => {
  const importModule = async () => import('./sw-registration');

  it('caches the update callback after the initial registration', async () => {
    const updateMock = vi
      .fn<(reloadPage?: boolean) => Promise<void>>()
      .mockResolvedValue(undefined);
    registerSWMock.mockImplementation(() => updateMock);

    const { setupServiceWorkerRegistration } = await importModule();

    const firstCall = setupServiceWorkerRegistration();
    const secondCall = setupServiceWorkerRegistration();

    expect(registerSWMock).toHaveBeenCalledTimes(1);
    expect(secondCall).toBe(firstCall);
    expect(firstCall).toBe(updateMock);
  });

  it('notifies subscribers for lifecycle events and invokes the update callback', async () => {
    const updateMock = vi
      .fn<(reloadPage?: boolean) => Promise<void>>()
      .mockResolvedValue(undefined);
    let capturedOptions: RegisterSWOptions | undefined;

    registerSWMock.mockImplementation((options) => {
      capturedOptions = options;
      return updateMock;
    });

    const { setupServiceWorkerRegistration, subscribeToServiceWorkerEvents } =
      await importModule();

    const receivedEvents: ServiceWorkerUpdateEvent[] = [];
    const unsubscribe = subscribeToServiceWorkerEvents((event) => {
      receivedEvents.push(event);
    });

    setupServiceWorkerRegistration();

    const registration = {
      scope: 'https://example.com/',
    } as unknown as ServiceWorkerRegistration;

    capturedOptions?.onRegistered?.(registration);
    capturedOptions?.onNeedRefresh?.();
    capturedOptions?.onOfflineReady?.();

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(receivedEvents).toEqual([
      { type: 'registered', registration },
      { type: 'need-refresh', registration },
      { type: 'offline-ready', registration },
    ]);

    unsubscribe();
  });

  it('stops delivering events after a listener unsubscribes', async () => {
    const updateMock = vi
      .fn<(reloadPage?: boolean) => Promise<void>>()
      .mockResolvedValue(undefined);
    let capturedOptions: RegisterSWOptions | undefined;

    registerSWMock.mockImplementation((options) => {
      capturedOptions = options;
      return updateMock;
    });

    const { setupServiceWorkerRegistration, subscribeToServiceWorkerEvents } =
      await importModule();

    const listener = vi.fn();
    const unsubscribe = subscribeToServiceWorkerEvents(listener);

    setupServiceWorkerRegistration();

    capturedOptions?.onRegistered?.();
    unsubscribe();
    capturedOptions?.onOfflineReady?.();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
