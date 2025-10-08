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
import { PERSIST_FLUSH_EVENT } from '../../utils/persistenceEvents';
import * as scheduleIdleTaskModule from '../../utils/scheduleIdleTask';

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

  it('flushes persistence immediately when a flush event is dispatched', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    let actions: FightActions | null = null;

    renderWithFightProvider(
      <CombatLogProvider>
        <ActionsBridge
          onReady={(value) => {
            actions = value;
          }}
        />
        <CombatLogPanel />
      </CombatLogProvider>,
    );

    await waitFor(() => {
      expect(actions).not.toBeNull();
    });

    act(() => {
      actions?.logAttack({
        id: 'flush-test-hit',
        label: 'Flush Test Hit',
        category: 'nail',
        damage: 12,
        timestamp: Date.now(),
      });
    });

    expect(setItemSpy).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event(PERSIST_FLUSH_EVENT));
    });

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalled();
    });

    setItemSpy.mockRestore();
  });

  it('schedules persistence with an idle callback before writing to storage', async () => {
    type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
    type IdleCallback = (deadline: IdleDeadline) => void;
    type IdleCallbackOptions = { timeout?: number };
    type IdleCallbackFn = (
      callback: IdleCallback,
      options?: IdleCallbackOptions,
    ) => number;
    type IdleCancelFn = (handle: number) => void;

    type IdleCallbackGlobal = Window & {
      requestIdleCallback?: IdleCallbackFn;
      cancelIdleCallback?: IdleCancelFn;
    };

    const idleWindow = window as IdleCallbackGlobal;
    const originalRequestIdleCallback = idleWindow.requestIdleCallback;
    const originalCancelIdleCallback = idleWindow.cancelIdleCallback;

    let scheduledCallback: IdleCallback | null = null;

    const requestIdleCallbackMock = vi
      .fn<IdleCallbackFn>()
      .mockImplementation((callback) => {
        scheduledCallback = callback;
        return 1;
      });

    const cancelIdleCallbackMock = vi.fn<IdleCancelFn>().mockImplementation(() => {
      scheduledCallback = null;
    });

    idleWindow.requestIdleCallback = requestIdleCallbackMock;
    idleWindow.cancelIdleCallback = cancelIdleCallbackMock;

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    let actions: FightActions | null = null;

    const scheduleSpy = vi.spyOn(scheduleIdleTaskModule, 'scheduleIdleTask');

    try {
      renderWithFightProvider(
        <CombatLogProvider>
          <ActionsBridge
            onReady={(value) => {
              actions = value;
            }}
          />
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
          timestamp: Date.now(),
        });
      });

      await waitFor(() => {
        expect(requestIdleCallbackMock).toHaveBeenCalled();
      });

      expect(scheduleSpy).toHaveBeenCalled();

      await waitFor(() => {
        expect(scheduledCallback).not.toBeNull();
      });

      expect(setItemSpy).not.toHaveBeenCalled();

      const callback = scheduledCallback;
      if (typeof callback !== 'function') {
        throw new Error('Expected requestIdleCallback to schedule a task');
      }

      act(() => {
        callback({ didTimeout: false, timeRemaining: () => 10 });
      });

      expect(setItemSpy).toHaveBeenCalledTimes(1);
    } finally {
      scheduleSpy.mockRestore();
      setItemSpy.mockRestore();
      if (typeof originalRequestIdleCallback === 'function') {
        idleWindow.requestIdleCallback = originalRequestIdleCallback;
      } else {
        delete idleWindow.requestIdleCallback;
      }

      if (typeof originalCancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback = originalCancelIdleCallback;
      } else {
        delete idleWindow.cancelIdleCallback;
      }
    }
  });

  it('auto-scrolls only when the user is near the bottom of the viewport', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    let actions: FightActions | null = null;

    try {
      renderWithFightProvider(
        <CombatLogProvider>
          <ActionsBridge
            onReady={(value) => {
              actions = value;
            }}
          />
          <CombatLogPanel />
        </CombatLogProvider>,
      );

      await waitFor(() => {
        expect(actions).not.toBeNull();
      });

      const viewport = screen.getByRole('log');
      const scrollTo = vi.fn();

      Object.defineProperty(viewport, 'clientHeight', {
        configurable: true,
        value: 100,
        writable: true,
      });
      Object.defineProperty(viewport, 'scrollHeight', {
        configurable: true,
        value: 200,
        writable: true,
      });
      Object.defineProperty(viewport, 'scrollTop', {
        configurable: true,
        value: 95,
        writable: true,
      });

      // @ts-expect-error jsdom does not implement scrollTo natively
      viewport.scrollTo = scrollTo;

      act(() => {
        viewport.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        actions?.startFight(Date.now());
      });

      act(() => {
        actions?.logAttack({
          id: 'nail-strike',
          label: 'Nail Strike',
          category: 'nail',
          damage: 50,
          timestamp: Date.now(),
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Nail Strike')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(scrollTo).toHaveBeenCalled();
      });

      scrollTo.mockClear();
      viewport.scrollTop = 0;

      act(() => {
        viewport.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        actions?.logAttack({
          id: 'nail-strike-2',
          label: 'Nail Strike',
          category: 'nail',
          damage: 60,
          timestamp: Date.now(),
        });
      });

      await waitFor(() => {
        expect(screen.getAllByText('Nail Strike').length).toBeGreaterThan(1);
      });

      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      setItemSpy.mockRestore();
    }
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
