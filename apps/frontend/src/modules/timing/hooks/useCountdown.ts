import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  MS_PER_SECOND,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  TICK_INTERVAL_MS,
} from '@/constants/numbers';
import { useClock } from '@/store/clock';

function parseHMS(hms: string): number {
  const parts = hms.split(':').map(Number);
  if (parts.length !== 3) return 0;
  return parts[0] * SECONDS_PER_HOUR + parts[1] * SECONDS_PER_MINUTE + parts[2];
}

function formatHMS(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / SECONDS_PER_HOUR);
  const m = Math.floor((clamped % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const s = Math.floor(clamped % SECONDS_PER_MINUTE);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Snap-and-tick approach prevents jarring jumps when server updates arrive mid-interval
export function useCountdown(): string | null {
  const { clock, serverReceivedAt } = useClock(
    useShallow((s) => ({ clock: s.clock, serverReceivedAt: s.serverReceivedAt }))
  );

  const [display, setDisplay] = useState<string | null>(null);
  const anchorRef = useRef<{ remaining: number; at: number } | null>(null);

  useEffect(() => {
    if (!clock?.Remaining || !serverReceivedAt) return;
    const serverSeconds = parseHMS(clock.Remaining);
    anchorRef.current = { remaining: serverSeconds, at: serverReceivedAt };
    setDisplay(formatHMS(serverSeconds));
  }, [clock?.Remaining, serverReceivedAt]);

  useEffect(() => {
    const id = setInterval(() => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const elapsed = (Date.now() - anchor.at) / MS_PER_SECOND;
      const current = anchor.remaining - elapsed;
      setDisplay(formatHMS(current));
    }, TICK_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return display;
}
