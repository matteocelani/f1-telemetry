import { create } from 'zustand';
import type { CenterTab } from '@/modules/timing/types';

interface UIState {
  selectedDriver: string | null;
  activeTab: CenterTab;
  isDetailedView: boolean;
  setSelectedDriver: (selectedDriver: string | null) => void;
  setActiveTab: (activeTab: CenterTab) => void;
  setDetailedView: (isDetailedView: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  selectedDriver: null,
  activeTab: 'map',
  isDetailedView: false,
  setSelectedDriver: (selectedDriver) => set({ selectedDriver }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setDetailedView: (isDetailedView) => set({ isDetailedView }),
}));
