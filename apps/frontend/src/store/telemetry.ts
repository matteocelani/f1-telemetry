import { create } from 'zustand';
import type { CarTelemetry } from '@f1-telemetry/core';

interface TelemetryHistoryPoint {
  time: number;
  speed: number;
  rpm: number;
  throttle: number;
  brake: number;
  gear: number;
}

interface CarTelemetryState {
  live: CarTelemetry;
  history: TelemetryHistoryPoint[];
}

const MAX_HISTORY_POINTS = 240;

interface TelemetryState {
  cars: Record<string, CarTelemetryState>;
  updateCar: (driverNo: string, telemetry: CarTelemetry) => void;
  reset: () => void;
}

export const useTelemetry = create<TelemetryState>((set) => ({
  cars: {},

  updateCar: (driverNo, telemetry) =>
    set((state) => {
      const existing = state.cars[driverNo];
      const point: TelemetryHistoryPoint = {
        time: Date.now(),
        speed: telemetry.speed,
        rpm: telemetry.rpm,
        throttle: telemetry.throttle,
        brake: telemetry.brake,
        gear: telemetry.gear,
      };

      const prevHistory = existing?.history ?? [];
      // Ring buffer capped at MAX_HISTORY_POINTS to prevent memory leak
      const nextHistory =
        prevHistory.length >= MAX_HISTORY_POINTS
          ? [...prevHistory.slice(1), point]
          : [...prevHistory, point];

      return {
        cars: {
          ...state.cars,
          [driverNo]: { live: telemetry, history: nextHistory },
        },
      };
    }),

  reset: () => set({ cars: {} }),
}));
