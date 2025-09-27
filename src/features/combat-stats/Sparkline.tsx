import type { FC } from 'react';

export interface SparklinePoint {
  time: number;
  value: number;
}

interface SparklineProps {
  data: SparklinePoint[];
  ariaLabel: string;
  className?: string;
  width?: number;
  height?: number;
  padding?: number;
  valueDomain?: readonly [number, number];
}

const buildPolylinePoints = (
  data: SparklinePoint[],
  width: number,
  height: number,
  padding: number,
  valueDomain?: readonly [number, number],
) => {
  const size = data.length;

  if (size === 0) {
    return null;
  }

  let minValue = data[0]?.value ?? 0;
  let maxValue = minValue;
  let minTime = data[0]?.time ?? 0;
  let maxTime = minTime;

  for (const point of data) {
    if (point.value < minValue) {
      minValue = point.value;
    }
    if (point.value > maxValue) {
      maxValue = point.value;
    }
    if (point.time < minTime) {
      minTime = point.time;
    }
    if (point.time > maxTime) {
      maxTime = point.time;
    }
  }

  const resolvedMinValue = valueDomain ? valueDomain[0] : minValue;
  const resolvedMaxValue = valueDomain ? valueDomain[1] : maxValue;
  const valueRange = resolvedMaxValue - resolvedMinValue;
  const timeRange = maxTime - minTime;

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  if (innerWidth <= 0 || innerHeight <= 0) {
    return null;
  }

  const points = data.map(({ time, value }) => {
    const normalizedValue =
      valueRange === 0 ? 0.5 : (value - resolvedMinValue) / valueRange;
    const normalizedTime = timeRange === 0 ? 0 : (time - minTime) / timeRange;
    const x = padding + normalizedTime * innerWidth;
    const y = padding + (1 - normalizedValue) * innerHeight;
    return { x, y };
  });

  if (points.length === 0) {
    return null;
  }

  const formattedPoints = points
    .map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  const firstX = points[0]?.x ?? padding;
  const lastX = points[points.length - 1]?.x ?? padding;

  return {
    points: formattedPoints,
    firstX,
    lastX,
  };
};

export const Sparkline: FC<SparklineProps> = ({
  data,
  ariaLabel,
  className,
  width = 88,
  height = 28,
  padding = 2,
  valueDomain,
}) => {
  if (data.length < 2) {
    return null;
  }

  const polyline = buildPolylinePoints(data, width, height, padding, valueDomain);

  if (!polyline) {
    return null;
  }

  const sparklineClassName = ['sparkline', className].filter(Boolean).join(' ');
  const baselineY = height - padding;
  const areaPoints = `${polyline.firstX.toFixed(2)},${baselineY.toFixed(2)} ${polyline.points} ${polyline.lastX.toFixed(2)},${baselineY.toFixed(2)}`;

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
      <polyline className="sparkline__line" points={polyline.points} />
    </svg>
  );
};
