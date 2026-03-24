import { create } from 'zustand';
import type {
  SessionInfoPayload,
  SessionDataPayload,
} from '@f1-telemetry/core';

interface SessionState {
  sessionInfo: SessionInfoPayload | null;
  sessionData: SessionDataPayload | null;
  setSessionInfo: (info: SessionInfoPayload) => void;
  setSessionData: (data: SessionDataPayload) => void;
  reset: () => void;
}

export const useSession = create<SessionState>((set) => ({
  sessionInfo: null,
  sessionData: null,
  setSessionInfo: (info) => set({ sessionInfo: info }),
  setSessionData: (data) => set({ sessionData: data }),
  reset: () => set({ sessionInfo: null, sessionData: null }),
}));
