import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { scheduleIdleTask } from './scheduleIdleTask';

describe('scheduleIdleTask', () => {
  const globalAny = globalThis as typeof globalThis & {
    window?: Window & Record<string, unknown>;
  };
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    originalWindow = globalAny.window;
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete globalAny.window;
    } else {
      globalAny.window = originalWindow;
    }
    vi.restoreAllMocks();
  });

  it('invokes the callback immediately when no window is available', () => {
    delete globalAny.window;
    const spy = vi.fn();

    const cancel = scheduleIdleTask(spy);

    expect(spy).toHaveBeenCalledTimes(1);
    cancel();
  });

  it('uses requestIdleCallback when available', () => {
    const cancelIdleCallback = vi.fn();
    const requestIdleCallback = vi.fn().mockImplementation((cb: () => void) => {
      cb();
      return 7;
    });

    globalAny.window = Object.assign({}, originalWindow ?? {}, {
      requestIdleCallback,
      cancelIdleCallback,
    }) as Window;

    const spy = vi.fn();

    const cancel = scheduleIdleTask(spy, { timeout: 123 });

    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 123,
    });
    expect(spy).toHaveBeenCalledTimes(1);

    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });

  it('falls back to setTimeout when idle callbacks are unavailable', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const spy = vi.fn();

    const cancel = scheduleIdleTask(spy, { timeout: 50 });

    expect(setTimeoutSpy).toHaveBeenCalledWith(spy, 50);
    expect(spy).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(spy).toHaveBeenCalledTimes(1);

    cancel();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
