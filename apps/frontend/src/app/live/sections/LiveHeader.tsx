'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Moon,
  Sun,
  Thermometer,
  Droplets,
  Wind,
  Navigation,
  Columns3,
  Rows3,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { LapTimer } from '@/app/live/components/LapTimer';
import { TrackStatusBadge } from '@/app/live/components/TrackStatusBadge';
import { INTL_LOCALE, WEATHER_FRACTION_DIGITS } from '@/constants/numbers';
import { SESSION_SHORT } from '@/modules/timing/constants';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';
import { countryFlag } from '@/modules/timing/utils';

const Q_PART_LABEL: Record<number, string> = {
  1: 'Q1',
  2: 'Q2',
  3: 'Q3',
} as const;

const LAYOUT_TRANSITION = { duration: 0.2, ease: 'easeOut' } as const;

export function LiveHeader() {
  const {
    isConnected,
    header,
    isDetailedView,
    setDetailedView,
    isQualifying,
    sessionPart,
  } = useLiveTiming();
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
      {/* LEFT — badge + session identity.
          overflow-hidden is kept on the outer div; layout animation is applied to
          the inner siblings so they slide smoothly when the badge appears/clears. */}
      <div className="flex items-center gap-2 overflow-hidden md:gap-3">
        {/* AnimatePresence drives the badge entrance/exit. TrackStatusBadge returns null
            for Green ('1'), so it disappears automatically when the track goes clear. */}
        <AnimatePresence>
          {trackStatus && <TrackStatusBadge status={trackStatus} />}
        </AnimatePresence>

        {/* Mobile: flag + short session label */}
        <motion.div
          layout
          transition={{ layout: LAYOUT_TRANSITION }}
          className="flex items-center gap-1.5 lg:hidden"
        >
          {flag && (
            <span className="text-base" role="img" aria-label={countryCode}>
              {flag}
            </span>
          )}
          {sessionTypeName && (
            <span className="text-2xs font-extrabold uppercase tracking-wider text-foreground/60">
              {isQualifying && Q_PART_LABEL[sessionPart]
                ? Q_PART_LABEL[sessionPart]
                : (SESSION_SHORT[sessionTypeName] ?? sessionTypeName)}
            </span>
          )}
        </motion.div>

        {/* Desktop: flag + full meeting name + session type */}
        <motion.div
          layout
          transition={{ layout: LAYOUT_TRANSITION }}
          className="hidden min-w-0 items-center gap-2.5 lg:flex"
        >
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
                {isQualifying && Q_PART_LABEL[sessionPart]
                  ? `${sessionTypeName} — ${Q_PART_LABEL[sessionPart]}`
                  : sessionTypeName}
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* CENTER — timer, absolutely positioned to stay centred regardless of left/right widths */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <LapTimer
          isRace={isRace}
          lapText={lapText}
          remainingTime={remainingTime}
        />
      </div>

      {/* RIGHT — weather, controls, live indicator */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Weather fades in as a unit once the first WeatherData frame arrives. */}
        <AnimatePresence>
          {weather && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="hidden items-center gap-2 lg:flex"
            >
              <div className="flex items-center gap-1.5">
                <Thermometer className="size-3.5 text-orange-500" />
                <span className="text-xs font-bold tabular-nums text-foreground">
                  {Intl.NumberFormat(INTL_LOCALE, {
                    maximumFractionDigits: WEATHER_FRACTION_DIGITS,
                  }).format(weather.airTemp)}
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
                  {Intl.NumberFormat(INTL_LOCALE, {
                    maximumFractionDigits: WEATHER_FRACTION_DIGITS,
                  }).format(weather.windSpeed)}
                  <span className="text-foreground/50"> m/s</span>
                </span>
              </div>

              <div className="hidden items-center gap-2 2xl:flex">
                <div className="h-3 w-px bg-border" />

                <div className="flex items-center gap-1.5">
                  <Thermometer className="size-3.5 text-red-400" />
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {Intl.NumberFormat(INTL_LOCALE, {
                      maximumFractionDigits: WEATHER_FRACTION_DIGITS,
                    }).format(weather.trackTemp)}
                    <span className="text-foreground/50">°C</span>
                  </span>
                </div>

                <div className="h-3 w-px bg-border" />

                <div className="flex items-center gap-1.5">
                  <Navigation
                    className="size-3.5 text-sky-400 transform-[rotate(var(--wind-dir))]"
                    style={{ '--wind-dir': `${weather.windDirection}deg` } as React.CSSProperties}
                  />
                  <span className="text-xs font-bold tabular-nums text-foreground">
                    {Math.round(weather.windDirection)}
                    <span className="text-foreground/50">°</span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center rounded-md p-1.5 text-foreground/40 transition-colors hover:text-foreground"
          title="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </button>

        {/* Live indicator */}
        <button
          type="button"
          className="flex items-center gap-1.5"
          title={isConnected ? 'Connected' : 'Disconnected'}
        >
          <span
            className={cn(
              'size-2.5 shrink-0 rounded-full',
              isConnected ? 'bg-emerald-500 animate-heartbeat' : 'bg-red-500'
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
