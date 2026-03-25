'use client';

import { useMemo, useEffect, useState } from 'react';
import { StatusDot } from '@/components/global/StatusDot';
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
} from '@/constants/numbers';
import calendarData from '@/data/calendar.json';
import { getNextSession } from '@/modules/timing/utils';
import type { RaceEntry } from '@/types/data';

const races = calendarData as unknown as RaceEntry[];

export function LiveOfflineFallback() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), MS_PER_SECOND);
    return () => clearInterval(timer);
  }, []);

  const nextEvent = useMemo(
    () => (now ? getNextSession(now, races) : null),
    [now]
  );

  if (!now || !nextEvent) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <StatusDot variant="disconnected" className="mb-6 size-4" />
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Season Completed
        </h1>
        <p className="text-sm text-muted-foreground">
          Stay tuned for the next season.
        </p>
      </div>
    );
  }

  const { race, sessionKey, date } = nextEvent;
  const diffMs = Math.max(0, date.getTime() - now.getTime());
  const isLive = diffMs === 0;

  const days = Math.floor(diffMs / MS_PER_DAY);
  const hours = Math.floor((diffMs % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((diffMs % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((diffMs % MS_PER_MINUTE) / MS_PER_SECOND);

  const units = [
    { label: 'Days', value: days },
    { label: 'Hrs', value: hours },
    { label: 'Min', value: minutes },
    { label: 'Sec', value: seconds },
  ];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
      <div className="flex w-full max-w-md flex-col items-center gap-8 rounded-2xl border border-border/40 bg-card/40 p-10 backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-full border border-border/40 bg-foreground/5 px-3 py-1.5">
          <StatusDot
            variant={isLive ? 'reconnecting' : 'disconnected'}
            className="size-2"
          />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {isLive ? 'Waiting for Signal' : 'Offline'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-black uppercase tracking-tight md:text-3xl">
            {race.name.replace('FORMULA 1', '').trim()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {race.countryFlag} {race.circuitName} · Round {race.round}
          </p>
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {isLive ? `LIVE: ${sessionKey}` : `Next: ${sessionKey}`}
        </p>

        {!isLive && (
          <div className="grid grid-cols-4 gap-6">
            {units.map((unit) => (
              <div
                key={unit.label}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-3xl font-black tabular-nums tracking-tighter">
                  {unit.value.toString().padStart(2, '0')}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
