import { useSyncExternalStore } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const MD_BREAKPOINT = 768;
const XL_BREAKPOINT = 1280;

const tabletQuery =
  typeof window !== 'undefined'
    ? window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`)
    : null;

const desktopQuery =
  typeof window !== 'undefined'
    ? window.matchMedia(`(min-width: ${XL_BREAKPOINT}px)`)
    : null;

function getSnapshot(): Breakpoint {
  if (desktopQuery?.matches) return 'desktop';
  if (tabletQuery?.matches) return 'tablet';
  return 'mobile';
}

function getServerSnapshot(): Breakpoint {
  return 'desktop';
}

function subscribe(callback: () => void): () => void {
  tabletQuery?.addEventListener('change', callback);
  desktopQuery?.addEventListener('change', callback);
  return () => {
    tabletQuery?.removeEventListener('change', callback);
    desktopQuery?.removeEventListener('change', callback);
  };
}

/** Returns the current responsive breakpoint using matchMedia listeners. */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
