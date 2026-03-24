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

  appendMessages: (incoming) =>
    set((state) => {
      const normalized = Array.isArray(incoming)
        ? incoming
        : (Object.values(incoming) as RaceControlMessage[]);
      return { messages: [...state.messages, ...normalized] };
    }),

  setTrackStatus: (status) => set({ trackStatus: status }),

  reset: () => set({ messages: [], trackStatus: null }),
}));
