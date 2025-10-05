import { useEffect, useMemo, useRef, useState } from 'react';

import { subscribeToServiceWorkerEvents } from '../../sw-registration';
import { useFightStateSelector } from '../../features/fight-state/FightStateContext';
import { PERSIST_FLUSH_EVENT } from '../../utils/persistenceEvents';

const RELOAD_DELAY_MS = 250;

export const useServiceWorkerUpdates = () => {
  const isFightInProgress = useFightStateSelector(
    (state) => state.fightStartTimestamp !== null && state.fightEndTimestamp === null,
  );

  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [controllerChanged, setControllerChanged] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const reloadScheduledRef = useRef(false);

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
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      setControllerChanged(true);
      if (import.meta.env.DEV) {
        console.info('[sw] controller changed; will reload when safe');
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener(
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
