import { useCallback, useMemo } from 'react';

export type HapticFeedbackType =
  | 'attack'
  | 'fight-complete'
  | 'sequence-advance'
  | 'sequence-stage-complete'
  | 'sequence-complete'
  | 'warning'
  | 'success';

const VIBRATION_PATTERNS: Record<HapticFeedbackType, VibratePattern> = {
  attack: 25,
  'fight-complete': [0, 30, 40, 50],
  'sequence-advance': [0, 20, 30, 20],
  'sequence-stage-complete': [0, 30, 40, 30, 40],
  'sequence-complete': [0, 40, 50, 40, 70],
  warning: [0, 40, 40, 40, 60],
  success: [0, 25, 35, 25],
};

const isNavigatorWithVibration = (
  candidate: Navigator | undefined,
): candidate is Navigator & { vibrate: (pattern: VibratePattern) => boolean } =>
  typeof candidate?.vibrate === 'function';

export const isHapticsSupported = () =>
  typeof navigator !== 'undefined' && isNavigatorWithVibration(navigator);

export const triggerHapticFeedback = (type: HapticFeedbackType) => {
  if (!isHapticsSupported()) {
    return false;
  }

  const pattern = VIBRATION_PATTERNS[type];
  if (!pattern) {
    return false;
  }

  return navigator.vibrate(pattern);
};

export const useHapticFeedback = () => {
  const trigger = useCallback((type: HapticFeedbackType) => {
    triggerHapticFeedback(type);
  }, []);

  const isSupported = useMemo(() => isHapticsSupported(), []);

  return useMemo(
    () => ({
      isSupported,
      trigger,
    }),
    [isSupported, trigger],
  );
};

export const __TESTING__ = {
  VIBRATION_PATTERNS,
};
