import { create } from 'zustand';

type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

interface ConnectionState {
  status: ConnectionStatus;
  lastConnectedAt: number | null;
  lastHeartbeatAt: number | null;
  retryCount: number;
  hasActivity: boolean;
  setStatus: (status: ConnectionStatus) => void;
  setConnected: () => void;
  setHasActivity: (hasActivity: boolean) => void;
  setLastHeartbeat: () => void;
  incrementRetry: () => void;
  resetRetry: () => void;
}

export const useConnection = create<ConnectionState>((set) => ({
  status: 'disconnected',
  lastConnectedAt: null,
  lastHeartbeatAt: null,
  retryCount: 0,
  hasActivity: false,
  setStatus: (status) => set({ status }),
  setConnected: () =>
    set({ status: 'connected', lastConnectedAt: Date.now(), retryCount: 0 }),
  setHasActivity: (hasActivity) => set({ hasActivity }),
  setLastHeartbeat: () => set({ lastHeartbeatAt: Date.now() }),
  incrementRetry: () => set((state) => ({ retryCount: state.retryCount + 1 })),
  resetRetry: () => set({ retryCount: 0, hasActivity: false }),
}));
