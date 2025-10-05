import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TargetScoreboard, type TargetScoreboardProps } from './TargetScoreboard';

const derivedStats: TargetScoreboardProps['derived'] = {
  targetHp: 1000,
  totalDamage: 240,
  remainingHp: 760,
  attacksLogged: 12,
  averageDamage: 20,
  elapsedMs: 90_000,
  dps: 85,
  actionsPerMinute: 48,
  estimatedTimeRemainingMs: 30_000,
  fightStartTimestamp: 0,
  fightEndTimestamp: null,
  isFightInProgress: true,
  isFightComplete: false,
  frameTimestamp: 0,
};

const defaultProps: TargetScoreboardProps = {
  derived: derivedStats,
  stageLabel: 'Opening Phase',
  stageProgress: { current: 1, total: 3 },
  onAdvanceStage: vi.fn(),
  onRewindStage: vi.fn(),
  hasNextStage: true,
  hasPreviousStage: false,
};

describe('TargetScoreboard', () => {
  it('keeps boss status controls and metrics accessible', () => {
    render(<TargetScoreboard {...defaultProps} />);

    const scoreboard = screen.getByRole('region', { name: /encounter scoreboard/i });
    expect(scoreboard).toBeInTheDocument();

    expect(
      within(scoreboard).getByRole('progressbar', { name: /boss hp/i }),
    ).toBeVisible();

    const stageNavigation = within(scoreboard).getByRole('group', {
      name: /stage navigation/i,
    });
    expect(
      within(stageNavigation).getByRole('button', { name: /next stage/i }),
    ).toBeEnabled();
    expect(
      within(stageNavigation).getByRole('button', { name: /previous stage/i }),
    ).toBeDisabled();

    const metricTerms = within(scoreboard).getAllByRole('term');
    expect(metricTerms.map((term) => term.textContent)).toEqual(
      expect.arrayContaining(['Elapsed', 'Est. Remaining', 'DPS', 'Avg Dmg', 'APM']),
    );

    const metricDefinitions = within(scoreboard).getAllByRole('definition');
    expect(metricDefinitions).not.toHaveLength(0);
  });
});
