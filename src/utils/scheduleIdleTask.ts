export type IdleCallbackOptions = { timeout?: number };
export type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
export type IdleCallback = (deadline: IdleDeadline) => void;

interface IdleCallbackGlobal {
  requestIdleCallback?: (callback: IdleCallback, options?: IdleCallbackOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
}

export const scheduleIdleTask = (
  callback: () => void,
  options?: IdleCallbackOptions,
): (() => void) => {
  if (typeof window === 'undefined') {
    callback();
    return () => {};
  }

  const idleWindow = window as Window & IdleCallbackGlobal;

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(() => {
      callback();
    }, options);

    return () => {
      if (typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(handle);
      }
    };
  }

  const timeoutId = window.setTimeout(callback, options?.timeout ?? 200);
  return () => {
    window.clearTimeout(timeoutId);
  };
};
