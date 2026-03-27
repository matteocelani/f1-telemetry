'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { SegmentDots } from '@/app/live/components/SegmentDots';
import { TyreIcon } from '@/app/live/components/TyreIcon';
import { NO_POSITION } from '@/constants/numbers';
import type { UITimingRow, SectorColorClass } from '@/modules/timing/types';

const GHOST = 'text-muted-foreground/15';

const TIME_COLOR: Record<SectorColorClass, string> = {
  purple: 'text-violet-500',
  green: 'text-emerald-500',
  yellow: 'text-foreground',
  none: 'text-muted-foreground',
};

const DOT_COLOR: Record<SectorColorClass, string> = {
  purple: 'bg-purple-500',
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-500',
  none: 'bg-muted-foreground/40',
};

interface DriverRowProps {
  row: UITimingRow;
  isExpanded: boolean;
  onToggle: () => void;
  detailed?: boolean;
}

export const DriverRow = memo(function DriverRow({
  row,
  isExpanded,
  onToggle,
  detailed,
}: DriverRowProps) {
  const isLeader = row.position === 1;
  const hasTimingData =
    row.position !== NO_POSITION ||
    row.lastLap !== '' ||
    row.bestLap !== '' ||
    row.sectors.some((s) => s.value !== '' || s.segments.length > 0);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full h-full min-h-9 max-h-16 items-center gap-3 border-b border-border/20 px-3',
        (detailed || false) && 'min-h-13',
        !detailed && 'xl:min-h-13',
        'transition-colors hover:bg-white/5 text-left',
        isExpanded && 'bg-white/5'
      )}
    >
      {/* POS */}
      <div className="flex w-8 shrink-0 items-center gap-1.5">
        <div
          className="w-1 h-7 rounded-sm shrink-0"
          style={{ backgroundColor: row.teamColor }}
        />
        <span
          className={cn(
            'text-base font-black tabular-nums',
            hasTimingData ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {row.position !== NO_POSITION ? row.position : '-'}
        </span>
      </div>

      {/* DRV */}
      <span
        className="w-12 shrink-0 rounded py-0.5 text-center text-xs font-black tracking-wider text-white"
        style={{ backgroundColor: row.teamColor }}
      >
        {row.tla}
      </span>

      {/* TYRE */}
      <div className={cn('w-16 shrink-0', !hasTimingData && 'opacity-30')}>
        <TyreIcon
          compound={row.currentTyre}
          age={row.tyreAge}
          isNew={row.isNewTyre}
        />
      </div>

      {/* INT — on mobile stacks gap below, on md+ gap has its own column */}
      <div className="min-w-20 flex-1 shrink-0 text-right">
        {!hasTimingData ? (
          <span className={cn('text-sm font-bold tabular-nums', GHOST)}>
            +0.000
          </span>
        ) : isLeader ? (
          <span className="text-sm font-bold tabular-nums text-muted-foreground">
            LEADER
          </span>
        ) : (
          <div className="flex flex-col items-end">
            <span
              className={cn(
                'text-sm font-bold tabular-nums leading-tight',
                row.isCatching ? 'text-emerald-400' : 'text-foreground'
              )}
            >
              {row.interval || row.gap || '0.000'}
            </span>
            {row.gap && row.interval && (
              <span className="text-xs tabular-nums leading-tight text-muted-foreground md:hidden">
                {row.gap}
              </span>
            )}
          </div>
        )}
      </div>

      {/* GAP — separate column, visible md → lg only */}
      <div className={cn('hidden min-w-16 flex-1 shrink-0 text-right md:block lg:hidden')}>
        {!hasTimingData ? (
          <span className={cn('text-sm font-bold tabular-nums', GHOST)}>
            +0.000
          </span>
        ) : isLeader ? (
          <span className="text-sm font-bold tabular-nums text-muted-foreground">
            —
          </span>
        ) : (
          <span className="text-sm font-bold tabular-nums text-muted-foreground">
            {row.gap || '0.000'}
          </span>
        )}
      </div>

      {/* LAST */}
      <div className="min-w-16 md:min-w-24 flex-1 shrink-0 text-right">
        <div className="flex flex-col items-end">
          <span
            className={cn(
              'text-sm font-bold tabular-nums leading-tight',
              !hasTimingData
                ? GHOST
                : row.lastLap
                  ? TIME_COLOR[row.lastLapColor]
                  : 'text-muted-foreground'
            )}
          >
            {hasTimingData ? row.lastLap || '0:00.000' : '0:00.000'}
          </span>
          <span
            className={cn(
              'hidden text-xs tabular-nums leading-tight md:block',
              hasTimingData ? 'text-muted-foreground' : GHOST
            )}
          >
            {hasTimingData ? row.bestLap || '0:00.000' : '0:00.000'}
          </span>
        </div>
      </div>

      {/* SECTOR macro dots: tablet only, hidden in detailed */}
      <div
        className={cn(
          'w-10 shrink-0 items-center justify-center gap-1.5',
          detailed ? 'hidden' : 'hidden md:flex xl:hidden'
        )}
      >
        {row.sectors.map((s, i) => (
          <div
            key={i}
            className={cn(
              'size-2.5 rounded-full',
              hasTimingData ? DOT_COLOR[s.color] : 'bg-muted-foreground/10'
            )}
          />
        ))}
      </div>

      {/* S1 / S2 / S3: desktop or detailed */}
      {row.sectors.map((s, i) => (
        <div
          key={i}
          className={cn(
            'min-w-24 flex-1 shrink-0 flex-col justify-center gap-0.5 border-l border-border/20 pl-3',
            detailed ? 'flex' : 'hidden xl:flex'
          )}
        >
          <span
            className={cn(
              'text-sm font-bold tabular-nums leading-none',
              !hasTimingData
                ? GHOST
                : s.value
                  ? TIME_COLOR[s.color]
                  : 'text-muted-foreground/30'
            )}
          >
            {s.value || '0.000'}
          </span>
          <span
            className={cn(
              'text-2xs tabular-nums',
              hasTimingData ? 'text-muted-foreground' : GHOST
            )}
          >
            {s.previousValue || '\u00A0'}
          </span>
          <SegmentDots segments={s.segments} />
        </div>
      ))}

      {/* LAPS / Status */}
      <div className="w-12 shrink-0 text-center">
        {!hasTimingData ? (
          <span className={cn('text-sm font-bold tabular-nums', GHOST)}>0</span>
        ) : row.isRetired ? (
          <span className="inline-block rounded px-1.5 py-0.5 text-xs font-black uppercase bg-red-900 text-red-300">
            RET
          </span>
        ) : row.isInPit ? (
          <span className="inline-block rounded px-1.5 py-0.5 text-xs font-black uppercase bg-red-500 text-white">
            PIT
          </span>
        ) : row.isPitOut ? (
          <span className="inline-block rounded px-1.5 py-0.5 text-xs font-black uppercase bg-emerald-500 text-white">
            OUT
          </span>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold tabular-nums text-foreground">
              {row.numberOfLaps}
            </span>
            {row.numberOfPitStops > 0 && (
              <span className="text-2xs tabular-nums text-muted-foreground">
                {row.numberOfPitStops}P
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
});
