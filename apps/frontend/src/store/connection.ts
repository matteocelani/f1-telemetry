import { create } from 'zustand';

type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

interface ConnectionState {
  status: ConnectionStatus;
  lastConnectedAt: number | null;
  retryCount: number;
  hasActivity: boolean;
  setStatus: (status: ConnectionStatus) => void;
  setConnected: () => void;
  setHasActivity: (hasActivity: boolean) => void;
  incrementRetry: () => void;
  resetRetry: () => void;
}

export const useConnection = create<ConnectionState>((set) => ({
  status: 'disconnected',
  lastConnectedAt: null,
  retryCount: 0,
  hasActivity: false,
  setStatus: (status) => set({ status }),
  setConnected: () =>
    set({ status: 'connected', lastConnectedAt: Date.now(), retryCount: 0 }),
  setHasActivity: (hasActivity) => set({ hasActivity }),
  incrementRetry: () => set((state) => ({ retryCount: state.retryCount + 1 })),
  resetRetry: () => set({ retryCount: 0, hasActivity: false }),
}));
