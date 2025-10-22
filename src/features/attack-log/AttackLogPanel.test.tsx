import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { vi } from 'vitest';

import { AttackLogActions, AttackLogPanel, AttackLogProvider } from './index';
import * as scheduleIdleTaskModule from '../../utils/scheduleIdleTask';
import { PlayerConfigModal } from '../build-config/PlayerConfigModal';
import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';
import { bossMap, bossSequenceMap, DEFAULT_BOSS_ID, nailUpgrades } from '../../data';
import type { FightActions } from '../fight-state/FightStateContext';
import { useFightState } from '../fight-state/FightStateContext';

const triggerMock = vi.fn();

vi.mock('../../utils/haptics', async () => {
  const actual =
    await vi.importActual<typeof import('../../utils/haptics')>('../../utils/haptics');
  return {
    ...actual,
    useHapticFeedback: () => ({
      isSupported: true,
      trigger: triggerMock,
    }),
  };
});

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

const SequenceHarness = ({
  onActions,
}: {
  onActions?: (actions: FightActions) => void;
}) => {
  const { actions, state } = useFightState();
  const sequenceId = masterSequence.id;

  useEffect(() => {
    actions.startSequence(sequenceId);
  }, [actions, sequenceId]);

  useEffect(() => {
    if (onActions) {
      onActions(actions);
    }
  }, [actions, onActions]);

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
    triggerMock.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('updates nail damage when upgrading the nail and activating strength charms', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <AttackLogProvider>
        <PlayerConfigModal isOpen onClose={() => {}} />
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    const modal = screen.getByRole('dialog', { name: /player loadout/i });
    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    const damageDisplay = within(nailStrikeButton).getByLabelText(/damage per hit/i);
    expect(damageDisplay).toHaveTextContent(baseNailDamageText);
    const strengthButton = within(modal).getByRole('button', {
      name: /unbreakable strength/i,
    });

    await user.click(within(modal).getByRole('tab', { name: /nail/i }));
    const pureNailOption = await within(modal).findByRole('radio', {
      name: /pure nail/i,
    });
    await user.click(pureNailOption);
    expect(damageDisplay).toHaveTextContent('21');

    await user.click(within(modal).getByRole('tab', { name: /charms/i }));
    await user.click(strengthButton);
    expect(damageDisplay).toHaveTextContent('32');
  });

  it('surfaces spell upgrades in the spell group without duplicates', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <AttackLogProvider>
        <PlayerConfigModal isOpen onClose={() => {}} />
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    await user.click(screen.getByRole('tab', { name: /spells/i }));

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

    renderWithFightProvider(
      <AttackLogProvider>
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    const hitsDisplay = within(nailStrikeButton).getByLabelText(/to end/i);
    expect(hitsDisplay).toHaveAttribute('aria-label', `To end: ${initialHitsToFinish}`);

    await user.click(nailStrikeButton);

    expect(hitsDisplay).toHaveAttribute(
      'aria-label',
      `To end: ${hitsToFinishAfterOneHit}`,
    );
  });

  it('hides soul cost metadata for spell attacks', () => {
    renderWithFightProvider(
      <AttackLogProvider>
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    const spellsGroup = screen.getByRole('group', { name: /spells/i });

    expect(within(spellsGroup).queryByLabelText(/soul cost/i)).not.toBeInTheDocument();
  });

  it('supports undo, redo, and quick reset controls', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <AttackLogProvider>
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    const undoButton = screen.getByRole('button', { name: /undo/i });
    const redoButton = screen.getByRole('button', { name: /redo/i });
    const resetButton = screen.getByRole('button', { name: 'Clear attack log' });
    const endFightButton = screen.getByRole('button', { name: /fight/i });

    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
    expect(endFightButton).toBeEnabled();

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    await user.click(nailStrikeButton);

    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).toBeEnabled();
    expect(endFightButton).toBeEnabled();

    await user.click(undoButton);
    expect(redoButton).toBeEnabled();
    expect(endFightButton).toBeDisabled();

    await user.click(redoButton);
    expect(endFightButton).toBeEnabled();

    await user.click(resetButton);
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
    expect(resetButton).toBeDisabled();
    expect(endFightButton).toBeEnabled();
  });

  it('plays the sequence completion haptic when ending standalone fights', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <AttackLogProvider>
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    const fightButton = screen.getByRole('button', { name: /fight/i });

    await user.click(fightButton);
    const endFightButton = await screen.findByRole('button', { name: /end fight/i });

    triggerMock.mockClear();

    await user.click(endFightButton);

    await waitFor(() => {
      expect(triggerMock).toHaveBeenCalledWith('sequence-complete');
    });
  });

  it('starts fights via the Enter key without logging damage', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <AttackLogProvider>
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    const startButton = screen.getByRole('button', { name: /start fight/i });
    expect(startButton).toBeEnabled();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end fight/i })).toBeEnabled();
    });

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /fight/i })).toBeDisabled();
    });
  });

  it('supports keyboard shortcuts for logging attacks and resetting', async () => {
    const user = userEvent.setup();
    const scheduleSpy = vi.spyOn(scheduleIdleTaskModule, 'scheduleIdleTask');

    try {
      renderWithFightProvider(
        <AttackLogProvider>
          <AttackLogActions />
          <AttackLogPanel />
        </AttackLogProvider>,
      );

      await user.keyboard('1');

      await waitFor(() => {
        expect(scheduleSpy).toHaveBeenCalled();
      });

      await user.keyboard('{Enter}');

      const endFightButton = screen.getByRole('button', { name: /fight/i });
      expect(endFightButton).toBeDisabled();

      await user.keyboard('{Escape}');
    } finally {
      scheduleSpy.mockRestore();
    }
  });

  it('resets sequence progress via quick actions and keyboard shortcut', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <AttackLogProvider>
        <SequenceHarness />
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-sequence')).toHaveTextContent(masterSequence.id);
    });

    const resetSequenceButton = await screen.findByRole('button', {
      name: /reset sequence progress/i,
    });

    expect(resetSequenceButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /advance stage/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index')).toHaveTextContent('1');
    });

    await waitFor(() => {
      expect(resetSequenceButton).toBeEnabled();
    });

    await user.click(resetSequenceButton);

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index')).toHaveTextContent('0');
    });

    expect(resetSequenceButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /advance stage/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index')).toHaveTextContent('1');
    });

    const nailStrikeButton = await screen.findByRole('button', { name: /nail strike/i });
    await user.click(nailStrikeButton);

    await waitFor(() => {
      expect(screen.getByTestId('log-count')).toHaveTextContent('1');
    });

    await user.keyboard('{Shift>}{Escape}{/Shift}');

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index')).toHaveTextContent('0');
      expect(screen.getByTestId('log-count')).toHaveTextContent('0');
    });

    expect(resetSequenceButton).toBeDisabled();
  });

  it('allows ending fights early via the quick actions', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <AttackLogProvider>
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    const nailStrikeButton = screen.getByRole('button', { name: /nail strike/i });
    const endFightButton = screen.getByRole('button', { name: /start fight/i });
    const resetButton = screen.getByRole('button', { name: 'Clear attack log' });

    expect(endFightButton).toBeEnabled();

    await user.click(nailStrikeButton);
    expect(endFightButton).toBeEnabled();

    await user.click(endFightButton);
    expect(endFightButton).toBeDisabled();

    await user.click(resetButton);
    expect(endFightButton).toBeEnabled();

    await user.click(nailStrikeButton);
    await user.keyboard('{Enter}');
    expect(endFightButton).toBeDisabled();
  });

  it('shows charm effect attacks when enabling damage charms', async () => {
    const user = userEvent.setup();

    renderWithFightProvider(
      <AttackLogProvider>
        <PlayerConfigModal isOpen onClose={() => {}} />
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
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
      <AttackLogProvider>
        <PlayerConfigModal isOpen onClose={() => {}} />
        <AttackLogActions />
        <AttackLogPanel />
      </AttackLogProvider>,
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

  it('emits sequence completion haptics for automatic finishes and manual resets', async () => {
    let capturedActions: FightActions | null = null;

    renderWithFightProvider(
      <AttackLogProvider>
        <SequenceHarness
          onActions={(actions) => {
            capturedActions = actions;
          }}
        />
        <AttackLogPanel />
      </AttackLogProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-sequence')).toHaveTextContent(masterSequence.id);
    });

    await waitFor(() => {
      expect(capturedActions).not.toBeNull();
    });

    const actions = capturedActions as FightActions;
    const finishStage = () =>
      actions.logAttack({
        id: 'test-attack',
        label: 'Test Attack',
        damage: 10_000,
        category: 'test',
        soulCost: null,
      });

    const expectHaptic = async (type: string) => {
      await waitFor(() => {
        expect(triggerMock.mock.calls.some(([value]) => value === type)).toBe(true);
      });
    };

    triggerMock.mockClear();
    await act(async () => {
      finishStage();
      await Promise.resolve();
    });

    await expectHaptic('sequence-stage-complete');

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index')).toHaveTextContent('1');
    });

    await act(async () => {
      actions.resetSequence();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index')).toHaveTextContent('0');
    });

    triggerMock.mockClear();
    await act(async () => {
      finishStage();
      await Promise.resolve();
    });

    await expectHaptic('sequence-stage-complete');

    const finalStageIndex = masterSequence.entries.length - 1;
    await act(async () => {
      actions.setSequenceStage(finalStageIndex);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('sequence-index')).toHaveTextContent(
        String(finalStageIndex),
      );
    });

    triggerMock.mockClear();
    await act(async () => {
      finishStage();
      await Promise.resolve();
    });

    await expectHaptic('sequence-complete');
  });
});
