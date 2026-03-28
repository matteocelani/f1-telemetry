'use client';

import { Flag } from 'lucide-react';
import { TIMER_PLACEHOLDER } from '@/constants/numbers';

interface LapTimerProps {
  isRace: boolean;
  lapText: string | null;
  remainingTime: string | null;
}

/** Displays timer and lap count. Race: laps big + timer small. Timed: timer big + laps small. */
export function LapTimer({ isRace, lapText, remainingTime }: LapTimerProps) {
  if (isRace) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Flag className="size-4 text-foreground/60" />
          <span className="text-2xs font-bold uppercase tracking-wider text-foreground/60">
            Lap
          </span>
          <span className="text-lg font-black tabular-nums tracking-tight text-foreground md:text-2xl">
            {lapText ?? '0/0'}
          </span>
        </div>
        {remainingTime && (
          <>
            <div className="hidden h-4 w-px bg-border/40 sm:block" />
            <span className="hidden text-xs font-bold tabular-nums tracking-tight text-foreground/40 sm:block">
              {remainingTime}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg font-black tabular-nums tracking-tight text-foreground md:text-2xl">
        {remainingTime ?? TIMER_PLACEHOLDER}
      </span>
      {lapText && (
        <>
          <div className="hidden h-4 w-px bg-border/40 sm:block" />
          <div className="hidden items-center gap-1.5 sm:flex">
            <Flag className="size-3.5 text-foreground/40" />
            <span className="text-xs font-bold tabular-nums tracking-tight text-foreground/40">
              {lapText}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
