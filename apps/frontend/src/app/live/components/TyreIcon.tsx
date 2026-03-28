'use client';

import type { TyreCompound } from '@f1-telemetry/core';
import { cn } from '@/lib/utils';

const TYRE_CONFIG: Record<TyreCompound, { label: string; arc: string }> = {
  SOFT: { label: 'S', arc: 'text-red-500' },
  MEDIUM: { label: 'M', arc: 'text-yellow-500' },
  HARD: { label: 'H', arc: 'text-white' },
  INTERMEDIATE: { label: 'I', arc: 'text-green-500' },
  WET: { label: 'W', arc: 'text-blue-500' },
  UNKNOWN: { label: '?', arc: 'text-muted-foreground/60' },
};

const LEFT_ARC =
  'M70 19C40.6787 26.58 19 53.4792 19 85.5C19 117.521 40.6787 144.42 70 152';
const RIGHT_ARC =
  'M101 152C130.321 144.42 152 117.521 152 85.5C152 53.4792 130.321 26.58 101 19';

interface TyreIconProps {
  compound: TyreCompound;
  age?: number;
  isNew?: boolean;
  showAge?: boolean;
}

export function TyreIcon({
  compound,
  age = 0,
  isNew,
  showAge = true,
}: TyreIconProps) {
  const config = TYRE_CONFIG[compound];

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'relative flex size-7 shrink-0 items-center justify-center',
          config.arc
        )}
      >
        <svg
          viewBox="0 0 172 172"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          <circle cx="86" cy="86" r="86" className="fill-black" />
          <path
            d={LEFT_ARC}
            stroke="currentColor"
            strokeWidth="20"
            fill="none"
          />
          <path
            d={RIGHT_ARC}
            stroke="currentColor"
            strokeWidth="20"
            fill="none"
          />
        </svg>
        <span className="relative text-xs font-black text-white">
          {config.label}
        </span>
      </span>
      {showAge && (
        <span className="text-xs font-bold tabular-nums text-muted-foreground">
          {isNew && age === 0 ? 'NEW' : age}
        </span>
      )}
    </div>
  );
}
