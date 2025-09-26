import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AttackLogPanel } from './AttackLogPanel';
import { BuildConfigPanel } from '../build-config/BuildConfigPanel';
import { CombatStatsPanel } from '../combat-stats/CombatStatsPanel';
import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';
import { bossMap, DEFAULT_BOSS_ID, nailUpgrades } from '../../data';

const baseNailDamage = nailUpgrades[0]?.damage ?? 5;
const defaultBossTarget = bossMap.get(DEFAULT_BOSS_ID);

if (!defaultBossTarget) {
  throw new Error('Expected default boss target to be defined for tests');
}

if (baseNailDamage <= 0) {
  throw new Error('Expected base nail damage to be positive for tests');
}

const baseNailDamageText = String(baseNailDamage);
const defaultBossHp = defaultBossTarget.hp;
const remainingAfterOneHit = Math.max(0, defaultBossHp - baseNailDamage);
const initialHitsToFinish = Math.ceil(defaultBossHp / baseNailDamage);
const hitsToFinishAfterOneHit = Math.ceil(remainingAfterOneHit / baseNailDamage);

describe('AttackLogPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('updates nail damage when upgrading the nail and activating strength charms', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <BuildConfigPanel />
        <AttackLogPanel />
      </>,
    );

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    const damageDisplay = within(nailStrikeButton).getByLabelText(/damage per hit/i);
    expect(damageDisplay).toHaveTextContent(baseNailDamageText);

    await user.selectOptions(screen.getByLabelText(/nail upgrade/i), 'pure-nail');
    expect(damageDisplay).toHaveTextContent('21');

    await user.click(screen.getByLabelText(/unbreakable strength/i));
    expect(damageDisplay).toHaveTextContent('32');
  });

  it('surfaces spell upgrades in the advanced group when unlocked', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <BuildConfigPanel />
        <AttackLogPanel />
      </>,
    );

    await user.click(screen.getByRole('radio', { name: /shade soul/i }));

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
    expect(
      within(damageRow as HTMLElement).getByText(baseNailDamageText),
    ).toBeInTheDocument();

    const remainingRow = screen.getByText('Remaining HP').closest('.data-list__item');
    expect(
      within(remainingRow as HTMLElement).getByText(String(remainingAfterOneHit)),
    ).toBeInTheDocument();

    const actionsRow = screen.getByText('Attacks Logged').closest('.data-list__item');
    expect(within(actionsRow as HTMLElement).getByText('1')).toBeInTheDocument();
  });

  it('shows hits remaining for each attack and updates after logging damage', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(<AttackLogPanel />);

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    const hitsDisplay = within(nailStrikeButton).getByLabelText(/hits to finish/i);
    expect(hitsDisplay).toHaveTextContent(
      new RegExp(`hits to finish: ${initialHitsToFinish}`, 'i'),
    );

    await user.click(nailStrikeButton);

    expect(hitsDisplay).toHaveTextContent(
      new RegExp(`hits to finish: ${hitsToFinishAfterOneHit}`, 'i'),
    );
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
    expect(
      within(damageRow as HTMLElement).getByText(baseNailDamageText),
    ).toBeInTheDocument();

    await user.click(resetButton);

    damageRow = screen.getByText('Damage Logged').closest('.data-list__item');
    expect(within(damageRow as HTMLElement).getByText('0')).toBeInTheDocument();
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
  });

  it('supports keyboard shortcuts for logging attacks and resetting', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <AttackLogPanel />
        <CombatStatsPanel />
      </>,
    );

    await user.keyboard('1');

    let damageRow = screen.getByText('Damage Logged').closest('.data-list__item');
    expect(
      within(damageRow as HTMLElement).getByText(baseNailDamageText),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');

    damageRow = screen.getByText('Damage Logged').closest('.data-list__item');
    expect(within(damageRow as HTMLElement).getByText('0')).toBeInTheDocument();
  });

  it('shows charm effect attacks when enabling damage charms', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <BuildConfigPanel />
        <AttackLogPanel />
      </>,
    );

    await user.click(screen.getByLabelText(/thorns of agony/i));
    await user.click(screen.getByLabelText(/glowing womb/i));

    expect(screen.getByRole('heading', { name: /charm effects/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /thorns of agony burst/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hatchling impact/i })).toBeInTheDocument();
  });

  it('replaces vengeful spirit with Flukenest damage when equipped', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <BuildConfigPanel />
        <AttackLogPanel />
      </>,
    );

    const vengefulSpiritButton = screen.getByRole('button', {
      name: /^vengeful spirit/i,
    });
    const damageDisplay = within(vengefulSpiritButton).getByLabelText(/damage per hit/i);
    expect(damageDisplay).toHaveTextContent('15');

    await user.click(screen.getByLabelText(/flukenest/i));

    expect(damageDisplay).toHaveTextContent('36');
    expect(vengefulSpiritButton).toHaveTextContent(/flukenest volley/i);
  });
});
