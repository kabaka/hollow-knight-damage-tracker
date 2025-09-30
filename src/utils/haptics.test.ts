import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __TESTING__, isHapticsSupported, triggerHapticFeedback } from './haptics';

const originalNavigator = globalThis.navigator;

describe('haptics utilities', () => {
  beforeEach(() => {
    const vibrate = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        vibrate,
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('identifies support when navigator.vibrate is available', () => {
    expect(isHapticsSupported()).toBe(true);
  });

  it('triggers the attack vibration pattern', () => {
    const navigatorWithVibrate = globalThis.navigator as Navigator & {
      vibrate: ReturnType<typeof vi.fn>;
    };

    triggerHapticFeedback('attack');

    expect(navigatorWithVibrate.vibrate).toHaveBeenCalledWith(
      __TESTING__.VIBRATION_PATTERNS.attack,
    );
  });

  it('triggers the sequence completion pattern', () => {
    const navigatorWithVibrate = globalThis.navigator as Navigator & {
      vibrate: ReturnType<typeof vi.fn>;
    };

    triggerHapticFeedback('sequence-complete');

    expect(navigatorWithVibrate.vibrate).toHaveBeenCalledWith(
      __TESTING__.VIBRATION_PATTERNS['sequence-complete'],
    );
  });

  it('no-ops when haptics are unsupported', () => {
    const navigatorWithVibrate = globalThis.navigator as Navigator & {
      vibrate: ReturnType<typeof vi.fn>;
    };

    navigatorWithVibrate.vibrate.mockReset();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });

    expect(triggerHapticFeedback('attack')).toBe(false);
  });
});
