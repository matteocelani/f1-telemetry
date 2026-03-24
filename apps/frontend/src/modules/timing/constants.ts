import type { TrackStatusCode } from '@f1-telemetry/core';

export const SECTOR_COUNT = 3;
export const MICRO_SECTOR_COUNT = 21;
export const MAX_DRIVERS = 22;
export const MAX_RPM = 13500;
export const MAX_SPEED_KMH = 370;
export const MAX_GEAR = 8;
export const THROTTLE_FULL = 100;
export const BRAKE_FULL = 100;

export const RACE_SESSION_TYPES = ['Race', 'Sprint'] as const;
export const TIMED_SESSION_TYPES = ['Practice', 'Qualifying', 'Sprint Qualifying'] as const;

export const TRACK_STATUS_CONFIG: Record<
  TrackStatusCode,
  { label: string; className: string }
> = {
  '1': { label: 'GREEN', className: 'bg-emerald-500 text-white' },
  '2': { label: 'YELLOW', className: 'bg-yellow-500 text-black' },
  '4': { label: 'SAFETY CAR', className: 'bg-amber-500 text-black' },
  '5': { label: 'RED FLAG', className: 'bg-red-600 text-white' },
  '6': { label: 'VSC', className: 'bg-yellow-600 text-black' },
  '7': { label: 'VSC ENDING', className: 'bg-yellow-500/70 text-black' },
} as const;

export const CRITICAL_TRACK_STATUSES: TrackStatusCode[] = ['4', '5', '6'];
