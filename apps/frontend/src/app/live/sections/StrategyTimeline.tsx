'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  COMPOUND_BG,
  COMPOUND_LABEL,
  DEFAULT_TOTAL_LAPS,
  MIN_STINT_LABEL_WIDTH_PERCENT,
} from '@/modules/timing/constants';
import { useStrategyRows } from '@/modules/timing/hooks/useStrategyRows';
import type { StrategyDriverRow, UIStint } from '@/modules/timing/types';

interface StrategyTimelineProps {
  className?: string;
}

export function StrategyTimeline({ className }: StrategyTimelineProps) {
  const { rows, currentLap, totalLaps } = useStrategyRows();

  const raceLaps = totalLaps > 0 ? totalLaps : DEFAULT_TOTAL_LAPS;
  const hasData = rows.length > 0 && currentLap > 0;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {hasData ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1.5">
          <div className="flex flex-col gap-1">
            {rows.map((row) => (
              <DriverStintRow
                key={row.driverNo}
                row={row}
                raceLaps={raceLaps}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

interface DriverStintRowProps {
  row: StrategyDriverRow;
  raceLaps: number;
}

function DriverStintRow({ row, raceLaps }: DriverStintRowProps) {
  const blocks = useMemo(
    () => buildStintBlocks(row.stints, raceLaps),
    [row.stints, raceLaps]
  );

  return (
    <div className="flex items-center gap-1">
      {/* Team color bar */}
      <div
        className="h-5 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: row.teamColor }}
      />

      {/* Driver TLA — fixed width for column alignment */}
      <span className="w-8 shrink-0 text-2xs font-bold tabular-nums text-foreground">
        {row.tla}
      </span>

      {/* Mandatory stop dot — fixed column so all dots align vertically */}
      <div className="flex w-3 shrink-0 items-center justify-center">
        {row.hasMandatoryStop && (
          <div
            className="size-1.5 rounded-full bg-amber-500"
            title="Must pit: needs 2 different dry-weather tyre specs (FIA B6.3.6)"
          />
        )}
      </div>

      {/* Timeline bar */}
      <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-muted/40">
        {blocks.map((block, i) => (
          <StintBlock
            key={i}
            block={block}
            isFirst={i === 0}
            isLast={i === blocks.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface StintBlockData {
  compound: string;
  label: string;
  bgClass: string;
  isNew: boolean;
  leftPercent: number;
  widthPercent: number;
  totalLaps: number;
}

interface StintBlockProps {
  block: StintBlockData;
  isFirst: boolean;
  isLast: boolean;
}

function StintBlock({ block, isFirst, isLast }: StintBlockProps) {
  if (block.widthPercent <= 0) return null;

  return (
    <div
      className={cn(
        'absolute top-0 h-full flex items-center justify-center border-r border-background/60',
        block.bgClass,
        !block.isNew && 'opacity-70',
        isFirst && 'rounded-l-sm',
        isLast && 'rounded-r-sm border-r-0',
      )}
      style={{
        left: `${block.leftPercent}%`,
        width: `${block.widthPercent}%`,
      }}
      title={`${block.compound}${block.isNew ? ' (New)' : ' (Used)'}`}
    >
      {block.widthPercent > MIN_STINT_LABEL_WIDTH_PERCENT && (
        <span className="text-2xs font-black text-black/70 select-none">
          {block.label} {block.totalLaps}
        </span>
      )}
    </div>
  );
}

function buildStintBlocks(
  stints: UIStint[],
  raceLaps: number
): StintBlockData[] {
  if (raceLaps <= 0) return [];

  return stints.map((stint) => {
    const leftPercent = (stint.startLap / raceLaps) * 100;
    const widthPercent = (stint.totalLaps / raceLaps) * 100;

    return {
      compound: stint.compound,
      label: COMPOUND_LABEL[stint.compound] ?? '?',
      bgClass: COMPOUND_BG[stint.compound] ?? 'bg-muted-foreground',
      isNew: stint.isNew,
      leftPercent: Math.max(0, leftPercent),
      widthPercent: Math.max(0, Math.min(widthPercent, 100 - leftPercent)),
      totalLaps: stint.totalLaps,
    };
  });
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="flex gap-1">
        <div className="size-3 rounded-full bg-red-500/40" />
        <div className="size-3 rounded-full bg-yellow-500/40" />
        <div className="size-3 rounded-full bg-white/40" />
      </div>
      <p className="text-xs text-muted-foreground">
        Strategy data will appear once the race starts
      </p>
    </div>
  );
}
