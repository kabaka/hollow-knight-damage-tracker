import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';

import { AttackLogPanel } from './AttackLogPanel';
import { PlayerConfigModal } from '../build-config/PlayerConfigModal';
import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';
import { bossMap, bossSequenceMap, DEFAULT_BOSS_ID, nailUpgrades } from '../../data';
import { useFightState } from '../fight-state/FightStateContext';

const baseNailDamage = nailUpgrades[0]?.damage ?? 5;
const defaultBossTarget = bossMap.get(DEFAULT_BOSS_ID);
const masterSequence = bossSequenceMap.get('pantheon-of-the-master');

if (!defaultBossTarget) {
  throw new Error('Expected default boss target to be defined for tests');
}

if (baseNailDamage <= 0) {
  throw new Error('Expected base nail damage to be positive for tests');
}

if (!masterSequence) {
  throw new Error('Expected pantheon-of-the-master sequence to be defined for tests');
}

const baseNailDamageText = String(baseNailDamage);
const defaultBossHp = defaultBossTarget.hp;
const remainingAfterOneHit = Math.max(0, defaultBossHp - baseNailDamage);
const initialHitsToFinish = Math.ceil(defaultBossHp / baseNailDamage);
const hitsToFinishAfterOneHit = Math.ceil(remainingAfterOneHit / baseNailDamage);

const SequenceHarness = () => {
  const { actions, state } = useFightState();
  const sequenceId = masterSequence.id;

  useEffect(() => {
    actions.startSequence(sequenceId);
  }, [actions, sequenceId]);

  return (
    <div>
      <button type="button" onClick={() => actions.advanceSequenceStage()}>
        Advance Stage
      </button>
      <span data-testid="sequence-index">{state.sequenceIndex}</span>
      <span data-testid="active-sequence">{state.activeSequenceId ?? 'none'}</span>
      <span data-testid="log-count">{state.damageLog.length}</span>
    </div>
  );
};

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
        <PlayerConfigModal isOpen onClose={() => {}} />
        <AttackLogPanel />
      </>,
    );

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    const damageDisplay = within(nailStrikeButton).getByLabelText(/damage per hit/i);
    expect(damageDisplay).toHaveTextContent(baseNailDamageText);

    await user.selectOptions(screen.getByLabelText(/nail upgrade/i), 'pure-nail');
    expect(damageDisplay).toHaveTextContent('21');

    await user.click(screen.getByRole('button', { name: /unbreakable strength/i }));
    expect(damageDisplay).toHaveTextContent('32');
  });

  it('surfaces spell upgrades in the spell group without duplicates', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <PlayerConfigModal isOpen onClose={() => {}} />
        <AttackLogPanel />
      </>,
    );

    await user.click(
      screen.getByRole('radio', {
        name: /shade soul/i,
      }),
    );

    const spellsGroup = screen.getByRole('group', { name: /spells/i });
    const shadeSoulButtons = within(spellsGroup).getAllByRole('button', {
      name: /shade soul/i,
    });
    expect(shadeSoulButtons).toHaveLength(1);
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

    renderWithFightProvider(<AttackLogPanel />);

    const undoButton = screen.getByRole('button', { name: /undo/i });
    const redoButton = screen.getByRole('button', { name: /redo/i });
    const resetButton = screen.getByRole('button', { name: /quick reset/i });
    const endFightButton = screen.getByRole('button', { name: /fight \(enter\)/i });

    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
    expect(endFightButton).not.toBeDisabled();

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    await user.click(nailStrikeButton);

    expect(undoButton).not.toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).not.toBeDisabled();
    expect(endFightButton).not.toBeDisabled();

    await user.click(undoButton);
    expect(redoButton).not.toBeDisabled();
    expect(endFightButton).toBeDisabled();

    await user.click(redoButton);
    expect(endFightButton).not.toBeDisabled();

    await user.click(resetButton);
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
    expect(endFightButton).not.toBeDisabled();
  });

  it('starts fights via the Enter key without logging damage', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(<AttackLogPanel />);

    const startButton = screen.getByRole('button', { name: /start fight \(enter\)/i });
    expect(startButton).not.toBeDisabled();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /end fight \(enter\)/i }),
      ).not.toBeDisabled();
    });

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /fight \(enter\)/i })).toBeDisabled();
    });
  });

  it('supports keyboard shortcuts for logging attacks and resetting', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(<AttackLogPanel />);

    await user.keyboard('1');

    await user.keyboard('{Enter}');

    const endFightButton = screen.getByRole('button', { name: /fight \(enter\)/i });
    expect(endFightButton).toBeDisabled();

    await user.keyboard('{Escape}');
  });

  it('resets sequence progress via quick actions and keyboard shortcut', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <SequenceHarness />
        <AttackLogPanel />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-sequence').textContent).toBe(masterSequence.id);
    });

    const resetSequenceButton = await screen.findByRole('button', {
      name: /reset sequence/i,
    });

    expect(resetSequenceButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /advance stage/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index').textContent).toBe('1');
    });

    await waitFor(() => {
      expect(resetSequenceButton).not.toBeDisabled();
    });

    await user.click(resetSequenceButton);

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index').textContent).toBe('0');
    });

    expect(resetSequenceButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /advance stage/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index').textContent).toBe('1');
    });

    const nailStrikeButton = await screen.findByRole('button', { name: /nail strike/i });
    await user.click(nailStrikeButton);

    await waitFor(() => {
      expect(screen.getByTestId('log-count').textContent).toBe('1');
    });

    await user.keyboard('{Shift>}{Escape}{/Shift}');

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index').textContent).toBe('0');
      expect(screen.getByTestId('log-count').textContent).toBe('0');
    });

    expect(resetSequenceButton).toBeDisabled();
  });

  it('allows ending fights early via the quick actions', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(<AttackLogPanel />);

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    const endFightButton = screen.getByRole('button', { name: /fight \(enter\)/i });
    const resetButton = screen.getByRole('button', { name: /quick reset/i });

    expect(endFightButton).not.toBeDisabled();

    await user.click(nailStrikeButton);
    expect(endFightButton).not.toBeDisabled();

    await user.click(endFightButton);
    expect(endFightButton).toBeDisabled();

    await user.click(resetButton);
    expect(endFightButton).not.toBeDisabled();

    await user.click(nailStrikeButton);
    await user.keyboard('{Enter}');
    expect(endFightButton).toBeDisabled();
  });

  it('shows charm effect attacks when enabling damage charms', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <>
        <PlayerConfigModal isOpen onClose={() => {}} />
        <AttackLogPanel />
      </>,
    );

    await user.click(screen.getByRole('button', { name: /thorns of agony/i }));
    await user.click(screen.getByRole('button', { name: /glowing womb/i }));

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
        <PlayerConfigModal isOpen onClose={() => {}} />
        <AttackLogPanel />
      </>,
    );

    const vengefulSpiritButton = screen.getByRole('button', {
      name: /^vengeful spirit/i,
    });
    const damageDisplay = within(vengefulSpiritButton).getByLabelText(/damage per hit/i);
    expect(damageDisplay).toHaveTextContent('15');

    await user.click(screen.getByRole('button', { name: /flukenest/i }));

    expect(damageDisplay).toHaveTextContent('36');
    expect(vengefulSpiritButton).toHaveTextContent(/flukenest volley/i);
  });
});
