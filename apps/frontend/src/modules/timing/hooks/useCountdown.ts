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

// Snap-and-tick: server frames anchor remaining time; client ticks fill gaps between frames.
export function useCountdown(): string | null {
  const { clock, serverReceivedAt } = useClock(
    useShallow((s) => ({
      clock: s.clock,
      serverReceivedAt: s.serverReceivedAt,
    }))
  );

  const [display, setDisplay] = useState<string | null>(null);
  // Ref avoids a render cycle on every anchor update.
  const anchorRef = useRef<{ remaining: number; at: number } | null>(null);

  // Re-snap on every frame; serverReceivedAt updates even when Remaining is unchanged.
  useEffect(() => {
    if (!clock?.Remaining || serverReceivedAt === null) return;
    const serverSeconds = parseHMS(clock.Remaining);
    anchorRef.current = { remaining: serverSeconds, at: serverReceivedAt };
    setDisplay(formatHMS(serverSeconds));
  }, [clock?.Remaining, serverReceivedAt]);

  // Interval recreated on Extrapolating change so the closure always captures the correct gate value.
  useEffect(() => {
    const id = setInterval(() => {
      if (clock?.Extrapolating !== true) return;
      const anchor = anchorRef.current;
      if (!anchor) return;
      const elapsed = (Date.now() - anchor.at) / MS_PER_SECOND;
      setDisplay(formatHMS(anchor.remaining - elapsed));
    }, TICK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [clock?.Extrapolating]);

  return display;
}
