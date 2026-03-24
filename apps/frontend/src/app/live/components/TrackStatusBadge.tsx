'use client';

import type { TrackStatusCode } from '@f1-telemetry/core';
import { cn } from '@/lib/utils';
import { TRACK_STATUS_CONFIG } from '@/modules/timing/constants';

interface TrackStatusBadgeProps {
  status: TrackStatusCode;
}

/** Colored badge displaying the current track flag status. */
export function TrackStatusBadge({ status }: TrackStatusBadgeProps) {
  const config = TRACK_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
