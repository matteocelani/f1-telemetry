'use client';

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { StatusDot } from '@/components/global/StatusDot';
import { cn } from '@/lib/utils';
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SESSION_ENDED_THRESHOLD_MS,
} from '@/constants/numbers';
import calendarData from '@/data/calendar.json';
import circuitsData from '@/data/circuits.json';
import { getNextSession } from '@/modules/timing/utils';
import type { RaceEntry } from '@/types/data';

interface CircuitData {
  circuitId: string;
  name: string;
  viewBox: string;
  path: string;
}

interface RacingDot {
  id: string;
  color: string;
  duration: number;
  keyPoints: string;
  keyTimes: string;
}

const DOT_RADIUS = 5;

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
const circuits = circuitsData as CircuitData[];

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

  // Wait for client-side hydration before rendering anything
  if (!now) return null;

  if (!nextEvent) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <StatusDot variant="disconnected" className="mb-6 size-4" />
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Season Completed
        </h1>
        <p className="max-w-xs text-sm text-muted-foreground">
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

  const circuitSvg = circuits.find((c) => c.circuitId === race.id);

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
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-6 md:p-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_srgb,var(--color-foreground),transparent_97%),transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative flex w-full max-w-2xl flex-col items-center gap-10 rounded-3xl border border-border/40 bg-card/40 p-10 text-center shadow-2xl backdrop-blur-xl md:p-16"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 rounded-full border border-border/40 bg-foreground/5 px-4 py-1.5 shadow-inner">
            <StatusDot
              variant={isLive ? 'reconnecting' : 'disconnected'}
              className={cn('size-2', isLive && 'animate-pulse')}
            />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {isSessionEnded
                ? 'Session Ended'
                : isLive
                  ? 'Waiting for Signal'
                  : 'Offline Mode'}
            </span>
          </div>

          <h1 className="text-balance text-3xl font-black uppercase tracking-tighter text-foreground md:text-4xl">
            {race.name.replace('FORMULA 1', '').trim()}
          </h1>
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground/80">
            <span>{race.countryFlag}</span>
            {race.circuitName} &bull; Round {race.round}
          </p>
        </div>

        {circuitSvg?.viewBox && (
          <div className="group flex h-48 w-full items-center justify-center opacity-40 transition-opacity duration-700 hover:opacity-70">
            <svg
              viewBox={circuitSvg.viewBox}
              className="h-full w-full object-contain drop-shadow-sm"
            >
              <defs>
                <path id="circuit-path" d={circuitSvg.path} />
              </defs>
              <use
                href="#circuit-path"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
              />
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

        <div className="flex w-full flex-col items-center gap-6">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {isSessionEnded
              ? `${sessionKey} — Completed`
              : isLive
                ? `LIVE: ${sessionKey} — Broadcasting soon`
                : `Upcoming Session: ${sessionKey}`}
          </p>

          {isUpcoming && (
            <div className="grid w-full max-w-sm grid-cols-4 gap-6 md:gap-10">
              {countdownUnits.map((unit) => (
                <div
                  key={unit.label}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="text-3xl font-black tabular-nums tracking-tighter text-foreground transition-colors duration-300 md:text-4xl">
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
                <span className="size-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary/40" />
              </div>
              <p className="text-xs italic text-muted-foreground">
                Waiting for telemetry data from the track...
              </p>
            </div>
          )}

          {isSessionEnded && (
            <p className="text-sm text-muted-foreground">
              The next session will appear here automatically.
            </p>
          )}

          <Link
            href="/"
            className="mt-2 flex items-center gap-2 rounded-full border border-border/40 px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
