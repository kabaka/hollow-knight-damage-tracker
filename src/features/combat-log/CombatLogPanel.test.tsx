import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';

import {
  CombatLogClearButton,
  CombatLogPanel,
  CombatLogProvider,
} from './CombatLogPanel';
import { useFightActions } from '../fight-state/FightStateContext';
import { renderWithFightProvider } from '../../test-utils/renderWithFightProvider';

type FightActions = ReturnType<typeof useFightActions>;

const ActionsBridge = ({ onReady }: { onReady: (actions: FightActions) => void }) => {
  const actions = useFightActions();
  useEffect(() => {
    onReady(actions);
  }, [actions, onReady]);
  return null;
};

describe('CombatLogPanel', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('processes new damage entries only once despite animation frame updates', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    let rafId = 0;

    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      rafId += 1;
      rafCallbacks.set(rafId, callback);
      return rafId;
    }) as typeof window.requestAnimationFrame;

    window.cancelAnimationFrame = ((handle: number) => {
      rafCallbacks.delete(handle);
    }) as typeof window.cancelAnimationFrame;

    const hasSpy = vi.spyOn(Set.prototype, 'has');

    let actions: FightActions | null = null;
    let currentTime = 1_000;
    vi.setSystemTime(currentTime);

    try {
      renderWithFightProvider(
        <CombatLogProvider>
          <ActionsBridge
            onReady={(value) => {
              actions = value;
            }}
          />
          <CombatLogClearButton />
          <CombatLogPanel />
        </CombatLogProvider>,
      );

      await waitFor(() => {
        expect(actions).not.toBeNull();
      });

      const initialHasCalls = hasSpy.mock.calls.length;

      act(() => {
        actions?.startFight(currentTime);
      });

      act(() => {
        currentTime += 200;
        vi.setSystemTime(currentTime);
        actions?.logAttack({
          id: 'nail-strike',
          label: 'Nail Strike',
          category: 'nail',
          damage: 75,
          timestamp: currentTime,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Nail Strike')).toBeInTheDocument();
      });

      const callsAfterProcessing = hasSpy.mock.calls.length;
      expect(callsAfterProcessing).toBeGreaterThan(initialHasCalls);

      const runQueuedFrames = (iterations: number) => {
        for (let iteration = 0; iteration < iterations; iteration += 1) {
          const callbacks = Array.from(rafCallbacks.values());
          rafCallbacks.clear();
          callbacks.forEach((callback) => {
            currentTime += 16;
            vi.setSystemTime(currentTime);
            callback(currentTime);
          });
        }
      };

      act(() => {
        runQueuedFrames(5);
      });

      expect(hasSpy.mock.calls.length).toBe(callsAfterProcessing);
    } finally {
      hasSpy.mockRestore();
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
      vi.useRealTimers();
    }
  });

  it('records fight lifecycle entries with timestamps', async () => {
    let actions: FightActions | null = null;

    renderWithFightProvider(
      <CombatLogProvider>
        <ActionsBridge
          onReady={(value) => {
            actions = value;
          }}
        />
        <CombatLogClearButton />
        <CombatLogPanel />
      </CombatLogProvider>,
    );

    await waitFor(() => {
      expect(actions).not.toBeNull();
    });

    act(() => {
      actions?.startFight(1_000);
    });

    act(() => {
      actions?.logAttack({
        id: 'nail-strike',
        label: 'Nail Strike',
        category: 'nail',
        damage: 100,
        timestamp: 1_600,
      });
      actions?.logAttack({
        id: 'great-slash',
        label: 'Great Slash',
        category: 'nail-art',
        damage: 200,
        timestamp: 3_400,
      });
    });

    act(() => {
      actions?.endFight(4_200);
    });

    await waitFor(() => {
      expect(screen.getByText(/fight started vs/i)).toBeInTheDocument();
      expect(screen.getByText('Starting HP')).toBeInTheDocument();
      expect(screen.getByText('Nail Strike')).toBeInTheDocument();
      expect(screen.getByText('Great Slash')).toBeInTheDocument();
      expect(screen.getByText(/100 dmg/)).toBeInTheDocument();
      expect(screen.getByText(/200 dmg/)).toBeInTheDocument();
      expect(screen.getByText('0.00s')).toBeInTheDocument();
      expect(screen.getByText('0.60s')).toBeInTheDocument();
      expect(screen.getByText('2.40s')).toBeInTheDocument();
      expect(screen.getByText('Total 300 dmg')).toBeInTheDocument();
      expect(screen.getByText(/victory|fight ended/i)).toBeInTheDocument();
    });
  });

  it('persists history across fight resets', async () => {
    let actions: FightActions | null = null;

    renderWithFightProvider(
      <CombatLogProvider>
        <ActionsBridge
          onReady={(value) => {
            actions = value;
          }}
        />
        <CombatLogClearButton />
        <CombatLogPanel />
      </CombatLogProvider>,
    );

    await waitFor(() => {
      expect(actions).not.toBeNull();
    });

    act(() => {
      actions?.logAttack({
        id: 'nail-strike',
        label: 'Nail Strike',
        category: 'nail',
        damage: 50,
        timestamp: 500,
      });
      actions?.endFight(900);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/fight ended/i).length).toBeGreaterThan(0);
    });

    act(() => {
      actions?.resetLog();
    });

    await waitFor(() => {
      expect(screen.getByText('Fight reset')).toBeInTheDocument();
    });

    act(() => {
      actions?.logAttack({
        id: 'vengeful-spirit',
        label: 'Vengeful Spirit',
        category: 'spell',
        damage: 90,
        timestamp: 1_400,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Vengeful Spirit')).toBeInTheDocument();
      expect(screen.getAllByText(/fight ended/i).length).toBeGreaterThan(0);
    });
  });

  it('omits fight reset banners when advancing sequence stages', async () => {
    let actions: FightActions | null = null;

    renderWithFightProvider(
      <CombatLogProvider>
        <ActionsBridge
          onReady={(value) => {
            actions = value;
          }}
        />
        <CombatLogClearButton />
        <CombatLogPanel />
      </CombatLogProvider>,
    );

    await waitFor(() => {
      expect(actions).not.toBeNull();
    });

    act(() => {
      actions?.startSequence('pantheon-of-the-sage');
    });

    await waitFor(() => {
      expect(screen.getByText(/Target: Hive Knight/i)).toBeInTheDocument();
    });

    act(() => {
      actions?.startFight(1_000);
      actions?.logAttack({
        id: 'hive-knight-opening',
        label: 'Opening hit',
        category: 'nail',
        damage: 50,
        timestamp: 1_200,
      });
      actions?.endFight(1_800);
    });

    await waitFor(() => {
      expect(screen.getByText(/Fight started vs Hive Knight/i)).toBeInTheDocument();
    });

    act(() => {
      actions?.advanceSequenceStage();
    });

    await waitFor(() => {
      expect(screen.getByText(/Target: Elder Hu/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Fight reset')).not.toBeInTheDocument();
  });

  it('clears the log when the reset button is pressed', async () => {
    const user = userEvent.setup();
    let actions: FightActions | null = null;

    renderWithFightProvider(
      <CombatLogProvider>
        <ActionsBridge
          onReady={(value) => {
            actions = value;
          }}
        />
        <CombatLogClearButton />
        <CombatLogPanel />
      </CombatLogProvider>,
    );

    await waitFor(() => {
      expect(actions).not.toBeNull();
    });

    act(() => {
      actions?.logAttack({
        id: 'nail-strike',
        label: 'Nail Strike',
        category: 'nail',
        damage: 75,
        timestamp: 500,
      });
    });

    await waitFor(() => {
      expect(screen.getAllByText('Nail Strike').length).toBeGreaterThan(0);
    });

    const resetButton = screen.getByRole('button', { name: /clear combat log/i });
    await user.click(resetButton);

    await waitFor(() => {
      expect(screen.queryAllByText('Nail Strike')).toHaveLength(0);
      expect(screen.getByText(/Target:/i)).toBeInTheDocument();
      expect(screen.queryByText('Fight reset')).not.toBeInTheDocument();
    });
  });
});
