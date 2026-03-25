'use client';

import type { TrackStatusCode } from '@f1-telemetry/core';
import { cn } from '@/lib/utils';

interface TrackStatusBadgeProps {
  status: TrackStatusCode;
  className?: string;
}

const STATUS_CONFIG: Record<
  TrackStatusCode,
  { label: string; bg: string; text: string; dot: string }
> = {
  '1': { label: 'GREEN', bg: 'bg-emerald-500/20', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  '2': { label: 'YELLOW', bg: 'bg-yellow-500/20', text: 'text-yellow-500', dot: 'bg-yellow-500' },
  '4': { label: 'SAFETY CAR', bg: 'bg-amber-500/20', text: 'text-amber-500', dot: 'bg-amber-500 animate-pulse' },
  '5': { label: 'RED FLAG', bg: 'bg-red-500/20', text: 'text-red-500', dot: 'bg-red-500 animate-pulse' },
  '6': { label: 'VSC', bg: 'bg-yellow-500/20', text: 'text-yellow-500', dot: 'bg-yellow-500 animate-pulse' },
  '7': { label: 'VSC ENDING', bg: 'bg-yellow-500/15', text: 'text-yellow-500', dot: 'bg-yellow-500' },
};

/** Colored badge with animated dot showing the current track flag status. */
export function TrackStatusBadge({ status, className }: TrackStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
