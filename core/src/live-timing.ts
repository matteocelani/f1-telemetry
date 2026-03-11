/**
 * F1 Live Timing payload types.
 *
 * Derived from community reverse engineering of the F1 SignalR endpoint
 * (livetiming.formula1.com/signalr). No official schema is published by F1.
 *
 * See /docs/live-timing-types.md for field-by-field reference and maintenance notes.
 *
 * @see https://github.com/theOehrly/Fast-F1
 * @see https://openf1.org
 */

// CarData.z

/**
 * Numeric channel index to telemetry field mapping for CarData.z payloads.
 *
 * 2026 note: DRS (channel 45) is abolished. The new active aerodynamics system
 * (X-mode / Z-mode) is expected to use the same index, but the exact numeric
 * values are not yet confirmed by the community. Track the update at:
 * https://github.com/theOehrly/Fast-F1/issues
 */
export const CAR_CHANNELS = {
  RPM: '0',
  SPEED: '2',
  GEAR: '3',
  THROTTLE: '4',
  BRAKE: '5',
  /** Pre-2026: DRS. 2026+: active aerodynamics state — values TBD. */
  ACTIVE_AERO: '45',
} as const;

export type CarChannelKey = keyof typeof CAR_CHANNELS;

/**
 * Value of channel 45.
 * Pre-2026 known values: 0 = closed, 8 = detection zone, 10 = open, 14 = closing.
 * Kept as `number` until 2026 active aerodynamics values are confirmed.
 */
export type ActiveAeroStatus = number;

/** Normalised per-car telemetry after channel index mapping. */
export interface CarTelemetry {
  rpm: number;
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
  activeAero: ActiveAeroStatus;
}

/** Raw CarData.z structure after decompression. */
export interface CarDataPayload {
  Entries: Array<{
    Cars: Record<string, { Channels: Record<string, number> }>;
  }>;
}

/** Normalised telemetry keyed by driver racing number. */
export type CarDataFrame = Record<string, CarTelemetry>;

// Position.z

/** Single car position entry. Z is altitude and is typically broadcast as 0. */
export interface CarPosition {
  X: number;
  Y: number;
  Z: number;
}

/** Raw Position.z structure after decompression. */
export interface PositionPayload {
  Position: Array<{
    Timestamp: string;
    Entries: Record<string, CarPosition>;
  }>;
}

// TimingData

export interface LapTime {
  Value: string;
  PersonalFastest?: boolean;
  OverallFastest?: boolean;
}

export interface SectorTime {
  Value: string;
  PersonalFastest?: boolean;
  OverallFastest?: boolean;
  Stopped?: boolean;
}

export interface SpeedEntry {
  Value: string;
  PersonalFastest?: boolean;
  OverallFastest?: boolean;
}

/** Speed trap points: FL = Finish Line, ST = Speed Trap, I1/I2 = Intermediate sectors. */
export interface DriverSpeeds {
  FL?: SpeedEntry;
  ST?: SpeedEntry;
  I1?: SpeedEntry;
  I2?: SpeedEntry;
}

export interface DriverTiming {
  RacingNumber: string;
  Position: string;
  GapToLeader: string;
  IntervalToPositionAhead?: { Value: string; Catching?: boolean };
  BestLapTime: LapTime;
  LastLapTime: LapTime;
  /** Keyed by sector index "0", "1", "2". */
  Sectors: Record<string, SectorTime>;
  Speeds: DriverSpeeds;
  InPit: boolean;
  PitOut: boolean;
  NumberOfLaps?: number;
  NumberOfPitStops?: number;
  KnockedOut?: boolean;
  Cutoff?: boolean;
}

/** TimingData payload — only changed fields are sent; frontend must merge deltas. */
export interface TimingDataPayload {
  Lines: Record<string, DriverTiming>;
}

// TimingAppData

/** Tyre compound identifiers. UNKNOWN is used before the entry list is confirmed. */
export type TyreCompound =
  | 'SOFT'
  | 'MEDIUM'
  | 'HARD'
  | 'INTERMEDIATE'
  | 'WET'
  | 'UNKNOWN';

export interface StintData {
  LapFlags: number;
  Compound: TyreCompound;
  New: boolean;
  TyresNotChanged: boolean;
  TotalLaps: number;
  StartLaps: number;
}

export interface DriverAppData {
  RacingNumber: string;
  Line: number;
  GridPos: string;
  Position: string;
  Stints: StintData[];
}

/** Tyre compounds and stint history per driver. */
export interface TimingAppDataPayload {
  Lines: Record<string, DriverAppData>;
}

// TimingStats

export interface PersonalBest {
  Value: string;
  Position?: number;
  Lap?: number;
}

export interface DriverTimingStats {
  RacingNumber: string;
  PersonalBestLapTime?: PersonalBest;
  /** Keyed by sector index "0", "1", "2". */
  BestSectors: Record<string, PersonalBest>;
  /** Keyed by speed point: FL, ST, I1, I2. */
  BestSpeeds: Record<string, PersonalBest>;
}

/** Session-wide personal bests and speed trap statistics. */
export interface TimingStatsPayload {
  Lines: Record<string, DriverTimingStats>;
  SessionType: string;
}

// DriverList

/** Driver and team metadata for the session. Sent once at session start. */
export interface DriverInfo {
  RacingNumber: string;
  BroadcastName: string;
  FullName: string;
  Tla: string;
  Line: number;
  TeamName: string;
  /** Hex RGB colour string without leading #. */
  TeamColour: string;
  FirstName: string;
  LastName: string;
  /** ISO 3166-1 alpha-3 country code. */
  CountryCode: string;
  Reference?: string;
  HeadshotUrl?: string;
}

export interface DriverListPayload {
  [racingNumber: string]: DriverInfo;
}

// WeatherData

/** Live weather conditions. All values are strings — parse to float before use. */
export interface WeatherDataPayload {
  /** Air temperature in Celsius. */
  AirTemp: string;
  /** Relative humidity as a percentage. */
  Humidity: string;
  /** Atmospheric pressure in hPa. */
  Pressure: string;
  /** "0" = dry, "1" = rain detected. */
  Rainfall: string;
  /** Track surface temperature in Celsius. */
  TrackTemp: string;
  /** Wind direction in degrees (0–360). */
  WindDirection: string;
  /** Wind speed in m/s. */
  WindSpeed: string;
}

// RaceControlMessages

export type RaceControlCategory = 'Flag' | 'SafetyCar' | 'Drs' | 'Other';

export type FlagStatus =
  | 'GREEN'
  | 'YELLOW'
  | 'DOUBLE YELLOW'
  | 'RED'
  | 'CHEQUERED'
  | 'BLACK AND WHITE'
  | 'CLEAR';

export interface RaceControlMessage {
  Utc: string;
  Lap?: number;
  Category: RaceControlCategory;
  Message: string;
  Flag?: FlagStatus;
  Scope?: 'Track' | 'Sector' | 'Driver';
  Sector?: number;
  RacingNumber?: string;
  Status?: string;
}

export interface RaceControlMessagesPayload {
  Messages: RaceControlMessage[];
}

// TrackStatus

/**
 * Track status codes. Stable across seasons.
 * Matches FastF1's internal _track_status_mapping.
 */
export const TRACK_STATUS = {
  ALL_CLEAR: '1',
  YELLOW: '2',
  SC_DEPLOYED: '4',
  RED: '5',
  VSC_DEPLOYED: '6',
  VSC_ENDING: '7',
} as const;

export type TrackStatusCode = (typeof TRACK_STATUS)[keyof typeof TRACK_STATUS];

export interface TrackStatusPayload {
  Status: TrackStatusCode;
  Message: string;
}

// SessionInfo

export interface SessionInfoPayload {
  Meeting: {
    Name: string;
    OfficialName?: string;
    Circuit: { ShortName: string; Key?: number };
    Country?: { Name: string; Code: string };
  };
  Type: 'Practice' | 'Qualifying' | 'Race' | 'Sprint' | 'Sprint Qualifying';
  Name: string;
  StartDate: string;
  EndDate?: string;
  Path?: string;
}
