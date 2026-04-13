import type { TrackStatusCode } from '@f1-telemetry/core';

// Time — seconds
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const SECONDS_PER_HOUR = 3_600;

// Time — milliseconds
export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
export const GRACE_PERIOD_MS = 4 * MS_PER_HOUR;
export const SESSION_ENDED_THRESHOLD_MS = 2 * MS_PER_HOUR;
export const TICK_INTERVAL_MS = 100;
export const ACTIVITY_TIMEOUT_MS = 90 * MS_PER_SECOND;
export const TOAST_CRITICAL_DURATION_MS = 8_000;
export const TOAST_WARNING_DURATION_MS = 6_000;

// Telemetry limits
export const SECTOR_COUNT = 3;
export const MICRO_SECTOR_COUNT = 21;
export const MAX_DRIVERS = 22;
export const MAX_RPM = 13_500;
export const MAX_SPEED_KMH = 370;
export const MAX_GEAR = 8;
export const THROTTLE_FULL = 100;
export const BRAKE_FULL = 100;

// Sentinels and defaults
export const NO_POSITION = 999;
export const PLACEHOLDER_DOT_COUNT = 7;
export const TIMER_PLACEHOLDER = '00:00:00';
export const DEFAULT_SECTOR_TIME = '0.000';
export const RAINFALL_INDICATOR = '1';

// Unicode — offset to convert ASCII A-Z into regional indicator symbols
export const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 65;

// Intl formatting
export const INTL_LOCALE = 'en';
export const WEATHER_FRACTION_DIGITS = 1;

// Animation durations (seconds, for framer-motion)
export const ROW_LAYOUT_DURATION = 0.3;
export const ROW_EXPAND_DURATION = 0.2;

// Track statuses that trigger critical UI alerts
export const CRITICAL_TRACK_STATUSES: TrackStatusCode[] = ['4', '5', '6'];
