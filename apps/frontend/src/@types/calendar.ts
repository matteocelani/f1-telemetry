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
