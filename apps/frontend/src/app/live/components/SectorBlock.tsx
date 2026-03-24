'use client';

import { cn } from '@/lib/utils';
import { SegmentDots } from '@/app/live/components/SegmentDots';
import type { UISector } from '@/modules/timing/types';

const SECTOR_COLOR = {
  purple: 'text-violet-500',
  green: 'text-emerald-500',
  yellow: 'text-foreground',
  none: 'text-muted-foreground/30',
} as const;

interface SectorBlockProps {
  sector: UISector;
  label: string;
}

export function SectorBlock({ sector, label }: SectorBlockProps) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-white/5 p-2">
      <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-black tabular-nums',
          sector.value ? SECTOR_COLOR[sector.color] : SECTOR_COLOR.none
        )}
      >
        {sector.value || '0.000'}
      </span>
      {sector.previousValue ? (
        <span className="text-2xs tabular-nums text-muted-foreground">
          prev {sector.previousValue}
        </span>
      ) : (
        <span className="text-2xs text-muted-foreground/20">prev 0.000</span>
      )}
      <SegmentDots segments={sector.segments} />
    </div>
  );
}
