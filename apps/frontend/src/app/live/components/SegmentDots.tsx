'use client';

import { cn } from '@/lib/utils';
import type { SegmentColorClass } from '@/modules/timing/types';

const PLACEHOLDER_DOT_COUNT = 7;

const SEGMENT_CLASSES: Record<SegmentColorClass, string> = {
  purple: 'bg-purple-500',
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  none: 'bg-muted-foreground/30',
};

interface SegmentDotsProps {
  segments: SegmentColorClass[];
}

/** Row of micro-sector colored dots. Shows placeholder dots when no data. */
export function SegmentDots({ segments }: SegmentDotsProps) {
  const isEmpty = segments.length === 0;

  return (
    <div className="flex items-center gap-px">
      {isEmpty
        ? Array.from({ length: PLACEHOLDER_DOT_COUNT }, (_, i) => (
            <div
              key={i}
              className="size-2 rounded-full bg-muted-foreground/10"
            />
          ))
        : segments.map((color, i) => (
            <div
              key={i}
              className={cn('size-2 rounded-full', SEGMENT_CLASSES[color])}
            />
          ))}
    </div>
  );
}
