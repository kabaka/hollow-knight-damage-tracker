import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MobileStatsBar, type MobileStatsBarProps } from './MobileStatsBar';

const derivedStats: MobileStatsBarProps['derived'] = {
  targetHp: 1000,
  totalDamage: 760,
  remainingHp: 240,
  attacksLogged: 12,
  averageDamage: 20,
  elapsedMs: 90_320,
  dps: 85,
  actionsPerMinute: 48,
  estimatedTimeRemainingMs: 8_940,
  fightStartTimestamp: 0,
  fightEndTimestamp: null,
  isFightInProgress: true,
  isFightComplete: false,
  frameTimestamp: 0,
  phaseNumber: 2,
  phaseCount: 4,
  phaseLabel: 'Phase 2 – Blob barrage',
  phaseThresholds: [825, 650, 400],
};

const defaultProps: MobileStatsBarProps = {
  derived: derivedStats,
  phaseLabel: 'Phase 2 – Blob barrage',
  phaseProgress: { current: 2, total: 4 },
};

describe('MobileStatsBar', () => {
  it('renders six combat metrics in a compact layout', () => {
    render(<MobileStatsBar {...defaultProps} />);

    const metrics = screen.getAllByRole('term');
    expect(metrics).toHaveLength(6);
    expect(metrics.map((metric) => metric.textContent)).toEqual([
      'Elapsed',
      'Est. Remaining',
      'DPS',
      'Avg Dmg',
      'APM',
      'Phase',
    ]);

    expect(screen.getByText('1:30.32')).toBeInTheDocument();
    expect(screen.getByText('0:08.94')).toBeInTheDocument();
    expect(screen.getByText('85.0')).toBeInTheDocument();
    expect(screen.getByText('(760)')).toBeInTheDocument();
    expect(screen.getByText('48.0')).toBeInTheDocument();
    expect(screen.getByText('(12)')).toBeInTheDocument();
    expect(screen.getByText('Phase 2 – Blob barrage')).toBeInTheDocument();
    expect(screen.getByText('(2/4)')).toBeInTheDocument();
  });

  it('falls back gracefully when sequence information is unavailable', () => {
    render(<MobileStatsBar {...defaultProps} phaseLabel={null} phaseProgress={null} />);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('(2/4)')).not.toBeInTheDocument();
  });
});
