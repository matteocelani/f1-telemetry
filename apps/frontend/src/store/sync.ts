import { create } from 'zustand';
import { delayBuffer } from '@/ws/wsBuffer';

// Covers typical broadcast delays: official streams under a minute, regional IPTV up to a few minutes.
export const MAX_DELAY_SECONDS = 180;

interface SyncState {
  delaySeconds: number;
  setDelay: (seconds: number) => void;
  goLive: () => void;
  getMaxDelaySeconds: () => number;
}

export const useSync = create<SyncState>((set) => ({
  delaySeconds: 0,

  setDelay: (seconds) => {
    const safe = Number.isFinite(seconds) ? seconds : 0;
    const clamped = Math.max(
      0,
      Math.min(MAX_DELAY_SECONDS, Math.floor(safe))
    );
    console.info('[Sync] setDelay:', clamped);
    // setDelay(0) doubles as goLive: drop buffered frames so the UI snaps live instead of draining.
    if (clamped === 0) {
      delayBuffer.setDelay(0);
      delayBuffer.flush();
    } else {
      delayBuffer.setDelay(clamped);
    }
    set({ delaySeconds: clamped });
  },

  goLive: () => {
    console.info('[Sync] goLive');
    delayBuffer.setDelay(0);
    delayBuffer.flush();
    set({ delaySeconds: 0 });
  },

  getMaxDelaySeconds: () => delayBuffer.getMaxDelaySeconds(),
}));
