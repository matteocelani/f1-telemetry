import { create } from 'zustand';
import type { DriverTimingStats } from '@f1-telemetry/core';
import { mergeDeltaUpdate } from '@/lib/deltaUtils';

interface TimingStatsState {
  lines: Record<string, DriverTimingStats>;
  sessionType: string | null;
  updateLines: (deltaLines: Record<string, Partial<DriverTimingStats>>) => void;
  setSessionType: (sessionType: string) => void;
  reset: () => void;
}

export const useTimingStats = create<TimingStatsState>((set) => ({
  lines: {},
  sessionType: null,

  updateLines: (deltaLines) =>
    set((state) => {
      const nextLines = { ...state.lines };
      for (const [driverNo, delta] of Object.entries(deltaLines)) {
        nextLines[driverNo] = mergeDeltaUpdate(
          nextLines[driverNo] ?? {},
          delta
        ) as DriverTimingStats;
      }
      return { lines: nextLines };
    }),

  setSessionType: (sessionType) => set({ sessionType }),
  reset: () => set({ lines: {}, sessionType: null }),
}));
