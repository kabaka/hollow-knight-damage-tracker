import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { MobilePinnedHud, type MobilePinnedHudProps } from './MobilePinnedHud';

const derivedStats: MobilePinnedHudProps['derived'] = {
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
  phaseNumber: 3,
  phaseCount: 4,
  phaseLabel: 'Phase 3 – After 50%',
  phaseThresholds: [750, 500, 250],
};

const defaultProps: MobilePinnedHudProps = {
  derived: derivedStats,
  encounterName: 'Eternal Guardian',
  arenaLabel: 'Howling Cliffs',
};

const renderHud = (props: Partial<MobilePinnedHudProps> = {}) =>
  render(<MobilePinnedHud {...defaultProps} {...props} />);

describe('MobilePinnedHud', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hides the stats grid by default while reporting the collapsed state', () => {
    renderHud();

    const toggle = screen.getByRole('button', { name: /boss status/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const metrics = screen.getByLabelText('Combat metrics', {
      selector: 'dl',
      hidden: true,
    });
    expect(metrics).not.toBeVisible();
  });

  it('reveals stats when expanded and persists the state to storage', () => {
    renderHud();

    const toggle = screen.getByRole('button', { name: /boss status/i });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Combat metrics')).toBeVisible();
    expect(window.localStorage.getItem('hkdt.mobileHudExpanded')).toBe('expanded');
  });

  it('restores the last saved expansion state on mount', () => {
    window.localStorage.setItem('hkdt.mobileHudExpanded', 'expanded');

    renderHud();

    const toggle = screen.getByRole('button', { name: /boss status/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Combat metrics')).toBeVisible();
  });
});
