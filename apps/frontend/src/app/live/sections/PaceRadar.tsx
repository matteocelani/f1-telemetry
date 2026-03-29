'use client';

import { useMemo, useState } from 'react';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TyreIcon } from '@/app/live/components/TyreIcon';
import {
  LAP_TREND_DRIVER_COUNT,
  PACE_METRICS,
  SPEED_SNAPSHOT_COUNT,
} from '@/modules/timing/constants';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';
import { getMetricValue, usePaceRadar } from '@/modules/timing/hooks/usePaceRadar';
import type { LapSnapshot, PaceMetricKey, SectorColorClass } from '@/modules/timing/types';
import type { UITimingRow } from '@/modules/timing/types';

type PaceView = 'trend' | 'snapshot';

const VALUE_COLOR: Record<SectorColorClass, string> = {
  purple: 'text-violet-500',
  green: 'text-emerald-500',
  yellow: 'text-foreground',
  none: 'text-muted-foreground',
};

const DOT_COLOR: Record<SectorColorClass, string> = {
  purple: 'bg-violet-500',
  green: 'bg-emerald-500',
  yellow: 'bg-foreground/60',
  none: 'bg-muted-foreground/40',
};

interface PaceRadarProps {
  className?: string;
}

export function PaceRadar({ className }: PaceRadarProps) {
  const { rows, isQualifying } = useLiveTiming();
  const history = usePaceRadar(rows);

  const [view, setView] = useState<PaceView>('snapshot');

  const hasData = rows.length > 0;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* View toggle */}
      <div className="flex shrink-0 border-b border-border">
        <button
          type="button"
          onClick={() => setView('snapshot')}
          className={cn(
            'flex-1 py-1 text-center text-2xs font-bold uppercase tracking-widest transition-colors',
            view === 'snapshot'
              ? 'text-foreground border-b-2 border-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Speed Snapshot
        </button>
        <button
          type="button"
          onClick={() => setView('trend')}
          className={cn(
            'flex-1 py-1 text-center text-2xs font-bold uppercase tracking-widest transition-colors',
            view === 'trend'
              ? 'text-foreground border-b-2 border-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Lap Trend
        </button>
      </div>

      {hasData ? (
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {view === 'trend' ? (
            <LapTrend history={history} isQualifying={isQualifying} />
          ) : (
            <SpeedSnapshot rows={rows} isQualifying={isQualifying} />
          )}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

const SPARK_VB_W = 200;
const SPARK_VB_H = 28;
const SPARK_PAD = 3;
const SPARK_PLOT_H = SPARK_VB_H - SPARK_PAD * 2;

interface LapTrendProps {
  history: ReturnType<typeof usePaceRadar>;
  isQualifying: boolean;
}

function LapTrend({ history, isQualifying }: LapTrendProps) {
  const drivers = useMemo(() => {
    const active = isQualifying
      ? history.filter((d) => !d.isKnockedOut)
      : history;

    return active
      .filter((d) => d.laps.length >= 2)
      .slice(0, LAP_TREND_DRIVER_COUNT);
  }, [history, isQualifying]);

  const maxPoints = useMemo(
    () => Math.max(2, ...drivers.map((d) => d.laps.length)),
    [drivers]
  );

  if (drivers.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-xs text-muted-foreground">
          Waiting for lap data...
        </p>
      </div>
    );
  }

  const fastestLatestMs = Math.min(
    ...drivers.map((d) => d.laps[d.laps.length - 1].lapTimeMs)
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {drivers.map((driver, i) => {
        const latest = driver.laps[driver.laps.length - 1];
        const deltaMs = latest.lapTimeMs - fastestLatestMs;
        const isLeader = deltaMs === 0;

        return (
          <div
            key={driver.driverNo}
            className={cn(
              'px-3 py-2',
              i < drivers.length - 1 && 'border-b border-border/50',
              isLeader && 'bg-violet-500/5',
              isQualifying && driver.isKnockedOut && 'opacity-40',
            )}
          >
            {/* Row header */}
            <div className="flex items-center gap-2">
              <div className="flex w-12 shrink-0 items-center gap-1.5">
                <div
                  className="h-3.5 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: driver.teamColor }}
                />
                <span className="text-2xs font-bold text-foreground">
                  {driver.tla}
                </span>
              </div>

              <div className="shrink-0 scale-75 origin-left">
                <TyreIcon compound={latest.compound} showAge={false} />
              </div>

              <span
                className={cn(
                  'ml-auto text-xs font-bold tabular-nums',
                  VALUE_COLOR[latest.color],
                )}
              >
                {formatMs(latest.lapTimeMs)}
              </span>

              <span className="w-14 shrink-0 text-right text-2xs tabular-nums text-muted-foreground">
                {isLeader ? '' : `+${(deltaMs / 1_000).toFixed(3)}`}
              </span>
            </div>

            {/* Sparkline — fixed height, never stretches or squashes */}
            <div className="mt-1 h-8">
              <DriverSparkLine
                laps={driver.laps}
                color={driver.teamColor}
                maxPoints={maxPoints}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DriverSparkLineProps {
  laps: LapSnapshot[];
  color: string;
  maxPoints: number;
}

function DriverSparkLine({ laps, color, maxPoints }: DriverSparkLineProps) {
  const { coords, areaPath } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const lap of laps) {
      if (lap.lapTimeMs < min) min = lap.lapTimeMs;
      if (lap.lapTimeMs > max) max = lap.lapTimeMs;
    }
    // Minimal padding: just enough to not clip the stroke.
    const range = max - min || 100;
    const yMin = min - range * 0.15;
    const yMax = max + range * 0.15;
    const yRange = yMax - yMin || 1;

    const offset = maxPoints - laps.length;

    const pts = laps.map((lap, i) => {
      const x = ((i + offset) / (maxPoints - 1)) * SPARK_VB_W;
      const y = SPARK_PAD + SPARK_PLOT_H - ((lap.lapTimeMs - yMin) / yRange) * SPARK_PLOT_H;
      return { x, y };
    });

    const lineSegments = pts.map((p) => `${p.x},${p.y}`).join(' L');
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    const bottom = SPARK_VB_H;
    const area = `M${firstX},${bottom} L${lineSegments} L${lastX},${bottom} Z`;

    return { coords: pts, areaPath: area };
  }, [laps, maxPoints]);

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  // Stable gradient ID derived from color hex.
  const gradId = `sg${color.replace('#', '')}`;

  return (
    <svg
      viewBox={`0 0 ${SPARK_VB_W} ${SPARK_VB_H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Gradient fill area under the line */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* The line itself */}
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface SpeedSnapshotProps {
  rows: UITimingRow[];
  isQualifying: boolean;
}

function SpeedSnapshot({ rows, isQualifying }: SpeedSnapshotProps) {
  const [metric, setMetric] = useState<PaceMetricKey>('s1');

  const isSectorMetric = metric === 's1' || metric === 's2' || metric === 's3';
  const activeMetric = PACE_METRICS.find((m) => m.key === metric);

  const ranked = useMemo(() => {
    const entries = rows
      .filter((r) => !r.isRetired)
      .map((row) => {
        const { value, numericValue, color } = getMetricValue(row, metric);
        return { row, value, numericValue, color };
      })
      .filter((e) => e.value !== '');

    entries.sort((a, b) =>
      isSectorMetric
        ? a.numericValue - b.numericValue
        : b.numericValue - a.numericValue
    );

    return entries.slice(0, SPEED_SNAPSHOT_COUNT);
  }, [rows, metric, isSectorMetric]);

  const barData = useMemo(() => {
    if (ranked.length === 0) return [];
    if (isSectorMetric) {
      const best = ranked[0].numericValue;
      const worst = ranked[ranked.length - 1].numericValue;
      const range = worst - best || 1;
      return ranked.map((e) => ({
        ...e,
        barPercent: 100 - ((e.numericValue - best) / range) * 40,
      }));
    }
    const best = ranked[0].numericValue;
    const worst = ranked[ranked.length - 1].numericValue;
    const range = best - worst || 1;
    return ranked.map((e) => ({
      ...e,
      barPercent: 100 - ((best - e.numericValue) / range) * 40,
    }));
  }, [ranked, isSectorMetric]);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Metric selector chips + contextual description */}
      <div className="shrink-0 px-3 pt-2 pb-1.5">
        <div className="flex gap-1">
          {PACE_METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={cn(
                'flex-1 rounded-md py-1 text-center text-2xs font-bold uppercase tracking-wider transition-colors',
                metric === m.key
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {activeMetric && (
          <p className="mt-1 text-2xs text-muted-foreground">
            {activeMetric.description}
          </p>
        )}
      </div>

      {/* Ranked list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-1">
        {barData.length > 0 ? (
          barData.map((entry, i) => {
            const isLeader = i === 0;

            return (
              <div
                key={entry.row.driverNo}
                className={cn(
                  'group relative flex h-10 items-center gap-2 rounded-sm px-2 transition-colors hover:bg-foreground/5',
                  isQualifying && entry.row.isKnockedOut && 'opacity-40',
                )}
              >
                <div
                  className={cn(
                    'absolute inset-y-0.5 left-0 rounded-sm transition-all',
                    isLeader ? 'bg-violet-500/10' : 'bg-foreground/3',
                  )}
                  style={{ width: `${entry.barPercent}%` }}
                />

                <div className="relative flex w-full items-center">
                  {/* Col 1: Rank — fixed 20px */}
                  <span className={cn(
                    'w-5 shrink-0 text-right text-xs font-bold tabular-nums',
                    isLeader ? 'text-violet-500' : 'text-muted-foreground',
                  )}>
                    {i + 1}
                  </span>

                  {/* Col 2: Team color + TLA — fixed 52px */}
                  <div className="ml-2 flex w-13 shrink-0 items-center gap-1.5">
                    <div
                      className="h-4 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.row.teamColor }}
                    />
                    <span
                      className={cn(
                        'text-xs font-bold',
                        isQualifying && entry.row.isKnockedOut
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground'
                      )}
                    >
                      {entry.row.tla}
                    </span>
                  </div>

                  {/* Col 3: Color indicator — fixed 16px */}
                  <div className="ml-1.5 flex w-4 shrink-0 justify-center">
                    <div className={cn('size-1.5 rounded-full', DOT_COLOR[entry.color])} />
                  </div>

                  {/* Col 4: Value — right-aligned, fills remaining space */}
                  <span
                    className={cn(
                      'ml-auto text-right text-xs font-bold tabular-nums',
                      VALUE_COLOR[entry.color],
                    )}
                  >
                    {entry.value}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-muted-foreground">
              No data for this metric yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatMs(ms: number): string {
  const totalSeconds = ms / 1_000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  }
  return seconds.toFixed(3);
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <Gauge className="size-5 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground">
        Pace data will appear once drivers set lap times
      </p>
    </div>
  );
}
