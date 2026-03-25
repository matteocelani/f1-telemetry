import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useClock } from '@/store/clock';

const TICK_INTERVAL_MS = 100;

// Parses "HH:MM:SS" to total seconds
function parseHMS(hms: string): number {
  const parts = hms.split(':').map(Number);
  if (parts.length !== 3) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

// Formats total seconds back to "HH:MM:SS"
function formatHMS(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Smoothly interpolates the session countdown between server updates.
 * Snaps to the server value when a new frame arrives, then ticks down locally.
 */
export function useCountdown(): string | null {
  const { clock, serverReceivedAt } = useClock(
    useShallow((s) => ({ clock: s.clock, serverReceivedAt: s.serverReceivedAt }))
  );

  const [display, setDisplay] = useState<string | null>(null);
  const anchorRef = useRef<{ remaining: number; at: number } | null>(null);

  // Snap to server value whenever a new clock frame arrives
  useEffect(() => {
    if (!clock?.Remaining || !serverReceivedAt) return;
    const serverSeconds = parseHMS(clock.Remaining);
    anchorRef.current = { remaining: serverSeconds, at: serverReceivedAt };
    setDisplay(formatHMS(serverSeconds));
  }, [clock?.Remaining, serverReceivedAt]);

  // Tick down between server updates
  useEffect(() => {
    const id = setInterval(() => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const elapsed = (Date.now() - anchor.at) / 1000;
      const current = anchor.remaining - elapsed;
      setDisplay(formatHMS(current));
    }, TICK_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return display;
}
