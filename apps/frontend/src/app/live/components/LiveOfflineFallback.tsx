'use client';

import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusDot } from '@/components/global/StatusDot';
import { cn } from '@/lib/utils';
import type { RaceEntry } from '@/types/data';
import calendarData from '@/data/calendar.json';
import circuitsData from '@/data/circuits.json';

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1000;

interface RacingDot {
  id: string;
  color: string;
  duration: number;
  keyPoints: string;
  keyTimes: string;
}

const DOT_RADIUS = 5;

// Each dot starts at a different point on the circuit (0%, 33%, 66%)
const RACING_DOTS: RacingDot[] = [
  {
    id: 'ferrari',
    color: 'var(--color-team-ferrari)',
    duration: 6,
    keyPoints: '0;1',
    keyTimes: '0;1',
  },
  {
    id: 'mclaren',
    color: 'var(--color-team-mclaren)',
    duration: 6.3,
    keyPoints: '0.33;1;0;0.33',
    keyTimes: '0;0.67;0.67;1',
  },
  {
    id: 'redbull',
    color: 'var(--color-team-redbull)',
    duration: 6.6,
    keyPoints: '0.66;1;0;0.66',
    keyTimes: '0;0.34;0.34;1',
  },
];

const races = calendarData as unknown as RaceEntry[];

const GRACE_PERIOD_MS = 4 * MS_PER_HOUR;
const SESSION_ENDED_THRESHOLD_MS = 2 * MS_PER_HOUR;

function getNextSession(now: Date) {
  for (const race of races) {
    const sessionEntries = Object.entries(race.sessions).sort(
      (a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime()
    );

    for (const [sessionKey, sessionDateStr] of sessionEntries) {
      const sessionDate = new Date(sessionDateStr);
      if (
        sessionDate > now ||
        now.getTime() - sessionDate.getTime() < GRACE_PERIOD_MS
      ) {
        return {
          race,
          sessionKey: sessionKey.toUpperCase(),
          date: sessionDate,
        };
      }
    }
  }
  return null;
}

export function LiveOfflineFallback() {
  const [now, setNow] = useState(new Date());

  // Keep the countdown updated every second.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nextEvent = useMemo(() => getNextSession(now), [now]);

  if (!nextEvent) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <StatusDot variant="disconnected" className="mb-6 h-4 w-4" />
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Season Completed
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          The 2026 championship has concluded. Stay tuned for the next season.
        </p>
      </div>
    );
  }

  const { race, sessionKey, date } = nextEvent;
  const diffMs = date.getTime() - now.getTime();
  const elapsedMs = now.getTime() - date.getTime();

  const isUpcoming = diffMs > 0;
  const isLive = !isUpcoming && elapsedMs < SESSION_ENDED_THRESHOLD_MS;
  const isSessionEnded = !isUpcoming && elapsedMs >= SESSION_ENDED_THRESHOLD_MS;
  const circuitSvg = (
    circuitsData as {
      circuitId: string;
      name: string;
      viewBox: string;
      path: string;
    }[]
  ).find((c) => c.circuitId === race.id);

  const days = Math.max(0, Math.floor(diffMs / MS_PER_DAY));
  const hours = Math.max(0, Math.floor((diffMs % MS_PER_DAY) / MS_PER_HOUR));
  const minutes = Math.max(
    0,
    Math.floor((diffMs % MS_PER_HOUR) / MS_PER_MINUTE)
  );
  const seconds = Math.max(
    0,
    Math.floor((diffMs % MS_PER_MINUTE) / MS_PER_SECOND)
  );

  const countdownUnits = [
    { label: 'Days', value: days },
    { label: 'Hrs', value: hours },
    { label: 'Min', value: minutes },
    { label: 'Sec', value: seconds },
  ];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
      {/* Dynamic Glow Effect */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_srgb,var(--color-foreground),transparent_97%),transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative flex w-full max-w-2xl flex-col items-center gap-10 rounded-3xl border border-border/40 bg-card/40 p-10 md:p-16 text-center backdrop-blur-xl shadow-2xl"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-full border border-border/40 bg-foreground/5 shadow-inner">
            <StatusDot
              variant={isLive ? 'reconnecting' : 'disconnected'}
              className={cn('h-2 w-2', isLive && 'animate-pulse')}
            />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {isSessionEnded
                ? 'Session Ended'
                : isLive
                  ? 'Waiting for Signal'
                  : 'Offline Mode'}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-foreground text-balance">
            {race.name.replace('FORMULA 1', '').trim()}
          </h1>
          <p className="text-sm font-semibold text-muted-foreground/80 flex items-center gap-2">
            <span>{race.countryFlag}</span>
            {race.circuitName} • Round {race.round}
          </p>
        </div>

        {/* Animated Track Visualization */}
        {circuitSvg?.viewBox && (
          <div className="flex h-48 w-full items-center justify-center opacity-40 group hover:opacity-70 transition-opacity duration-700">
            <svg
              viewBox={circuitSvg.viewBox}
              className="h-full w-full object-contain filter drop-shadow-sm"
            >
              <defs>
                <path id="circuit-path" d={circuitSvg.path} />
              </defs>
              {/* Static track outline */}
              <use
                href="#circuit-path"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
              />
              {/* Racing dots moving along the circuit */}
              {RACING_DOTS.map((dot) => (
                <circle
                  key={dot.id}
                  r={DOT_RADIUS}
                  fill={dot.color}
                  opacity="1"
                >
                  <animateMotion
                    dur={`${dot.duration}s`}
                    keyPoints={dot.keyPoints}
                    keyTimes={dot.keyTimes}
                    calcMode="linear"
                    repeatCount="indefinite"
                  >
                    <mpath href="#circuit-path" />
                  </animateMotion>
                </circle>
              ))}
            </svg>
          </div>
        )}

        <div className="flex flex-col items-center gap-6 w-full">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {isSessionEnded
              ? `${sessionKey} — Completed`
              : isLive
                ? `LIVE: ${sessionKey} — Broadcasting soon`
                : `Upcoming Session: ${sessionKey}`}
          </p>

          {isUpcoming && (
            <div className="grid grid-cols-4 gap-6 md:gap-10 w-full max-w-sm">
              {countdownUnits.map((unit) => (
                <div
                  key={unit.label}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="text-3xl md:text-4xl font-black tabular-nums tracking-tighter text-foreground transition-colors duration-300">
                    {unit.value.toString().padStart(2, '0')}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isLive && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" />
              </div>
              <p className="text-xs text-muted-foreground italic">
                Waiting for telemetry data from the track...
              </p>
            </div>
          )}

          {isSessionEnded && (
            <p className="text-sm text-muted-foreground">
              The next session will appear here automatically.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
