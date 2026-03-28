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
