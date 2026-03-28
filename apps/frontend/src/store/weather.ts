import { create } from 'zustand';
import type { WeatherDataPayload } from '@f1-telemetry/core';

interface WeatherState {
  weather: WeatherDataPayload | null;
  setWeather: (data: WeatherDataPayload) => void;
  reset: () => void;
}

export const useWeather = create<WeatherState>((set) => ({
  weather: null,
  setWeather: (data) => set({ weather: data }),
  reset: () => set({ weather: null }),
}));
