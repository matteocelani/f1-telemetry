export const F1_SERVER_URL = 'wss://livetiming.formula1.com/signalr';
export const F1_HUB_NAME = 'Streaming';

export const CHANNELS = {
  TELEMETRY: 'CarData.z',
  POSITION: 'Position.z',
  TIMING: 'TimingData',
  TRACK_STATUS: 'TrackStatus',
} as const;
