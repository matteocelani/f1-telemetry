import type { TelemetrySeries, TelemetrySeriesMeta } from '@/modules/timing/types';

// Telemetry series

export const MAX_VISIBLE_SERIES = 4;

export const TELEMETRY_SERIES_META = [
  { key: 'speed' as TelemetrySeries, label: 'Speed', description: 'Vehicle speed (km/h)', color: '#3b82f6' },
  { key: 'throttle' as TelemetrySeries, label: 'Throttle', description: 'Throttle input (0–100%)', color: '#22c55e' },
  { key: 'brake' as TelemetrySeries, label: 'Brake', description: 'Brake pressure (0–100%)', color: '#ef4444' },
  { key: 'rpm' as TelemetrySeries, label: 'RPM', description: 'Engine RPM', color: '#f59e0b' },
  { key: 'gear' as TelemetrySeries, label: 'Gear', description: 'Current gear (1–8)', color: '#a855f7' },
  { key: 'activeAero' as TelemetrySeries, label: 'Aero', description: '0 Corner · 1 Straight · 2 Overtake', color: '#06b6d4' },
] as const satisfies readonly TelemetrySeriesMeta[];

export const SERIES_COLORS = Object.fromEntries(
  TELEMETRY_SERIES_META.map((s) => [s.key, s.color])
) as Record<TelemetrySeries, string>;

// Session type grouping
export const RACE_SESSION_TYPES = ['Race', 'Sprint'] as const;
export const TIMED_SESSION_TYPES = ['Practice', 'Qualifying', 'Sprint Qualifying'] as const;
export const QUALIFYING_SESSION_TYPES = ['Qualifying', 'Sprint Qualifying'] as const;

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
