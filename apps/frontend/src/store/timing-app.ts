import { create } from 'zustand';
import type { DriverAppData } from '@f1-telemetry/core';
import { mergeDeltaUpdate } from '@/lib/deltaUtils';

interface TimingAppState {
  lines: Record<string, DriverAppData>;
  updateLines: (deltaLines: Record<string, Partial<DriverAppData>>) => void;
  reset: () => void;
}

export const useTimingApp = create<TimingAppState>((set) => ({
  lines: {},

  updateLines: (deltaLines) =>
    set((state) => {
      const nextLines = { ...state.lines };
      for (const [driverNo, delta] of Object.entries(deltaLines)) {
        nextLines[driverNo] = mergeDeltaUpdate(
          nextLines[driverNo] ?? {},
          delta
        ) as DriverAppData;
      }
      return { lines: nextLines };
    }),

  reset: () => set({ lines: {} }),
}));
