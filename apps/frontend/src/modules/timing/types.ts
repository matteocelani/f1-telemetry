import type { TyreCompound, TrackStatusCode } from '@f1-telemetry/core';

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

// Context

export type CenterTab = 'map' | 'telemetry' | 'raceControl';

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
