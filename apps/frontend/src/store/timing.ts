import { create } from 'zustand';
import type { DriverTiming, DriverInfo } from '@f1-telemetry/core';
import { mergeDeltaUpdate } from '@/lib/deltaUtils';

interface TimingState {
  lines: Record<string, DriverTiming>;
  driverList: Record<string, DriverInfo>;
  updateLines: (deltaLines: Record<string, Partial<DriverTiming>>) => void;
  setDriverList: (list: Record<string, DriverInfo>) => void;
  reset: () => void;
}

export const useTiming = create<TimingState>((set) => ({
  lines: {},
  driverList: {},

  updateLines: (deltaLines) =>
    set((state) => {
      const nextLines = { ...state.lines };
      for (const [driverNo, delta] of Object.entries(deltaLines)) {
        nextLines[driverNo] = mergeDeltaUpdate(
          nextLines[driverNo] ?? ({} as DriverTiming),
          delta
        );
      }
      return { lines: nextLines };
    }),

  setDriverList: (list) => set({ driverList: list }),

  reset: () => set({ lines: {}, driverList: {} }),
}));
