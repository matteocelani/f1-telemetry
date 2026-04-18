import { create } from 'zustand';
import type { LapCountPayload } from '@f1-telemetry/core';

interface LapCountState {
  lapCount: LapCountPayload | null;
  setLapCount: (data: LapCountPayload) => void;
  reset: () => void;
}

export const useLapCount = create<LapCountState>((set) => ({
  lapCount: null,
  setLapCount: (incoming) =>
    set((state) => ({
      lapCount: state.lapCount ? { ...state.lapCount, ...incoming } : incoming,
    })),
  reset: () => set({ lapCount: null }),
}));
