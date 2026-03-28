import { create } from 'zustand';
import type { ExtrapolatedClockPayload } from '@f1-telemetry/core';

interface ClockState {
  clock: ExtrapolatedClockPayload | null;
  // Epoch ms when the server value was received, used for client-side interpolation
  serverReceivedAt: number | null;
  setClock: (data: ExtrapolatedClockPayload) => void;
  reset: () => void;
}

export const useClock = create<ClockState>((set) => ({
  clock: null,
  serverReceivedAt: null,
  setClock: (data) =>
    set({
      clock: data,
      serverReceivedAt: data.Utc ? new Date(data.Utc).getTime() : Date.now(),
    }),
  reset: () => set({ clock: null, serverReceivedAt: null }),
}));
