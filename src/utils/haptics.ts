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
  attack: [0, 35, 25, 35],
  'fight-complete': [0, 40, 30, 60, 30, 80],
  'sequence-advance': [0, 25, 20, 25, 20, 25],
  'sequence-stage-complete': [0, 35, 25, 35, 25, 35, 25, 70],
  'sequence-complete': [0, 45, 30, 45, 30, 70, 40, 120],
  warning: [0, 30, 15, 30, 15, 30, 15, 60],
  success: [0, 20, 25, 40, 30, 60],
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
