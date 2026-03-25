'use client';

import { Flag } from 'lucide-react';

interface LapTimerProps {
  isRace: boolean;
  lapText: string | null;
  remainingTime: string | null;
}

/** Prominent display of lap count (Race/Sprint) or countdown timer (Practice/Qualifying). */
export function LapTimer({ isRace, lapText, remainingTime }: LapTimerProps) {
  if (isRace && lapText) {
    return (
      <div className="flex items-center gap-2">
        <Flag className="size-4 text-foreground/60" />
        <span className="text-2xs font-bold uppercase tracking-wider text-foreground/60">
          Lap
        </span>
        <span className="text-lg font-black tabular-nums tracking-tight text-foreground md:text-2xl">
          {lapText}
        </span>
      </div>
    );
  }

  if (remainingTime) {
    return (
      <span className="text-lg font-black tabular-nums tracking-tight text-foreground md:text-2xl">
        {remainingTime}
      </span>
    );
  }

  return (
    <span className="text-lg font-black tabular-nums tracking-tight text-foreground/20 md:text-xl">
      --:--:--
    </span>
  );
}
