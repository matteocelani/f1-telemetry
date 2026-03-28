import { createContext, useContext } from 'react';
import type { LiveTimingContextType } from '@/modules/timing/types';

export const LiveTimingContext = createContext<
  LiveTimingContextType | undefined
>(undefined);

/** Consumes the LiveTimingProvider context. Throws if used outside the provider. */
export function useLiveTiming(): LiveTimingContextType {
  const context = useContext(LiveTimingContext);
  if (!context) {
    throw new Error('useLiveTiming must be used within LiveTimingProvider');
  }
  return context;
}
