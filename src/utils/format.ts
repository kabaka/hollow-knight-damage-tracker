export const formatNumber = (value: number): string => value.toLocaleString();

export const formatDecimal = (value: number | null, fractionDigits = 1): string => {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
};

export const formatStopwatch = (value: number | null): string => {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }

  if (value <= 0) {
    return '0:00.00';
  }

  const hundredths = Math.floor(value / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths / 100) % 60);
  const remainingHundredths = hundredths % 100;

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${remainingHundredths
    .toString()
    .padStart(2, '0')}`;
};

export const formatRelativeTime = (
  start: number | null,
  timestamp: number | null,
): string => {
  if (start == null || timestamp == null) {
    return '—';
  }

  const elapsedSeconds = Math.max(0, (timestamp - start) / 1000);
  return `${elapsedSeconds.toFixed(2)}s`;
};
