export const F1_SERVER_URL = 'https://livetiming.formula1.com/signalr' as const;
export const F1_HUB_NAME = 'Streaming' as const;

export const CHANNELS = {
  TELEMETRY: 'CarData.z',
  POSITION: 'Position.z',
  TIMING: 'TimingData',
  TIMING_APP_DATA: 'TimingAppData',
  TIMING_STATS: 'TimingStats',
  TRACK_STATUS: 'TrackStatus',
  SESSION_INFO: 'SessionInfo',
  DRIVER_LIST: 'DriverList',
  WEATHER_DATA: 'WeatherData',
  RACE_CONTROL_MESSAGES: 'RaceControlMessages',
} as const;

export type ChannelKey = keyof typeof CHANNELS;
export type ChannelValue = (typeof CHANNELS)[ChannelKey];
