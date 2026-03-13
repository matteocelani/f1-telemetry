'use client';

import { useCallback } from 'react';
import type { TyreCompound } from '@f1-telemetry/core';
import { DriverBadge } from '@/components/global/DriverBadge';
import { TeamColorLine } from '@/components/global/TeamColorLine';
import { cn } from '@/lib/utils';
import type { UITimingRow, SectorColorClass } from '@/modules/timing/types';

const TYRE_DISPLAY: Record<TyreCompound, { label: string; className: string }> =
  {
    SOFT: { label: 'S', className: 'bg-f1-tyre-soft text-white' },
    MEDIUM: { label: 'M', className: 'bg-f1-tyre-medium text-black' },
    HARD: { label: 'H', className: 'bg-f1-tyre-hard text-black' },
    INTERMEDIATE: { label: 'I', className: 'bg-f1-tyre-inter text-white' },
    WET: { label: 'W', className: 'bg-f1-tyre-wet text-white' },
    UNKNOWN: { label: '?', className: 'bg-muted text-muted-foreground' },
  };

const SECTOR_COLOR_CLASSES: Record<SectorColorClass, string> = {
  purple: 'text-f1-sector-purple',
  green: 'text-f1-sector-green',
  yellow: 'text-f1-sector-yellow',
  none: 'text-muted-foreground/40',
};

interface TimingTowerProps {
  rows: UITimingRow[];
  className?: string;
}

export function TimingTower({ rows, className }: TimingTowerProps) {
  const renderRow = useCallback((row: UITimingRow) => {
    const tyre = TYRE_DISPLAY[row.currentTyre];

    return (
      <div
        key={row.driverNo}
        className={cn(
          'grid grid-cols-[2.5rem_4px_3rem_1fr_3rem_4rem_4rem] items-center gap-2',
          'border-b border-border/20 py-1.5 px-3',
          'transition-colors hover:bg-foreground/5',
          row.isInPit && 'opacity-60',
          row.isKnockedOut && 'opacity-30 grayscale'
        )}
      >
        {/* Position */}
        <span className="text-right text-xs font-black tabular-nums text-muted-foreground/80">
          {row.position}
        </span>

        {/* Team Color Bar */}
        <TeamColorLine teamId={row.teamId} />

        {/* Driver TLA */}
        <DriverBadge
          tla={row.tla}
          teamId={row.teamId}
          imageUrl={row.imageUrl}
          className="truncate"
        />

        {/* Tyre + Pit Indicator */}
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full text-xs font-black shrink-0 shadow-sm',
              tyre.className
            )}
          >
            {tyre.label}
          </span>
          {row.tyreAge > 0 && (
            <span className="text-xs font-bold tabular-nums text-muted-foreground">
              {row.tyreAge}
            </span>
          )}
          {row.isInPit && (
            <span className="text-xs font-black uppercase text-f1-flag-yellow bg-f1-flag-yellow/10 px-1 rounded-sm">
              PIT
            </span>
          )}
        </div>

        {/* Sectors */}
        <div className="hidden items-center gap-1 lg:flex">
          {Object.entries(row.sectorColors).map(([idx, color]) => (
            <div
              key={idx}
              className={cn(
                'h-1.5 w-1.5 rounded-full bg-current',
                SECTOR_COLOR_CLASSES[color]
              )}
              title={`Sector ${parseInt(idx, 10) + 1}`}
            />
          ))}
        </div>

        {/* Gap to Leader */}
        <span className="text-right text-xs font-bold tabular-nums tracking-tight text-foreground/90">
          {row.gap || '—'}
        </span>

        {/* Interval to Ahead */}
        <span className="text-right text-xs font-bold tabular-nums tracking-tight text-muted-foreground/60">
          {row.interval || '—'}
        </span>
      </div>
    );
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col overflow-y-auto scrollbar-none bg-card/10',
        className
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 grid grid-cols-[2.5rem_4px_3rem_1fr_3rem_4rem_4rem] items-center gap-2 border-b border-border/40 bg-card/80 px-3 py-2.5 backdrop-blur-md">
        <span className="text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Pos
        </span>
        <span />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Driver
        </span>
        <span />
        <span className="hidden text-xs font-bold uppercase tracking-widest text-muted-foreground lg:block">
          Sectors
        </span>
        <span className="text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Gap
        </span>
        <span className="text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Int
        </span>
      </div>

      {/* Rows */}
      <div className="flex flex-col">{rows.map(renderRow)}</div>
    </div>
  );
}
