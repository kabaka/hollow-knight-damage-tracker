import { useEffect } from 'react';

const formatPx = (value: number) => `${Math.max(0, value).toFixed(2)}px`;

const getLayoutViewportHeight = () => {
  const docElement = document.documentElement;
  const layoutHeightCandidates = [window.innerHeight, docElement.clientHeight];
  return Math.max(...layoutHeightCandidates.filter(Number.isFinite));
};

const updateViewportCssVars = (
  root: HTMLElement,
  viewport: VisualViewport | undefined,
) => {
  const layoutHeight = getLayoutViewportHeight();
  const visualHeight = viewport?.height ?? layoutHeight;
  const offsetTop = viewport?.offsetTop ?? 0;
  const offsetBottom = viewport
    ? Math.max(0, layoutHeight - (viewport.height + viewport.offsetTop))
    : 0;

  root.style.setProperty('--visual-viewport-height', formatPx(visualHeight));
  root.style.setProperty('--visual-viewport-offset-top', formatPx(offsetTop));
  root.style.setProperty('--visual-viewport-offset-bottom', formatPx(offsetBottom));
};

export const useVisualViewportCssVars = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    const viewport = window.visualViewport;
    const handleChange = () => {
      updateViewportCssVars(root, window.visualViewport ?? viewport);
    };

    updateViewportCssVars(root, viewport);

    window.addEventListener('resize', handleChange);
    window.addEventListener('orientationchange', handleChange);

    viewport?.addEventListener('resize', handleChange);
    viewport?.addEventListener('scroll', handleChange);

    return () => {
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('orientationchange', handleChange);
      viewport?.removeEventListener('resize', handleChange);
      viewport?.removeEventListener('scroll', handleChange);
    };
  }, []);
};
