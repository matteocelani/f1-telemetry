'use client';

import { Timer, Flag } from 'lucide-react';

interface LapTimerProps {
  isRace: boolean;
  lapText: string | null;
  remainingTime: string | null;
}

/** Displays lap count (Race/Sprint) or countdown timer (Practice/Qualifying). */
export function LapTimer({ isRace, lapText, remainingTime }: LapTimerProps) {
  if (isRace && lapText) {
    return (
      <div className="flex items-center gap-1.5">
        <Flag className="size-3.5 text-muted-foreground" />
        <span className="text-sm font-black tabular-nums tracking-tight">
          {lapText}
        </span>
      </div>
    );
  }

  if (remainingTime) {
    return (
      <div className="flex items-center gap-1.5">
        <Timer className="size-3.5 text-muted-foreground" />
        <span className="text-sm font-black tabular-nums tracking-tight">
          {remainingTime}
        </span>
      </div>
    );
  }

  return <span className="text-xs text-muted-foreground">Waiting...</span>;
}
