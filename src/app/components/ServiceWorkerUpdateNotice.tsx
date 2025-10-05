import type { FC } from 'react';

import { useServiceWorkerUpdates } from './useServiceWorkerUpdates';

export const ServiceWorkerUpdateNotice: FC = () => {
  const { offlineReady, shouldShowBanner } = useServiceWorkerUpdates();

  const showDevOfflineBanner = import.meta.env.DEV && offlineReady && !shouldShowBanner;

  if (!shouldShowBanner && !showDevOfflineBanner) {
    return null;
  }

  const className = showDevOfflineBanner
    ? 'sw-update-banner sw-update-banner--dev'
    : 'sw-update-banner';

  const message = shouldShowBanner
    ? 'A new update is ready. The tracker will refresh in a moment.'
    : 'Service worker ready for offline use (dev only).';

  return (
    <div className={className} role="status" aria-live="polite">
      {message}
    </div>
  );
};
