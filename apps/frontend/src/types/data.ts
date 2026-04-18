export interface RaceEntry {
  id: string;
  name: string;
  location: string;
  country: string;
  countryFlag: string;
  circuitKey: number;
  circuitName: string;
  round: number;
  isSprint: boolean;
  sessions: Record<string, string>;
}

export interface CircuitInfo {
  circuitId: string;
  path: string;
  viewBox: string;
}

export interface DriverMeta {
  driverNumber: string;
  tla: string;
  firstName: string;
  lastName: string;
  teamId: string;
  countryCode: string;
  countryFlag?: string;
  imageUrl?: string;
}

export type TeamsMap = Record<
  string,
  { colorHex: string; name: string; carImageUrl?: string }
>;
