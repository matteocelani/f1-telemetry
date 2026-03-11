import { create } from 'zustand';

interface F1State {
  isWsConnected: boolean;
  isApiHealthy: boolean;
  lastFrame: Record<string, unknown> | null;
  setWsConnected: (v: boolean) => void;
  setApiHealthy: (v: boolean) => void;
  setLastFrame: (frame: Record<string, unknown>) => void;
}

export const useF1Store = create<F1State>((set) => ({
  isWsConnected: false,
  isApiHealthy: false,
  lastFrame: null,
  setWsConnected: (v) => set({ isWsConnected: v }),
  setApiHealthy: (v) => set({ isApiHealthy: v }),
  setLastFrame: (frame) => set({ lastFrame: frame }),
}));
