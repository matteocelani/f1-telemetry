import { create } from 'zustand';
import { TelemetryEntry } from '@f1-telemetry/core';

interface F1State {
  telemetry: TelemetryEntry | null;
  isConnected: boolean;
  setTelemetry: (data: TelemetryEntry) => void;
  setConnected: (status: boolean) => void;
}

export const useF1Store = create<F1State>((set) => ({
  telemetry: null,
  isConnected: false,
  setTelemetry: (data) => set({ telemetry: data }),
  setConnected: (status) => set({ isConnected: status }),
}));
