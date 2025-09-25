import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AttackLogPanel } from './AttackLogPanel';
import { BuildConfigPanel } from '../build-config/BuildConfigPanel';
import { CombatStatsPanel } from '../combat-stats/CombatStatsPanel';
import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';

describe('AttackLogPanel', () => {
  it('updates nail damage when upgrading the nail and activating strength charms', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <BuildConfigPanel />
        <AttackLogPanel />
      </>,
    );

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    expect(nailStrikeButton).toHaveTextContent(/5/);

    await user.selectOptions(screen.getByLabelText(/nail upgrade/i), 'pure-nail');
    expect(nailStrikeButton).toHaveTextContent(/21/);

    await user.click(screen.getByLabelText(/unbreakable strength/i));
    expect(nailStrikeButton).toHaveTextContent(/32/);
  });

  it('surfaces spell upgrades in the advanced group when unlocked', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <BuildConfigPanel />
        <AttackLogPanel />
      </>,
    );

    await user.click(screen.getByLabelText(/shade soul/i));

    const shadeSoulButtons = screen.getAllByRole('button', { name: /shade soul/i });
    expect(shadeSoulButtons.length).toBeGreaterThan(0);
  });

  it('logs damage and updates combat statistics', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <AttackLogPanel />
        <CombatStatsPanel />
      </>,
    );

    await user.click(screen.getByRole('button', { name: /nail strike/i }));

    const damageRow = screen.getByText('Damage Logged').closest('.data-list__item');
    expect(within(damageRow as HTMLElement).getByText('5')).toBeInTheDocument();

    const remainingRow = screen.getByText('Remaining HP').closest('.data-list__item');
    expect(within(remainingRow as HTMLElement).getByText('350')).toBeInTheDocument();

    const actionsRow = screen.getByText('Attacks Logged').closest('.data-list__item');
    expect(within(actionsRow as HTMLElement).getByText('1')).toBeInTheDocument();
  });

  it('supports undo, redo, and quick reset controls', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <AttackLogPanel />
        <CombatStatsPanel />
      </>,
    );

    const undoButton = screen.getByRole('button', { name: /undo/i });
    const redoButton = screen.getByRole('button', { name: /redo/i });
    const resetButton = screen.getByRole('button', { name: /quick reset/i });

    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).toBeDisabled();

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    await user.click(nailStrikeButton);

    expect(undoButton).not.toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).not.toBeDisabled();

    await user.click(undoButton);

    let damageRow = screen.getByText('Damage Logged').closest('.data-list__item');
    expect(within(damageRow as HTMLElement).getByText('0')).toBeInTheDocument();
    expect(redoButton).not.toBeDisabled();

    await user.click(redoButton);

    damageRow = screen.getByText('Damage Logged').closest('.data-list__item');
    expect(within(damageRow as HTMLElement).getByText('5')).toBeInTheDocument();

    await user.click(resetButton);

    damageRow = screen.getByText('Damage Logged').closest('.data-list__item');
    expect(within(damageRow as HTMLElement).getByText('0')).toBeInTheDocument();
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
  });
});
