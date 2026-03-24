import { create } from 'zustand';
import type { LapCountPayload } from '@f1-telemetry/core';

interface LapCountState {
  lapCount: LapCountPayload | null;
  setLapCount: (data: LapCountPayload) => void;
}

export const useLapCount = create<LapCountState>((set) => ({
  lapCount: null,
  setLapCount: (data) => set({ lapCount: data }),
}));
