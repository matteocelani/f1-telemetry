import type { TyreCompound, TrackStatusCode, SpeedEntry } from '@f1-telemetry/core';

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

// Context

export type CenterTab = 'map' | 'raceControl' | 'telemetry';

export interface LiveTimingContextType {
  isConnected: boolean;
  isLive: boolean;
  header: UIHeaderData;
  rows: UITimingRow[];
  selectedDriver: string | null;
  setSelectedDriver: (driverNo: string | null) => void;
  activeTab: CenterTab;
  setActiveTab: (tab: CenterTab) => void;
  isDetailedView: boolean;
  setDetailedView: (value: boolean) => void;
}
