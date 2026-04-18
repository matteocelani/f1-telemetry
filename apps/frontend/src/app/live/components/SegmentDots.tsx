'use client';

import { PLACEHOLDER_DOT_COUNT } from '@/constants/numbers';
import type { SegmentColorClass } from '@/modules/timing/types';
import { cn } from '@/lib/utils';

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
