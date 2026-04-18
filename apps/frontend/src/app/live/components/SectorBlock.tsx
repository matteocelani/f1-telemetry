'use client';

import { SegmentDots } from '@/app/live/components/SegmentDots';
import { DEFAULT_SECTOR_TIME } from '@/constants/numbers';
import type { SectorColorClass, UISector } from '@/modules/timing/types';
import { cn } from '@/lib/utils';

const SECTOR_COLOR: Record<SectorColorClass, string> = {
  purple: 'text-violet-500',
  green: 'text-emerald-500',
  yellow: 'text-foreground',
  none: 'text-muted-foreground/30',
};

interface SectorBlockProps {
  sector: UISector;
  label: string;
}

export function SectorBlock({ sector, label }: SectorBlockProps) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-foreground/5 p-2">
      <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-black tabular-nums',
          sector.value ? SECTOR_COLOR[sector.color] : SECTOR_COLOR.none
        )}
      >
        {sector.value || DEFAULT_SECTOR_TIME}
      </span>
      {sector.previousValue ? (
        <span className="text-2xs tabular-nums text-muted-foreground">
          prev {sector.previousValue}
        </span>
      ) : (
        <span className="text-2xs text-muted-foreground/20">
          prev {DEFAULT_SECTOR_TIME}
        </span>
      )}
      <SegmentDots segments={sector.segments} />
    </div>
  );
}
