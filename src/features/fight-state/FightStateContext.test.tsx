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
import { STORAGE_KEY } from './persistence';
import * as persistenceModule from './persistence';
import { bossSequenceMap } from '../../data';
import { PERSIST_FLUSH_EVENT } from '../../utils/persistenceEvents';
import { __TESTING__ as fightStateInstrumentation } from './fightStateInstrumentation';

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

  it('flushes persistence immediately when a flush event is dispatched', () => {
    vi.useFakeTimers();

    const persistSpy = vi.spyOn(persistenceModule, 'persistStateToStorage');

    const Consumer = () => {
      const { actions } = useFightState();

      useEffect(() => {
        actions.setCustomTargetHp(9876);
      }, [actions]);

      return null;
    };

    render(
      <FightStateProvider>
        <Consumer />
      </FightStateProvider>,
    );

    expect(persistSpy).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event(PERSIST_FLUSH_EVENT));
    });

    expect(persistSpy).toHaveBeenCalled();

    persistSpy.mockRestore();
    vi.useRealTimers();
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

  it('uses real clock time when recomputing derived stats without frames', async () => {
    const user = userEvent.setup();
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const Observer = () => {
      const { actions } = useFightState();
      const derived = useFightDerivedStats();
      useEffect(() => {
        actions.setCustomTargetHp(20);
      }, [actions]);
      return (
        <div>
          <span data-testid="target-hp">{derived.targetHp}</span>
          <span data-testid="elapsed">{derived.elapsedMs ?? -1}</span>
          <span data-testid="remaining">{derived.estimatedTimeRemainingMs ?? -1}</span>
          <button type="button" onClick={() => actions.startFight()}>
            Start fight
          </button>
          <button
            type="button"
            onClick={() =>
              actions.logAttack({
                id: 'swing',
                label: 'Nail Swing',
                damage: 10,
                category: 'nail',
                soulCost: null,
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
        <Observer />
      </FightStateProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('target-hp').textContent).toBe('20');
    });

    const startButton = screen.getByRole('button', { name: 'Start fight' });
    now = 1000;
    await user.click(startButton);

    now = 5000;
    await user.click(screen.getByRole('button', { name: 'Log hit' }));

    await waitFor(() => {
      expect(screen.getByTestId('elapsed').textContent).toBe('4000');
    });

    expect(screen.getByTestId('remaining').textContent).toBe('4000');
  });

  it('reports phase metadata for multi-phase encounters', async () => {
    const user = userEvent.setup();

    const Observer = () => {
      const { actions } = useFightState();
      const derived = useFightDerivedStats();
      useEffect(() => {
        actions.selectBoss('the-hollow-knight__standard');
        actions.startFight();
      }, [actions]);
      return (
        <div>
          <span data-testid="phase-number">{derived.phaseNumber ?? -1}</span>
          <span data-testid="phase-count">{derived.phaseCount ?? -1}</span>
          <span data-testid="phase-label">{derived.phaseLabel ?? 'none'}</span>
          <span data-testid="marker-count">{derived.phaseThresholds?.length ?? -1}</span>
          <button
            type="button"
            onClick={() =>
              actions.logAttack({
                id: 'huge-spell',
                label: 'Shriek',
                damage: 500,
                category: 'spell',
                soulCost: null,
              })
            }
          >
            Log phase break
          </button>
        </div>
      );
    };

    render(
      <FightStateProvider>
        <Observer />
      </FightStateProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('phase-number').textContent).toBe('1');
      expect(screen.getByTestId('phase-count').textContent).toBe('4');
      expect(screen.getByTestId('marker-count').textContent).toBe('3');
    });

    await user.click(screen.getByRole('button', { name: 'Log phase break' }));

    await waitFor(() => {
      expect(screen.getByTestId('phase-number').textContent).toBe('2');
      expect(screen.getByTestId('phase-label').textContent).toContain('Phase 2');
    });
  });

  it('discards overkill damage when a phase consumes its entire health pool', async () => {
    const user = userEvent.setup();

    const Observer = () => {
      const { actions } = useFightState();
      const derived = useFightDerivedStats();
      useEffect(() => {
        actions.selectBoss('mantis-lords__standard');
        actions.startFight();
      }, [actions]);
      return (
        <div>
          <span data-testid="remaining-hp">{derived.remainingHp}</span>
          <button
            type="button"
            onClick={() =>
              actions.logAttack({
                id: 'overkill-strike',
                label: 'Overkill',
                damage: 300,
                category: 'nail',
              })
            }
          >
            Log overkill
          </button>
        </div>
      );
    };

    render(
      <FightStateProvider>
        <Observer />
      </FightStateProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('remaining-hp').textContent).toBe('530');
    });

    await user.click(screen.getByRole('button', { name: 'Log overkill' }));

    await waitFor(() => {
      expect(screen.getByTestId('remaining-hp').textContent).toBe('320');
    });
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

    const instrumentation = fightStateInstrumentation;

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
