import { create } from 'zustand';
import type { ExtrapolatedClockPayload } from '@f1-telemetry/core';

interface ClockState {
  clock: ExtrapolatedClockPayload | null;
  // Local epoch (Date.now()) at the moment the payload was processed by the browser.
  // Using local time decouples interpolation from server UTC clock skew.
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
      // Always capture local time at receipt — never the server's UTC generation epoch.
      // This ensures elapsed-time computation is immune to server-to-client clock skew.
      serverReceivedAt: Date.now(),
    }),
  reset: () => set({ clock: null, serverReceivedAt: null }),
}));
