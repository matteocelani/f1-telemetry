import { create } from 'zustand';
import type {
  RaceControlMessage,
  TrackStatusPayload,
} from '@f1-telemetry/core';

interface RaceControlState {
  messages: RaceControlMessage[];
  trackStatus: TrackStatusPayload | null;
  appendMessages: (incoming: RaceControlMessage[]) => void;
  setTrackStatus: (status: TrackStatusPayload) => void;
  reset: () => void;
}

export const useRaceControl = create<RaceControlState>((set) => ({
  messages: [],
  trackStatus: null,

  // F1 may re-send the full message array on each update; deduplicate by Utc+Message.
  appendMessages: (incoming) =>
    set((state) => {
      const normalized = Array.isArray(incoming)
        ? incoming
        : (Object.values(incoming) as RaceControlMessage[]);
      const seen = new Set(state.messages.map((m) => m.Utc + m.Message));
      const fresh = normalized.filter((m) => !seen.has(m.Utc + m.Message));
      if (fresh.length === 0) return state;
      return { messages: [...state.messages, ...fresh] };
    }),

  setTrackStatus: (status) => set({ trackStatus: status }),

  reset: () => set({ messages: [], trackStatus: null }),
}));
