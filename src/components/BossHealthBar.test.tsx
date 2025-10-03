import { render, screen } from '@testing-library/react';

import { BossHealthBar } from './BossHealthBar';

describe('BossHealthBar', () => {
  it('exposes progressbar semantics for the desktop scoreboard', () => {
    render(
      <BossHealthBar
        className="hud-health summary-chip summary-chip--accent"
        role="group"
        aria-label="Boss HP"
        label="HP"
        current={450}
        total={1000}
        progressbarAriaLabel="Boss HP"
        valueLabel="450 / 1000"
      />,
    );

    const wrapper = screen.getByRole('group', { name: 'Boss HP' });
    expect(wrapper).toHaveClass('hud-health', 'summary-chip', 'summary-chip--accent');

    const progressbar = screen.getByRole('progressbar', { name: 'Boss HP' });
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '1000');
    expect(progressbar).toHaveAttribute('aria-valuenow', '450');
    expect(progressbar).toHaveClass('hud-health__track');

    expect(screen.getByText('HP')).toHaveClass('hud-health__label');
    expect(screen.getByText('450 / 1000')).toHaveClass('hud-health__value');
  });

  it('supports the compact mobile HUD layout', () => {
    render(
      <BossHealthBar
        className="mobile-hud__health"
        role="group"
        aria-label="Boss HP"
        current={250}
        total={1000}
        progressbarAriaLabel="Boss HP"
        trackClassName="mobile-hud__track"
        valueLabel="250 / 1000"
        valueClassName="mobile-hud__value"
      />,
    );

    const wrapper = screen.getByRole('group', { name: 'Boss HP' });
    expect(wrapper).toHaveClass('mobile-hud__health');

    const progressbar = screen.getByRole('progressbar', { name: 'Boss HP' });
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '1000');
    expect(progressbar).toHaveAttribute('aria-valuenow', '250');
    expect(progressbar).toHaveClass('hud-health__track', 'mobile-hud__track');

    expect(screen.getByText('250 / 1000')).toHaveClass('mobile-hud__value');
  });
});
