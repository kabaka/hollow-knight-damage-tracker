import { registerSW } from 'virtual:pwa-register';

export type ServiceWorkerUpdateEvent =
  | {
      type: 'registered';
      registration?: ServiceWorkerRegistration;
    }
  | {
      type: 'need-refresh';
      registration?: ServiceWorkerRegistration;
    }
  | {
      type: 'offline-ready';
      registration?: ServiceWorkerRegistration;
    };

type Listener = (event: ServiceWorkerUpdateEvent) => void;

const listeners = new Set<Listener>();

const notifyListeners = (event: ServiceWorkerUpdateEvent) => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[sw] listener error', error);
      }
    }
  });
};

export const subscribeToServiceWorkerEvents = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

let updateCallback: ((reloadPage?: boolean) => Promise<void>) | undefined;

export const setupServiceWorkerRegistration = () => {
  if (updateCallback) {
    return updateCallback;
  }

  let latestRegistration: ServiceWorkerRegistration | undefined;

  const updateServiceWorker = registerSW({
    onRegistered(registration) {
      latestRegistration = registration;
      notifyListeners({ type: 'registered', registration });
      if (import.meta.env.DEV) {
        console.debug('[sw] registered', registration);
      }
    },
    onNeedRefresh() {
      if (import.meta.env.DEV) {
        console.info('[sw] update available, activating new service worker');
      }
      updateServiceWorker().catch((error) => {
        if (import.meta.env.DEV) {
          console.error('[sw] failed to update service worker', error);
        }
      });
      notifyListeners({ type: 'need-refresh', registration: latestRegistration });
    },
    onOfflineReady() {
      notifyListeners({ type: 'offline-ready', registration: latestRegistration });
      if (import.meta.env.DEV) {
        console.info('[sw] app ready to work offline');
      }
    },
    onRegisterError(error) {
      console.error('[sw] registration failed', error);
    },
  });

  updateCallback = updateServiceWorker;
  return updateServiceWorker;
};
