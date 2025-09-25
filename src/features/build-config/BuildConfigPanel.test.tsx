import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BuildConfigPanel } from './BuildConfigPanel';
import { CombatStatsPanel } from '../combat-stats/CombatStatsPanel';
import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';

describe('BuildConfigPanel', () => {
  it('allows selecting a custom boss target and updates stats', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <BuildConfigPanel />
        <CombatStatsPanel />
      </>,
    );

    await user.selectOptions(screen.getByLabelText(/boss target/i), 'custom');
    const input = screen.getByLabelText(/custom target hp/i);
    await user.clear(input);
    await user.type(input, '500');

    const targetRow = screen.getByText('Target HP').closest('.data-list__item');
    expect(targetRow).toHaveTextContent('500');
  });

  it('switches boss versions to reflect Godhome health pools', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <BuildConfigPanel />
        <CombatStatsPanel />
      </>,
    );

    await user.selectOptions(screen.getByLabelText(/boss target/i), 'gruz-mother');

    let targetRow = screen.getByText('Target HP').closest('.data-list__item');
    expect(targetRow).toHaveTextContent('90');

    await user.selectOptions(
      screen.getByLabelText(/boss version/i),
      'gruz-mother__ascended',
    );

    targetRow = screen.getByText('Target HP').closest('.data-list__item');
    expect(targetRow).toHaveTextContent('945');
  });

  it('applies charm presets for common loadouts', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(<BuildConfigPanel />);

    await user.click(
      screen.getByRole('button', { name: /spellcaster \(shaman \+ twister\)/i }),
    );

    expect(screen.getByLabelText(/shaman stone/i)).toBeChecked();
    expect(screen.getByLabelText(/spell twister/i)).toBeChecked();
    expect(screen.getByLabelText(/unbreakable strength/i)).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: /clear charms/i }));

    expect(screen.getByLabelText(/shaman stone/i)).not.toBeChecked();
    expect(screen.getByLabelText(/spell twister/i)).not.toBeChecked();
  });
});
