import { create } from 'zustand';
import type {
  SessionInfoPayload,
  SessionDataPayload,
  SessionStatusEntry,
  SessionSeriesEntry,
} from '@f1-telemetry/core';

interface SessionState {
  sessionInfo: SessionInfoPayload | null;
  sessionData: SessionDataPayload | null;
  setSessionInfo: (info: SessionInfoPayload) => void;
  setSessionData: (data: SessionDataPayload) => void;
  reset: () => void;
}

// F1 delta protocol sends StatusSeries/Series as keyed objects ({"2": {...}}) on partial
// updates, but as plain arrays on full snapshots. This helper normalises both into an array.
function mergeIndexedSeries<T>(
  existing: T[],
  incoming: T[] | Record<string, T> | undefined
): T[] {
  if (!incoming) return existing;
  if (Array.isArray(incoming)) return incoming;
  const merged = [...existing];
  for (const [key, entry] of Object.entries(incoming)) {
    const idx = parseInt(key, 10);
    if (!isNaN(idx)) merged[idx] = entry;
  }
  return merged.filter((e): e is T => e !== undefined);
}

export const useSession = create<SessionState>((set) => ({
  sessionInfo: null,
  sessionData: null,

  setSessionInfo: (incoming) =>
    set((state) => ({
      sessionInfo: state.sessionInfo
        ? { ...state.sessionInfo, ...incoming }
        : incoming,
    })),

  setSessionData: (incoming) =>
    set((state) => {
      const prev = state.sessionData;
      // Cast to the true wire shape: delta frames send StatusSeries/Series as keyed objects.
      const raw = incoming as unknown as {
        StatusSeries?: SessionStatusEntry[] | Record<string, SessionStatusEntry>;
        Series?: SessionSeriesEntry[] | Record<string, SessionSeriesEntry>;
      };
      return {
        sessionData: {
          StatusSeries: mergeIndexedSeries<SessionStatusEntry>(
            prev?.StatusSeries ?? [],
            raw.StatusSeries
          ),
          Series: mergeIndexedSeries<SessionSeriesEntry>(
            prev?.Series ?? [],
            raw.Series
          ),
        },
      };
    }),

  reset: () => set({ sessionInfo: null, sessionData: null }),
}));
