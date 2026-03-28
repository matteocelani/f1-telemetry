'use client';

import type { TrackStatusCode } from '@f1-telemetry/core';
import { cn } from '@/lib/utils';

interface TrackStatusBadgeProps {
  status: TrackStatusCode;
  className?: string;
}

const STATUS_CONFIG: Record<
  TrackStatusCode,
  { label: string; shortLabel: string; bg: string; text: string; dot: string }
> = {
  '1': {
    label: 'GREEN',
    shortLabel: 'GREEN',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-500',
    dot: 'bg-emerald-500',
  },
  '2': {
    label: 'YELLOW',
    shortLabel: 'YEL',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-500',
    dot: 'bg-yellow-500',
  },
  '4': {
    label: 'SAFETY CAR',
    shortLabel: 'SC',
    bg: 'bg-amber-500/20',
    text: 'text-amber-500',
    dot: 'bg-amber-500 animate-pulse',
  },
  '5': {
    label: 'RED FLAG',
    shortLabel: 'RED',
    bg: 'bg-red-500/20',
    text: 'text-red-500',
    dot: 'bg-red-500 animate-pulse',
  },
  '6': {
    label: 'VSC',
    shortLabel: 'VSC',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-500',
    dot: 'bg-yellow-500 animate-pulse',
  },
  '7': {
    label: 'VSC ENDING',
    shortLabel: 'VSC',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-500',
    dot: 'bg-yellow-500',
  },
};

export function TrackStatusBadge({ status, className }: TrackStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-extrabold uppercase tracking-wider',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', config.dot)} />
      <span className="hidden md:inline">{config.label}</span>
      <span className="md:hidden">{config.shortLabel}</span>
    </span>
  );
}
