import type { TyreCompound, TrackStatusCode } from '@f1-telemetry/core';

// Track Map

export interface CircuitData {
  circuitId: string;
  name: string;
  viewBox: string;
  path: string;
  points: [number, number][];
  startOffset: number;
}

export interface DriverDotMeta {
  driverNo: string;
  tla: string;
  teamColor: string;
  inPit: boolean;
}

export interface TrackMapData {
  circuit: CircuitData | null;
  drivers: DriverDotMeta[];
  hasData: boolean;
  isSegmentMode: boolean;
  startPercent: number;
  projectAll: () => Record<string, number>;
}

export type SectorColorClass = 'purple' | 'green' | 'yellow' | 'none';

export type SegmentColorClass = 'purple' | 'green' | 'yellow' | 'red' | 'none';

export interface UISector {
  value: string;
  previousValue: string;
  color: SectorColorClass;
  segments: SegmentColorClass[];
}

export interface UITimingRow {
  driverNo: string;
  position: number;
  tla: string;
  firstName: string;
  lastName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  driverImageUrl: string;
  carImageUrl: string;
  countryFlag: string;
  gap: string;
  interval: string;
  isCatching: boolean;
  lastLap: string;
  lastLapColor: SectorColorClass;
  bestLap: string;
  sectors: UISector[];
  isInPit: boolean;
  isPitOut: boolean;
  isRetired: boolean;
  currentTyre: TyreCompound;
  isNewTyre: boolean;
  tyreAge: number;
  numberOfPitStops: number;
  numberOfLaps: number;
  isKnockedOut: boolean;
  speeds: UIDriverSpeeds;
  stintHistory: UIStint[];
}

export interface UISpeedEntry {
  value: string;
  color: SectorColorClass;
}

export interface UIDriverSpeeds {
  fl: UISpeedEntry;
  st: UISpeedEntry;
  i1: UISpeedEntry;
  i2: UISpeedEntry;
}

export interface UIStint {
  compound: TyreCompound;
  isNew: boolean;
  totalLaps: number;
  startLap: number;
}

export interface StrategyDriverRow {
  driverNo: string;
  position: number;
  tla: string;
  teamColor: string;
  isInPit: boolean;
  stints: UIStint[];
  // FIA B6.3.6: driver must use ≥2 dry-weather tyre specs during the race.
  hasMandatoryStop: boolean;
}

// Pace Radar

export type PaceMetricKey = 's1' | 's2' | 's3' | 'st' | 'fl';

export interface PaceMetricOption {
  key: PaceMetricKey;
  label: string;
  description: string;
}

export interface LapSnapshot {
  lapTimeMs: number;
  color: SectorColorClass;
  compound: TyreCompound;
}

// Header

export interface UIHeaderData {
  meetingName: string;
  sessionTypeName: string;
  sessionType: string;
  countryCode: string;
  isRace: boolean;
  lapText: string | null;
  remainingTime: string | null;
  trackStatus: TrackStatusCode | null;
  trackStatusMessage: string | null;
  weather: UIWeatherData | null;
}

export interface UIWeatherData {
  airTemp: number;
  trackTemp: number;
  humidity: number;
  isRaining: boolean;
  windSpeed: number;
  windDirection: number;
}

// Race Control

export type RCBadgeVariant =
  | 'yellow'
  | 'red'
  | 'green'
  | 'safetyCar'
  | 'chequered'
  | 'info';

export type RCIconVariant =
  | 'flag-red'
  | 'flag-yellow'
  | 'flag-green'
  | 'flag-chequered'
  | 'flag-bw'
  | 'siren'
  | 'none';

export interface UIRaceControlMessage {
  id: string;
  utc: string;
  lap: number | null;
  message: string;
  badge: RCBadgeVariant;
  badgeLabel: string;
  icon: RCIconVariant;
}

// Telemetry

export type TelemetrySeries = 'speed' | 'throttle' | 'brake' | 'rpm' | 'gear' | 'activeAero';

export interface TelemetrySeriesMeta {
  key: TelemetrySeries;
  label: string;
  description: string;
  color: string;
}

// Context

export type CenterTab = 'map' | 'raceControl' | 'telemetry';

export interface TimingRowsResult {
  rows: UITimingRow[];
  sessionPart: number;
  eliminationPos: number | null;
  isQualifying: boolean;
}

export interface LiveTimingContextType {
  isConnected: boolean;
  isLive: boolean;
  header: UIHeaderData;
  rows: UITimingRow[];
  sessionPart: number;
  eliminationPos: number | null;
  isQualifying: boolean;
  selectedDriver: string | null;
  setSelectedDriver: (driverNo: string | null) => void;
  activeTab: CenterTab;
  setActiveTab: (tab: CenterTab) => void;
  isDetailedView: boolean;
  setDetailedView: (value: boolean) => void;
}
