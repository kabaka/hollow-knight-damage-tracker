import type { FC } from 'react';

interface SparklineProps {
  data: number[];
  ariaLabel: string;
  className?: string;
  width?: number;
  height?: number;
  padding?: number;
}

const buildPolylinePoints = (
  data: number[],
  width: number,
  height: number,
  padding: number,
) => {
  const size = data.length;

  if (size === 0) {
    return '';
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  if (innerWidth <= 0 || innerHeight <= 0) {
    return '';
  }

  const step = size > 1 ? innerWidth / (size - 1) : innerWidth;

  return data
    .map((value, index) => {
      const normalized = range === 0 ? 0.5 : (value - min) / range;
      const x = padding + index * step;
      const y = padding + (1 - normalized) * innerHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
};

export const Sparkline: FC<SparklineProps> = ({
  data,
  ariaLabel,
  className,
  width = 88,
  height = 28,
  padding = 2,
}) => {
  if (data.length < 2) {
    return null;
  }

  const polylinePoints = buildPolylinePoints(data, width, height, padding);

  if (!polylinePoints) {
    return null;
  }

  const sparklineClassName = ['sparkline', className].filter(Boolean).join(' ');
  const areaPoints = `${padding},${height - padding} ${polylinePoints} ${width - padding},${
    height - padding
  }`;

  return (
    <svg
      className={sparklineClassName}
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <title>{ariaLabel}</title>
      <polygon className="sparkline__area" points={areaPoints} />
      <polyline className="sparkline__line" points={polylinePoints} />
    </svg>
  );
};
