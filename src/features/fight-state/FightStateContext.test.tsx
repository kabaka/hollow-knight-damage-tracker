import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';

import {
  CUSTOM_BOSS_ID,
  FightStateProvider,
  useFightDerivedStats,
  useFightActions,
  useFightState,
  useFightStateSelector,
} from './FightStateContext';
import type { FightState } from './FightStateContext';
import * as FightStateContextModule from './FightStateContext';
import { STORAGE_KEY } from './persistence';
import { bossSequenceMap } from '../../data';

describe('FightStateProvider persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('hydrates state from localStorage when data is available', () => {
    const persistedState = {
      version: 5,
      state: {
        selectedBossId: CUSTOM_BOSS_ID,
        customTargetHp: 3333.7,
        build: {
          nailUpgradeId: 'pure-nail',
          activeCharmIds: ['shaman-stone', 'quick-slash'],
          spellLevels: {
            'vengeful-spirit': 'upgrade',
          },
          notchLimit: 6,
        },
        damageLog: [
          {
            id: 'spell-vengeful-1',
            label: 'Vengeful Spirit',
            damage: 45,
            category: 'spell',
            timestamp: 1700000000000,
            soulCost: 33,
          },
        ],
        redoStack: [],
      },
    } satisfies Record<string, unknown>;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));

    const Consumer = () => {
      const { state } = useFightState();
      return (
        <div>
          <span data-testid="selected-boss">{state.selectedBossId}</span>
          <span data-testid="custom-hp">{state.customTargetHp}</span>
          <span data-testid="nail-upgrade">{state.build.nailUpgradeId}</span>
          <span data-testid="charms">{state.build.activeCharmIds.join(',')}</span>
          <span data-testid="spell-level">
            {state.build.spellLevels['vengeful-spirit']}
          </span>
          <span data-testid="logged-attacks">{state.damageLog.length}</span>
        </div>
      );
    };

    render(
      <FightStateProvider>
        <Consumer />
      </FightStateProvider>,
    );

    expect(screen.getByTestId('selected-boss').textContent).toBe(CUSTOM_BOSS_ID);
    expect(screen.getByTestId('custom-hp').textContent).toBe('3334');
    expect(screen.getByTestId('nail-upgrade').textContent).toBe('pure-nail');
    expect(screen.getByTestId('charms').textContent).toBe('shaman-stone,quick-slash');
    expect(screen.getByTestId('spell-level').textContent).toBe('upgrade');
    expect(screen.getByTestId('logged-attacks').textContent).toBe('1');
  });

  it('persists updates to localStorage whenever state changes', async () => {
    const user = userEvent.setup();

    const Consumer = () => {
      const { actions, state } = useFightState();
      return (
        <button type="button" onClick={() => actions.setCustomTargetHp(4321)}>
          {state.customTargetHp}
        </button>
      );
    };

    render(
      <FightStateProvider>
        <Consumer />
      </FightStateProvider>,
    );

    await user.click(screen.getByRole('button'));

    await waitFor(
      () => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        expect(stored).not.toBeNull();
        if (!stored) {
          throw new Error('Expected persisted fight state');
        }

        const parsed = JSON.parse(stored) as {
          version: number;
          state: { selectedBossId: string; customTargetHp: number };
        };
        expect(parsed.version).toBe(5);
        expect(parsed.state.selectedBossId).toBe(CUSTOM_BOSS_ID);
        expect(parsed.state.customTargetHp).toBe(4321);
      },
      { timeout: 2000 },
    );
  });
});

describe('boss sequences', () => {
  const masterSequence = bossSequenceMap.get('pantheon-of-the-master');

  if (!masterSequence) {
    throw new Error('Missing pantheon sequence fixture for tests');
  }

  const firstStage = masterSequence.entries[0];
  const secondStage = masterSequence.entries[1];

  it('auto-advances stages and preserves individual logs', async () => {
    const user = userEvent.setup();

    const Harness = () => {
      const { actions, state } = useFightState();
      const totalLoggedDamage = state.damageLog.reduce(
        (sum, event) => sum + event.damage,
        0,
      );

      return (
        <div>
          <button type="button" onClick={() => actions.startSequence(masterSequence.id)}>
            Start Sequence
          </button>
          <button
            type="button"
            onClick={() =>
              actions.logAttack({
                id: 'test-hit',
                label: 'Test Hit',
                damage: firstStage.target.hp,
                category: 'nail',
                timestamp: Date.now(),
              })
            }
          >
            Log Completion
          </button>
          <button type="button" onClick={() => actions.rewindSequenceStage()}>
            Previous Stage
          </button>
          <span data-testid="sequence-id">{state.activeSequenceId ?? 'none'}</span>
          <span data-testid="sequence-index">{state.sequenceIndex}</span>
          <span data-testid="selected-boss">{state.selectedBossId}</span>
          <span data-testid="log-count">{state.damageLog.length}</span>
          <span data-testid="log-total">{totalLoggedDamage}</span>
        </div>
      );
    };

    render(
      <FightStateProvider>
        <Harness />
      </FightStateProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Start Sequence' }));
    await waitFor(() => {
      expect(screen.getByTestId('sequence-id').textContent).toBe(masterSequence.id);
    });

    await user.click(screen.getByRole('button', { name: 'Log Completion' }));
    await waitFor(() => {
      expect(screen.getByTestId('sequence-index').textContent).toBe('1');
    });

    expect(screen.getByTestId('selected-boss').textContent).toBe(secondStage.target.id);
    expect(screen.getByTestId('log-count').textContent).toBe('0');

    await user.click(screen.getByRole('button', { name: 'Previous Stage' }));
    await waitFor(() => {
      expect(screen.getByTestId('sequence-index').textContent).toBe('0');
    });

    expect(screen.getByTestId('log-count').textContent).toBe('1');
    expect(screen.getByTestId('log-total').textContent).toBe(
      firstStage.target.hp.toString(),
    );
  });
});

describe('useFightStateSelector', () => {
  it('does not re-render when unrelated slices update', async () => {
    const user = userEvent.setup();
    const renderCounts = { build: 0 };

    const BuildConsumer = () => {
      const nailUpgradeId = useFightStateSelector((state) => state.build.nailUpgradeId);
      renderCounts.build += 1;
      return <span data-testid="nail-upgrade">{nailUpgradeId}</span>;
    };

    const Controls = () => {
      const actions = useFightActions();
      return (
        <div>
          <button
            type="button"
            onClick={() =>
              actions.logAttack({
                id: 'test-attack',
                label: 'Test Attack',
                damage: 1,
                category: 'nail',
                timestamp: Date.now(),
              })
            }
          >
            Log Attack
          </button>
          <button type="button" onClick={() => actions.setNailUpgrade('coiled-nail')}>
            Upgrade Nail
          </button>
        </div>
      );
    };

    render(
      <FightStateProvider>
        <BuildConsumer />
        <Controls />
      </FightStateProvider>,
    );

    expect(screen.getByTestId('nail-upgrade').textContent).toBe('old-nail');
    expect(renderCounts.build).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Log Attack' }));

    expect(screen.getByTestId('nail-upgrade').textContent).toBe('old-nail');
    expect(renderCounts.build).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Upgrade Nail' }));

    await waitFor(() => {
      expect(screen.getByTestId('nail-upgrade').textContent).toBe('coiled-nail');
    });
    expect(renderCounts.build).toBe(2);
  });
});

describe('derived stats context', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('publishes updates to subscribers during animation frames', async () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    let frameCallback: FrameRequestCallback = () => {};
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 1;
      });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const observedTimestamps: number[] = [];

    const Consumer = () => {
      const { actions } = useFightState();
      const derived = useFightDerivedStats();
      useEffect(() => {
        observedTimestamps.push(derived.frameTimestamp);
      }, [derived.frameTimestamp]);
      return (
        <div>
          <span data-testid="attacks-logged">{derived.attacksLogged}</span>
          <button
            type="button"
            onClick={() =>
              actions.logAttack({
                id: 'swing',
                label: 'Nail Swing',
                damage: 10,
                category: 'nail',
              })
            }
          >
            Log hit
          </button>
        </div>
      );
    };

    render(
      <FightStateProvider>
        <Consumer />
      </FightStateProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Log hit' }));

    await waitFor(() => {
      expect(requestAnimationFrameSpy).toHaveBeenCalled();
    });

    expect(screen.getByTestId('attacks-logged').textContent).toBe('1');

    now = 1600;
    expect(Date.now()).toBe(1600);
    act(() => {
      frameCallback(16);
    });

    await waitFor(() => {
      expect(observedTimestamps.some((value) => value >= 1600)).toBe(true);
    });
  });

  it('cancels requestAnimationFrame handles on cleanup', async () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 42);
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});

    const AutoLogger = () => {
      const { actions } = useFightState();
      useEffect(() => {
        actions.logAttack({
          id: 'auto-hit',
          label: 'Auto Hit',
          damage: 10,
          category: 'nail',
        });
      }, [actions]);
      return null;
    };

    const { unmount } = render(
      <FightStateProvider>
        <AutoLogger />
      </FightStateProvider>,
    );

    await waitFor(() => {
      expect(requestAnimationFrameSpy).toHaveBeenCalled();
    });

    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(42);
  });
});

describe('derived stats caching', () => {
  it('reuses aggregated damage metrics between animation frames', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) =>
        window.setTimeout(() => callback(Date.now()), 16),
      );
    const cafSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((handle: number) => {
        window.clearTimeout(handle as unknown as number);
      });

    let capturedActions!: ReturnType<typeof useFightActions>;
    let capturedState!: FightState;
    const Harness = () => {
      const { state, actions: contextActions } = useFightState();
      capturedActions = contextActions;
      capturedState = state;
      return null;
    };

    const instrumentation = FightStateContextModule.__TESTING__;

    try {
      window.localStorage.clear();
      instrumentation.resetAggregateComputationCount();

      render(
        <FightStateProvider>
          <Harness />
        </FightStateProvider>,
      );

      const actions = capturedActions;
      const readCapturedState = () => capturedState;
      const initialCalls = instrumentation.getAggregateComputationCount();
      const initialMismatches = instrumentation.getAggregateMismatchCount();
      const initialVersion = readCapturedState().damageLogVersion;

      expect(initialCalls).toBeGreaterThan(0);
      expect(initialVersion).toBeGreaterThanOrEqual(0);

      act(() => {
        actions.startFight(Date.now());
      });

      const startVersion = readCapturedState().damageLogVersion;
      expect(startVersion).toBe(initialVersion);

      const postStartCount = instrumentation.getAggregateComputationCount();
      const postStartMismatch = instrumentation.getAggregateMismatchCount();
      expect(postStartCount).toBe(initialCalls);
      expect(postStartMismatch).toBe(initialMismatches);

      act(() => {
        vi.advanceTimersByTime(16);
      });

      expect(instrumentation.getAggregateComputationCount()).toBe(postStartCount);
      expect(instrumentation.getAggregateMismatchCount()).toBe(postStartMismatch);

      act(() => {
        actions.logAttack({
          id: 'cached-hit',
          label: 'Cached Hit',
          damage: 25,
          category: 'nail',
          timestamp: Date.now(),
        });
      });

      const logVersion = readCapturedState().damageLogVersion;
      expect(logVersion).toBe(startVersion + 1);

      const afterLogCount = instrumentation.getAggregateComputationCount();
      const afterLogMismatch = instrumentation.getAggregateMismatchCount();
      expect(afterLogCount).toBeGreaterThan(postStartCount);
      expect(afterLogMismatch).toBeGreaterThan(postStartMismatch);

      act(() => {
        vi.advanceTimersByTime(48);
      });

      expect(instrumentation.getAggregateComputationCount()).toBe(afterLogCount);
      expect(instrumentation.getAggregateMismatchCount()).toBe(afterLogMismatch);

      act(() => {
        actions.undoLastAttack();
      });

      const undoVersion = readCapturedState().damageLogVersion;
      expect(undoVersion).toBe(startVersion + 2);

      const afterUndoCount = instrumentation.getAggregateComputationCount();
      const afterUndoMismatch = instrumentation.getAggregateMismatchCount();
      expect(afterUndoCount).toBeGreaterThan(afterLogCount);
      expect(afterUndoMismatch).toBeGreaterThan(afterLogMismatch);

      act(() => {
        vi.advanceTimersByTime(16);
      });

      expect(instrumentation.getAggregateComputationCount()).toBe(afterUndoCount);
      expect(instrumentation.getAggregateMismatchCount()).toBe(afterUndoMismatch);

      act(() => {
        actions.endFight(Date.now());
      });

      const afterEndCount = instrumentation.getAggregateComputationCount();
      const afterEndMismatch = instrumentation.getAggregateMismatchCount();
      expect(afterEndCount).toBe(afterUndoCount);
      expect(afterEndMismatch).toBe(afterUndoMismatch);
      const endVersion = readCapturedState().damageLogVersion;
      expect(endVersion).toBe(undoVersion);
    } finally {
      instrumentation.resetAggregateComputationCount();
      cafSpy.mockRestore();
      rafSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
