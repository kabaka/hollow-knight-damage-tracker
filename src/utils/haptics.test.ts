import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __TESTING__, isHapticsSupported, triggerHapticFeedback } from './haptics';

const EXPECTED_VIBRATION_PATTERNS = {
  attack: 30,
  'fight-complete': [0, 40, 30, 60, 30, 80],
  'sequence-advance': [0, 25, 20, 25, 20, 25],
  'sequence-stage-complete': [0, 35, 25, 35, 25, 35, 25, 70],
  'sequence-complete': [0, 70, 45, 70, 45, 105, 60, 180],
  warning: [0, 30, 15, 30, 15, 30, 15, 60],
  success: [0, 20, 25, 40, 30, 60],
} as const satisfies (typeof __TESTING__)['VIBRATION_PATTERNS'];

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

  it('exposes consistent vibration patterns for each feedback type', () => {
    expect(__TESTING__.VIBRATION_PATTERNS).toEqual(EXPECTED_VIBRATION_PATTERNS);

    const patternEntries = Object.entries(__TESTING__.VIBRATION_PATTERNS);
    patternEntries.forEach(([type, pattern]) => {
      if (type === 'attack') {
        expect(typeof pattern).toBe('number');
        if (typeof pattern !== 'number') {
          throw new Error('Expected the attack haptic pattern to be a single pulse');
        }
        expect(pattern).toBeGreaterThan(0);
        expect(pattern).toBeLessThanOrEqual(60);
        return;
      }

      expect(Array.isArray(pattern)).toBe(true);
      if (!Array.isArray(pattern)) {
        throw new Error('Expected non-attack haptic patterns to be arrays');
      }

      expect(pattern.length).toBeGreaterThanOrEqual(4);
      expect(pattern.filter((_, index) => index % 2 === 1).length).toBeGreaterThanOrEqual(
        2,
      );
    });

    const serializedPatterns = patternEntries.map(([, pattern]) =>
      Array.isArray(pattern) ? pattern.join(',') : pattern.toString(),
    );
    expect(new Set(serializedPatterns).size).toBe(serializedPatterns.length);
  });

  it('triggers the attack vibration pattern', () => {
    const navigatorWithVibrate = globalThis.navigator as Navigator & {
      vibrate: ReturnType<typeof vi.fn>;
    };

    triggerHapticFeedback('attack');

    expect(navigatorWithVibrate.vibrate).toHaveBeenNthCalledWith(1, 0);
    expect(navigatorWithVibrate.vibrate).toHaveBeenNthCalledWith(
      2,
      EXPECTED_VIBRATION_PATTERNS.attack,
    );
  });

  it('triggers the sequence completion pattern', () => {
    const navigatorWithVibrate = globalThis.navigator as Navigator & {
      vibrate: ReturnType<typeof vi.fn>;
    };

    triggerHapticFeedback('sequence-complete');

    expect(navigatorWithVibrate.vibrate).toHaveBeenNthCalledWith(1, 0);
    expect(navigatorWithVibrate.vibrate).toHaveBeenNthCalledWith(
      2,
      EXPECTED_VIBRATION_PATTERNS['sequence-complete'],
    );
  });

  it('cancels any in-progress vibration before starting a new one', () => {
    const navigatorWithVibrate = globalThis.navigator as Navigator & {
      vibrate: ReturnType<typeof vi.fn>;
    };

    triggerHapticFeedback('attack');
    triggerHapticFeedback('fight-complete');

    expect(navigatorWithVibrate.vibrate.mock.calls).toEqual([
      [0],
      [EXPECTED_VIBRATION_PATTERNS.attack],
      [0],
      [EXPECTED_VIBRATION_PATTERNS['fight-complete']],
    ]);
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
