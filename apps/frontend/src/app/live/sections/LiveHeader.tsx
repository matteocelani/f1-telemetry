'use client';

import {
  Thermometer,
  Droplets,
  CloudRain,
  Columns3,
  Rows3,
} from 'lucide-react';
import { StatusDot } from '@/components/global/StatusDot';
import { cn } from '@/lib/utils';
import { LapTimer } from '@/app/live/components/LapTimer';
import { TrackStatusBadge } from '@/app/live/components/TrackStatusBadge';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';

/** Top bar with session info, lap/timer, track status, weather and connection dot. */
export function LiveHeader() {
  const { isConnected, header, isDetailedView, setDetailedView } =
    useLiveTiming();
  const { sessionName, isRace, lapText, remainingTime, trackStatus, weather } =
    header;

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      {/* Left: session name + lap/timer */}
      <div className="flex items-center gap-3 overflow-hidden">
        <h1 className="truncate text-xs font-bold uppercase tracking-widest text-foreground">
          {sessionName}
        </h1>
        <div className="hidden h-4 w-px bg-border/40 sm:block" />
        <div className="hidden sm:block">
          <LapTimer
            isRace={isRace}
            lapText={lapText}
            remainingTime={remainingTime}
          />
        </div>
      </div>

      {/* Right: track status + weather (desktop) + connection */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setDetailedView(!isDetailedView)}
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold uppercase tracking-widest transition-colors xl:hidden',
            isDetailedView
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title={isDetailedView ? 'Compact view' : 'Detailed view'}
        >
          {isDetailedView ? (
            <Rows3 className="size-3.5" />
          ) : (
            <Columns3 className="size-3.5" />
          )}
        </button>

        {trackStatus && <TrackStatusBadge status={trackStatus} />}

        {weather && (
          <div className="hidden items-center gap-3 xl:flex">
            <div className="flex items-center gap-1">
              <Thermometer className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-bold tabular-nums text-muted-foreground">
                {Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(
                  weather.airTemp
                )}
                °
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-bold tabular-nums text-muted-foreground">
                {Math.round(weather.humidity)}%
              </span>
            </div>
            {weather.isRaining && (
              <CloudRain className="size-3.5 text-blue-400" />
            )}
          </div>
        )}

        <StatusDot
          variant={isConnected ? 'connected' : 'disconnected'}
          className="size-2"
        />
      </div>
    </header>
  );
}
