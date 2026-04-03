'use client';

import { useMemo, useState } from 'react';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TyreIcon } from '@/app/live/components/TyreIcon';
import { PACE_METRICS } from '@/modules/timing/constants';
import { useLiveTiming } from '@/modules/timing/hooks/useLiveTiming';
import type { PaceMetricKey, SectorColorClass } from '@/modules/timing/types';
import type { UITimingRow } from '@/modules/timing/types';

const VALUE_COLOR: Record<SectorColorClass, string> = {
  purple: 'text-violet-500',
  green: 'text-emerald-500',
  yellow: 'text-foreground',
  none: 'text-muted-foreground',
};

function getMetricValue(
  row: UITimingRow,
  metric: PaceMetricKey
): { value: string; numericValue: number; color: SectorColorClass } {
  if (metric === 's1' || metric === 's2' || metric === 's3') {
    const idx = metric === 's1' ? 0 : metric === 's2' ? 1 : 2;
    const sector = row.sectors[idx];
    if (!sector) return { value: '', numericValue: Infinity, color: 'none' };
    const num = parseFloat(sector.value);
    return {
      value: sector.value,
      numericValue: isNaN(num) ? Infinity : num,
      color: sector.color,
    };
  }

  const speed = row.speeds[metric];
  if (!speed) return { value: '', numericValue: -Infinity, color: 'none' };
  const num = parseFloat(speed.value);
  return {
    value: speed.value ? `${speed.value} km/h` : '',
    numericValue: isNaN(num) ? -Infinity : num,
    color: speed.color,
  };
}

interface PaceRadarProps {
  className?: string;
}

export function PaceRadar({ className }: PaceRadarProps) {
  const { rows } = useLiveTiming();
  const [metric, setMetric] = useState<PaceMetricKey>('s1');

  const hasData = rows.length > 0;
  const isSectorMetric = metric === 's1' || metric === 's2' || metric === 's3';
  const activeMetric = PACE_METRICS.find((m) => m.key === metric);

  const ranked = useMemo(() => {
    const entries = rows
      .filter((r) => !r.isRetired && !r.isKnockedOut)
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

    return entries;
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

  if (!hasData) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center gap-2 p-6 text-center', className)}>
        <Gauge className="size-5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">
          Pace data will appear once drivers set lap times
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Metric selector chips */}
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
            // Only rank #1 gets the purple treatment; F1 can mark multiple drivers as "overall best".
            const isOverallBest = i === 0;
            const isPersonalBest = !isOverallBest && entry.color === 'green';

            return (
              <div
                key={entry.row.driverNo}
                className={cn(
                  'group relative flex h-10 items-center gap-2 rounded-sm px-2 transition-colors hover:bg-foreground/5',
                  isOverallBest && 'bg-violet-500/5',
                  isPersonalBest && 'bg-emerald-500/5',
                )}
              >
                <div
                  className={cn(
                    'absolute inset-y-0.5 left-0 rounded-sm transition-all',
                    isOverallBest ? 'bg-violet-500/10' : 'bg-foreground/3',
                  )}
                  style={{ width: `${entry.barPercent}%` }}
                />

                <div className="relative flex w-full items-center gap-1.5">
                  {/* Rank */}
                  <span className={cn(
                    'w-4 shrink-0 text-right text-xs font-bold tabular-nums',
                    isOverallBest ? 'text-violet-500' : 'text-muted-foreground',
                  )}>
                    {i + 1}
                  </span>

                  {/* Team color + TLA */}
                  <div className="flex w-12 shrink-0 items-center gap-1">
                    <div
                      className="h-4 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.row.teamColor }}
                    />
                    <span
                      className={cn(
                        'text-xs font-bold',
                        'text-foreground'
                      )}
                    >
                      {entry.row.tla}
                    </span>
                  </div>

                  {/* Position badge */}
                  <span className="w-6 shrink-0 text-center text-2xs tabular-nums text-muted-foreground">
                    P{entry.row.position}
                  </span>

                  {/* Tyre compound */}
                  <div className="shrink-0 scale-75 origin-left">
                    <TyreIcon compound={entry.row.currentTyre} showAge={false} />
                  </div>

                  {/* Value — right-aligned */}
                  <span
                    className={cn(
                      'ml-auto text-right text-xs font-bold tabular-nums',
                      VALUE_COLOR[isOverallBest ? 'purple' : entry.color === 'purple' ? 'green' : entry.color],
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
