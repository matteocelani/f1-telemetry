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
  lastActivityAt: number | null;
  retryCount: number;
  setStatus: (status: ConnectionStatus) => void;
  setConnected: () => void;
  recordActivity: () => void;
  clearActivity: () => void;
  setLastHeartbeat: () => void;
  incrementRetry: () => void;
  resetRetry: () => void;
}

export const useConnection = create<ConnectionState>((set) => ({
  status: 'disconnected',
  lastConnectedAt: null,
  lastHeartbeatAt: null,
  lastActivityAt: null,
  retryCount: 0,
  setStatus: (status) => set({ status }),
  setConnected: () =>
    set({ status: 'connected', lastConnectedAt: Date.now(), retryCount: 0 }),
  recordActivity: () => set({ lastActivityAt: Date.now() }),
  clearActivity: () => set({ lastActivityAt: null }),
  setLastHeartbeat: () => set({ lastHeartbeatAt: Date.now() }),
  incrementRetry: () => set((state) => ({ retryCount: state.retryCount + 1 })),
  resetRetry: () => set({ retryCount: 0 }),
}));
