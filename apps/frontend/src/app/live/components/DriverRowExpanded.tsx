'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { SectorBlock } from '@/app/live/components/SectorBlock';
import { TyreIcon } from '@/app/live/components/TyreIcon';
import { NO_POSITION } from '@/constants/numbers';
import type { UITimingRow, SectorColorClass } from '@/modules/timing/types';

const PLACEHOLDER = 'text-muted-foreground/20';

const LAP_COLOR: Record<SectorColorClass, string> = {
  purple: 'text-violet-500',
  green: 'text-emerald-500',
  yellow: 'text-foreground',
  none: 'text-muted-foreground',
};

interface DriverRowExpandedProps {
  row: UITimingRow;
}

export function DriverRowExpanded({ row }: DriverRowExpandedProps) {
  const hasPosition = row.position !== NO_POSITION;

  return (
    <div className="border-b border-border/20 bg-white/3 px-3 py-4">
      {/* Driver + Team identity */}
      <div className="mb-3 flex items-center gap-3">
        {row.driverImageUrl && (
          <div className="size-12 shrink-0 overflow-hidden rounded-full bg-black/20">
            <Image
              src={row.driverImageUrl}
              alt={`${row.firstName} ${row.lastName}`}
              width={96}
              height={96}
              className="h-full w-full object-cover object-top"
            />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-black text-foreground">
            {row.firstName} {row.lastName} {row.countryFlag}
          </span>
          <span className="text-2xs text-muted-foreground">{row.teamName}</span>
        </div>
        {row.carImageUrl && (
          <Image
            src={row.carImageUrl}
            alt={row.teamName}
            width={120}
            height={32}
            className="ml-auto h-8 w-auto shrink-0 object-contain"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Sectors */}
        <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-2">
          <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            Sectors
          </span>
          <div className="grid grid-cols-3 gap-2">
            {row.sectors.map((s, i) => (
              <SectorBlock key={i} sector={s} label={`S${i + 1}`} />
            ))}
          </div>
        </div>

        {/* Lap Times */}
        <div className="flex flex-col gap-2">
          <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            Lap Times
          </span>
          <div className="flex flex-col gap-1.5 rounded-md bg-white/5 p-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">Last Lap</span>
              <span
                className={cn(
                  'text-sm font-black tabular-nums',
                  row.lastLap ? LAP_COLOR[row.lastLapColor] : PLACEHOLDER
                )}
              >
                {row.lastLap || '0:00.000'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">Best Lap</span>
              <span
                className={cn(
                  'text-sm font-black tabular-nums',
                  row.bestLap ? 'text-foreground' : PLACEHOLDER
                )}
              >
                {row.bestLap || '0:00.000'}
              </span>
            </div>
            <div className="h-px bg-border/20" />
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">
                Gap to Leader
              </span>
              <span
                className={cn(
                  'text-xs font-bold tabular-nums',
                  row.gap ? 'text-foreground' : PLACEHOLDER
                )}
              >
                {row.gap ||
                  (hasPosition && row.position === 1 ? 'Leader' : '0.000')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">Interval</span>
              <span
                className={cn(
                  'text-xs font-bold tabular-nums',
                  row.interval
                    ? row.isCatching
                      ? 'text-emerald-400'
                      : 'text-foreground'
                    : PLACEHOLDER
                )}
              >
                {row.interval || '0.000'}
              </span>
            </div>
          </div>
        </div>

        {/* Race Info */}
        <div className="flex flex-col gap-2">
          <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            Race Info
          </span>
          <div className="flex flex-col gap-1.5 rounded-md bg-white/5 p-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">Position</span>
              <span
                className={cn(
                  'text-sm font-black tabular-nums',
                  hasPosition ? 'text-foreground' : PLACEHOLDER
                )}
              >
                {hasPosition ? `P${row.position}` : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">
                Laps Completed
              </span>
              <span
                className={cn(
                  'text-sm font-black tabular-nums',
                  row.numberOfLaps > 0 ? 'text-foreground' : PLACEHOLDER
                )}
              >
                {row.numberOfLaps}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">Pit Stops</span>
              <span
                className={cn(
                  'text-sm font-black tabular-nums',
                  row.numberOfPitStops > 0 ? 'text-foreground' : PLACEHOLDER
                )}
              >
                {row.numberOfPitStops}
              </span>
            </div>
            <div className="h-px bg-border/20" />
            <div className="flex items-center justify-between">
              <span className="text-2xs text-muted-foreground">
                Current Tyre
              </span>
              <div className="flex items-center gap-2">
                <TyreIcon compound={row.currentTyre} showAge={false} />
                <span className="text-xs font-bold tabular-nums text-muted-foreground">
                  {row.tyreAge} {row.tyreAge === 1 ? 'lap' : 'laps'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
