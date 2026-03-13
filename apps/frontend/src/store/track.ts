import { create } from 'zustand';
import type { CarPosition } from '@f1-telemetry/core';

interface TrackState {
  positions: Record<string, CarPosition>;
  updatePositions: (entries: Record<string, CarPosition>) => void;
  reset: () => void;
}

export const useTrack = create<TrackState>((set) => ({
  positions: {},

  updatePositions: (entries) =>
    set((state) => ({
      positions: { ...state.positions, ...entries },
    })),

  reset: () => set({ positions: {} }),
}));
