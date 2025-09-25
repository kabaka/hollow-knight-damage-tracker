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
});
