'use client';

import {
  Moon,
  Sun,
  Thermometer,
  Droplets,
  Wind,
  Columns3,
  Rows3,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { LapTimer } from '@/app/live/components/LapTimer';
import { TrackStatusBadge } from '@/app/live/components/TrackStatusBadge';
import { SESSION_SHORT } from '@/modules/timing/constants';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';
import { countryFlag } from '@/modules/timing/utils';

/** Top bar: track status, session info, timer, weather, theme toggle, live dot. */
export function LiveHeader() {
  const { isConnected, header, isDetailedView, setDetailedView } =
    useLiveTiming();
  const { theme, setTheme } = useTheme();
  const {
    meetingName,
    sessionTypeName,
    countryCode,
    isRace,
    lapText,
    remainingTime,
    trackStatus,
    weather,
  } = header;

  const flag = countryFlag(countryCode);

  return (
    <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-3 md:h-14 md:px-5">
      {/* Left: track status + session identity */}
      <div className="flex items-center gap-2.5 overflow-hidden md:gap-3">
        {trackStatus && <TrackStatusBadge status={trackStatus} />}

        {/* Mobile: flag + short session label */}
        <div className="flex items-center gap-1.5 sm:hidden">
          {flag && (
            <span className="text-base" role="img" aria-label={countryCode}>
              {flag}
            </span>
          )}
          {sessionTypeName && (
            <span className="text-2xs font-extrabold uppercase tracking-wider text-foreground/60">
              {SESSION_SHORT[sessionTypeName] ?? sessionTypeName}
            </span>
          )}
        </div>

        {/* Tablet+: flag + session name on two lines */}
        <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
          {flag && (
            <span
              className="shrink-0 text-lg"
              role="img"
              aria-label={countryCode}
            >
              {flag}
            </span>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-extrabold uppercase leading-tight tracking-widest text-foreground md:text-sm">
              {meetingName || 'F1 Live'}
            </span>
            {sessionTypeName && (
              <span className="truncate text-2xs font-semibold uppercase leading-tight tracking-wider text-foreground/50 md:text-xs">
                {sessionTypeName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: prominent timer/lap — always visible */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <LapTimer
          isRace={isRace}
          lapText={lapText}
          remainingTime={remainingTime}
        />
      </div>

      {/* Right: weather + view toggle + theme + live */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Weather — desktop only */}
        {weather && (
          <div className="hidden items-center gap-2 xl:flex">
            <div className="flex items-center gap-1.5">
              <Thermometer className="size-3.5 text-orange-500" />
              <span className="text-xs font-bold tabular-nums text-foreground">
                {Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(
                  weather.airTemp
                )}
                <span className="text-foreground/50">&#176;C</span>
              </span>
            </div>

            <div className="h-3 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              <Droplets className="size-3.5 text-blue-500" />
              <span className="text-xs font-bold tabular-nums text-foreground">
                {Math.round(weather.humidity)}
                <span className="text-foreground/50">%</span>
              </span>
            </div>

            <div className="h-3 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              <Wind className="size-3.5 text-sky-500" />
              <span className="text-xs font-bold tabular-nums text-foreground">
                {Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(
                  weather.windSpeed
                )}
                <span className="text-foreground/50"> m/s</span>
              </span>
            </div>
          </div>
        )}

        {/* View toggle — below xl only */}
        <button
          type="button"
          onClick={() => setDetailedView(!isDetailedView)}
          className={cn(
            'flex items-center rounded-md p-1.5 transition-colors xl:hidden',
            isDetailedView
              ? 'bg-foreground text-background'
              : 'text-foreground/40 hover:text-foreground'
          )}
          title={isDetailedView ? 'Compact view' : 'Detailed view'}
        >
          {isDetailedView ? (
            <Rows3 className="size-4" />
          ) : (
            <Columns3 className="size-4" />
          )}
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center rounded-md p-1.5 text-foreground/40 transition-colors hover:text-foreground"
          title="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </button>

        {/* Live indicator — always visible */}
        <button
          type="button"
          className="flex items-center gap-1.5"
          title={isConnected ? 'Connected' : 'Disconnected'}
        >
          <span
            className={cn(
              'size-2.5 shrink-0 rounded-full',
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            )}
          />
          <span
            className={cn(
              'text-2xs font-extrabold uppercase tracking-wider',
              isConnected ? 'text-emerald-500' : 'text-red-500'
            )}
          >
            {isConnected ? 'Live' : 'Off'}
          </span>
        </button>
      </div>
    </header>
  );
}
