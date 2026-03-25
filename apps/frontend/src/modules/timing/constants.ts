import type { TrackStatusCode } from '@f1-telemetry/core';

// Telemetry limits
export const SECTOR_COUNT = 3;
export const MICRO_SECTOR_COUNT = 21;
export const MAX_DRIVERS = 22;
export const MAX_RPM = 13500;
export const MAX_SPEED_KMH = 370;
export const MAX_GEAR = 8;
export const THROTTLE_FULL = 100;
export const BRAKE_FULL = 100;

// Sentinel for drivers without a position yet
export const NO_POSITION = 999;

// Session type grouping
export const RACE_SESSION_TYPES = ['Race', 'Sprint'] as const;
export const TIMED_SESSION_TYPES = ['Practice', 'Qualifying', 'Sprint Qualifying'] as const;

// Time unit multipliers
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
export const GRACE_PERIOD_MS = 4 * MS_PER_HOUR;

// Placeholder dot count for micro-sectors when no data available
export const PLACEHOLDER_DOT_COUNT = 7;

// Short labels for mobile display
export const SESSION_SHORT: Record<string, string> = {
  'Practice 1': 'FP1',
  'Practice 2': 'FP2',
  'Practice 3': 'FP3',
  Qualifying: 'QUALI',
  'Sprint Qualifying': 'SQ',
  Sprint: 'SPRINT',
  Race: 'RACE',
} as const;

// ISO 3166-1 alpha-3 → alpha-2 for F1 host countries
export const ALPHA3_TO_ALPHA2: Record<string, string> = {
  ABU: 'AE', AUS: 'AU', AUT: 'AT', AZE: 'AZ', BHR: 'BH', BEL: 'BE',
  BRA: 'BR', CAN: 'CA', CHN: 'CN', ESP: 'ES', FRA: 'FR', GBR: 'GB',
  HUN: 'HU', ITA: 'IT', JPN: 'JP', KSA: 'SA', LAS: 'US', MEX: 'MX',
  MCO: 'MC', NED: 'NL', POR: 'PT', QAT: 'QA', SGP: 'SG', USA: 'US',
  RSA: 'ZA', MYS: 'MY', TUR: 'TR', KOR: 'KR', IND: 'IN', RUS: 'RU',
  DEU: 'DE', ARG: 'AR', SWE: 'SE',
} as const;

export const CRITICAL_TRACK_STATUSES: TrackStatusCode[] = ['4', '5', '6'];
