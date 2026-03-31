import { create } from 'zustand';
import type { DriverTiming, DriverInfo } from '@f1-telemetry/core';
import { mergeDeltaUpdate, isDriverNo } from '@/lib/deltaUtils';

interface TimingState {
  lines: Record<string, DriverTiming>;
  driverList: Record<string, DriverInfo>;
  sessionPart: number;
  noEntries: number[];
  // 0-indexed part in which each driver was knocked out (Q1=0, Q2=1, Q3=2).
  knockedOutParts: Record<string, number>;
  // F1 sends Retired/Stopped as transient flags that reset to false after seconds.
  // This set latches driver numbers permanently once either flag is seen as true.
  retiredDrivers: Set<string>;
  updateLines: (deltaLines: Record<string, Partial<DriverTiming>>) => void;
  setDriverList: (list: Record<string, DriverInfo>) => void;
  setSessionMeta: (sessionPart: number, noEntries: number[]) => void;
  reset: () => void;
}

export const useTiming = create<TimingState>((set) => ({
  lines: {},
  driverList: {},
  sessionPart: 1,
  noEntries: [],
  knockedOutParts: {},
  retiredDrivers: new Set<string>(),

  updateLines: (deltaLines) =>
    set((state) => {
      const nextLines = { ...state.lines };
      const nextKnockedOutParts = { ...state.knockedOutParts };
      let nextRetired = state.retiredDrivers;
      for (const [driverNo, delta] of Object.entries(deltaLines)) {
        if (!isDriverNo(driverNo)) continue;
        // Capture the elimination part on the first KnockedOut transition.
        // updateLines runs before setSessionMeta in wsHandler, so state.sessionPart
        // is still the part being eliminated FROM — giving the correct 0-indexed index.
        if (delta.KnockedOut === true && !(driverNo in nextKnockedOutParts)) {
          nextKnockedOutParts[driverNo] = state.sessionPart - 1;
        }
        // DNF latch: once Retired or Stopped is true, remember permanently.
        if ((delta.Retired === true || delta.Stopped === true) && !nextRetired.has(driverNo)) {
          nextRetired = new Set(nextRetired);
          nextRetired.add(driverNo);
        }
        nextLines[driverNo] = mergeDeltaUpdate(
          nextLines[driverNo] ?? {},
          delta
        ) as DriverTiming;
      }
      return { lines: nextLines, knockedOutParts: nextKnockedOutParts, retiredDrivers: nextRetired };
    }),

  setDriverList: (list) =>
    set((state) => {
      const filtered: Record<string, DriverInfo> = {};
      for (const [k, v] of Object.entries(list)) {
        if (/^\d+$/.test(k)) filtered[k] = v as DriverInfo;
      }
      return { driverList: { ...state.driverList, ...filtered } };
    }),

  setSessionMeta: (sessionPart, noEntries) => set({ sessionPart, noEntries }),

  reset: () => set({ lines: {}, driverList: {}, sessionPart: 1, noEntries: [], knockedOutParts: {}, retiredDrivers: new Set<string>() }),
}));
