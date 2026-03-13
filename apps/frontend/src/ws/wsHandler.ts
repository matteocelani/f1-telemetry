import { CHANNELS, type ChannelValue } from '@f1-telemetry/core';
import type {
  TimingDataPayload,
  TimingAppDataPayload,
  PositionPayload,
  CarDataPayload,
  SessionInfoPayload,
  WeatherDataPayload,
  RaceControlMessagesPayload,
  TrackStatusPayload,
  DriverListPayload,
  CarTelemetry,
} from '@f1-telemetry/core';
import { useRaceControl } from '@/store/race-control';
import { useSession } from '@/store/session';
import { useTelemetry } from '@/store/telemetry';
import { useTiming } from '@/store/timing';
import { useTimingApp } from '@/store/timing-app';
import { useTrack } from '@/store/track';
import { useWeather } from '@/store/weather';

interface F1Frame {
  channel: ChannelValue;
  data: unknown;
}

// Normalise raw channel entries into typed CarTelemetry
function normaliseCarData(raw: CarDataPayload): Record<string, CarTelemetry> {
  const result: Record<string, CarTelemetry> = {};
  const latestEntry = raw.Entries[raw.Entries.length - 1];
  if (!latestEntry) return result;

  for (const [driverNo, car] of Object.entries(latestEntry.Cars)) {
    const ch = car.Channels;
    result[driverNo] = {
      rpm: ch['0'] ?? 0,
      speed: ch['2'] ?? 0,
      gear: ch['3'] ?? 0,
      throttle: ch['4'] ?? 0,
      brake: ch['5'] ?? 0,
      activeAero: ch['45'] ?? 0,
    };
  }
  return result;
}

/**
 * Dispatches a parsed F1 frame to the correct Zustand store.
 * Runs outside of React — uses getState() for zero re-render cost.
 */
export function dispatchToStores(frame: F1Frame): void {
  const { channel, data } = frame;

  switch (channel) {
    case CHANNELS.TIMING: {
      const payload = data as TimingDataPayload;
      useTiming.getState().updateLines(payload.Lines);
      break;
    }

    case CHANNELS.TIMING_APP_DATA: {
      const payload = data as TimingAppDataPayload;
      useTimingApp.getState().updateLines(payload.Lines);
      break;
    }

    case CHANNELS.TELEMETRY: {
      const payload = data as CarDataPayload;
      const normalised = normaliseCarData(payload);
      const store = useTelemetry.getState();
      for (const [driverNo, telem] of Object.entries(normalised)) {
        store.updateCar(driverNo, telem);
      }
      break;
    }

    case CHANNELS.POSITION: {
      const payload = data as PositionPayload;
      const latestPos = payload.Position[payload.Position.length - 1];
      if (latestPos) {
        useTrack.getState().updatePositions(latestPos.Entries);
      }
      break;
    }

    case CHANNELS.DRIVER_LIST: {
      const payload = data as DriverListPayload;
      useTiming.getState().setDriverList(payload);
      break;
    }

    case CHANNELS.SESSION_INFO: {
      const payload = data as SessionInfoPayload;
      useSession.getState().setSessionInfo(payload);
      break;
    }

    case CHANNELS.WEATHER_DATA: {
      const payload = data as WeatherDataPayload;
      useWeather.getState().setWeather(payload);
      break;
    }

    case CHANNELS.RACE_CONTROL_MESSAGES: {
      const payload = data as RaceControlMessagesPayload;
      useRaceControl.getState().appendMessages(payload.Messages);
      break;
    }

    case CHANNELS.TRACK_STATUS: {
      const payload = data as TrackStatusPayload;
      useRaceControl.getState().setTrackStatus(payload);
      break;
    }

    default:
      break;
  }
}

/**
 * Parses raw WS message string and delegates to dispatchToStores.
 * Protected by try/catch so a malformed frame never crashes the UI.
 */
export function handleF1Payload(rawData: string): void {
  const parsed = JSON.parse(rawData) as F1Frame | F1Frame[];

  if (Array.isArray(parsed)) {
    for (const frame of parsed) {
      dispatchToStores(frame);
    }
  } else {
    dispatchToStores(parsed);
  }
}
