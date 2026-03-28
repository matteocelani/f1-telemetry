export const F1_SERVER_URL = 'https://livetiming.formula1.com/signalr' as const;
export const F1_HUB_NAME = 'Streaming' as const;

export const CHANNELS = {
  TELEMETRY: 'CarData.z',
  POSITION: 'Position.z',
  TIMING: 'TimingData',
  TIMING_F1: 'TimingDataF1',
  TIMING_APP_DATA: 'TimingAppData',
  TIMING_STATS: 'TimingStats',
  TRACK_STATUS: 'TrackStatus',
  SESSION_INFO: 'SessionInfo',
  DRIVER_LIST: 'DriverList',
  WEATHER_DATA: 'WeatherData',
  RACE_CONTROL_MESSAGES: 'RaceControlMessages',
  EXTRAPOLATED_CLOCK: 'ExtrapolatedClock',
  LAP_COUNT: 'LapCount',
  SESSION_DATA: 'SessionData',
  HEARTBEAT: 'Heartbeat',
} as const;

export type ChannelKey = keyof typeof CHANNELS;
export type ChannelValue = (typeof CHANNELS)[ChannelKey];

// Excludes Heartbeat and WeatherData which F1 may broadcast between sessions.
export const SESSION_ACTIVITY_CHANNELS: ReadonlySet<string> = new Set<ChannelValue>([
  CHANNELS.TIMING_F1,
  CHANNELS.TIMING,
  CHANNELS.DRIVER_LIST,
  CHANNELS.SESSION_INFO,
  CHANNELS.EXTRAPOLATED_CLOCK,
]);
