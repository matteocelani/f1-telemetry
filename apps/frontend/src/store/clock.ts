import { create } from 'zustand';
import type { ExtrapolatedClockPayload } from '@f1-telemetry/core';

interface ClockState {
  clock: ExtrapolatedClockPayload | null;
  setClock: (data: ExtrapolatedClockPayload) => void;
}

export const useClock = create<ClockState>((set) => ({
  clock: null,
  setClock: (data) => set({ clock: data }),
}));
