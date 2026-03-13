import { create } from 'zustand';
import type { SessionInfoPayload } from '@f1-telemetry/core';

interface SessionState {
  sessionInfo: SessionInfoPayload | null;
  setSessionInfo: (info: SessionInfoPayload) => void;
}

export const useSession = create<SessionState>((set) => ({
  sessionInfo: null,
  setSessionInfo: (info) => set({ sessionInfo: info }),
}));
