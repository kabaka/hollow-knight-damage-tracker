import { useEffect, useMemo, useRef, useState } from 'react';

import { subscribeToServiceWorkerEvents } from '../../sw-registration';
import { useFightStateSelector } from '../../features/fight-state/FightStateContext';
import { PERSIST_FLUSH_EVENT } from '../../utils/persistenceEvents';

const RELOAD_DELAY_MS = 250;

const getServiceWorkerContainer = (): ServiceWorkerContainer | undefined => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }

  const navigatorWithServiceWorker = navigator as Navigator & {
    serviceWorker?: ServiceWorkerContainer;
  };

  return navigatorWithServiceWorker.serviceWorker;
};

export const useServiceWorkerUpdates = () => {
  const isFightInProgress = useFightStateSelector(
    (state) => state.fightStartTimestamp !== null && state.fightEndTimestamp === null,
  );

  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [controllerChanged, setControllerChanged] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const reloadScheduledRef = useRef(false);
  const hasControlledClientRef = useRef(Boolean(getServiceWorkerContainer()?.controller));

  useEffect(() => {
    const unsubscribe = subscribeToServiceWorkerEvents((event) => {
      if (event.type === 'need-refresh') {
        setNeedsRefresh(true);
      } else if (event.type === 'offline-ready') {
        setOfflineReady(true);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const serviceWorkerContainer = getServiceWorkerContainer();

    if (!serviceWorkerContainer) {
      return;
    }

    const handleControllerChange = () => {
      const controller = serviceWorkerContainer.controller;

      if (!hasControlledClientRef.current) {
        hasControlledClientRef.current = Boolean(controller);
        if (import.meta.env.DEV) {
          console.info(
            '[sw] controller gained control for the first time; skipping reload',
          );
        }
        return;
      }

      if (!controller) {
        if (import.meta.env.DEV) {
          console.warn(
            '[sw] controller change without active controller; skipping reload',
          );
        }
        return;
      }

      setControllerChanged(true);
      if (import.meta.env.DEV) {
        console.info('[sw] controller changed; will reload when safe');
      }
    };

    serviceWorkerContainer.addEventListener('controllerchange', handleControllerChange);

    return () => {
      serviceWorkerContainer.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !controllerChanged ||
      isFightInProgress ||
      reloadScheduledRef.current
    ) {
      return;
    }

    reloadScheduledRef.current = true;
    window.dispatchEvent(new Event(PERSIST_FLUSH_EVENT));

    const reloadTimer = window.setTimeout(() => {
      if (import.meta.env.DEV) {
        console.info('[sw] reloading to apply fresh assets');
      }
      window.location.reload();
    }, RELOAD_DELAY_MS);

    return () => {
      window.clearTimeout(reloadTimer);
    };
  }, [controllerChanged, isFightInProgress]);

  const shouldShowBanner = useMemo(
    () => needsRefresh && !isFightInProgress,
    [needsRefresh, isFightInProgress],
  );

  return {
    offlineReady,
    shouldShowBanner,
  };
};
