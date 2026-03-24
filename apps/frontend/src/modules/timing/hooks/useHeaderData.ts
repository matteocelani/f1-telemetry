import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RACE_SESSION_TYPES } from '@/modules/timing/constants';
import type { UIHeaderData, UIWeatherData } from '@/modules/timing/types';
import { useClock } from '@/store/clock';
import { useLapCount } from '@/store/lap-count';
import { useRaceControl } from '@/store/race-control';
import { useSession } from '@/store/session';
import { useWeather } from '@/store/weather';

/** Aggregates session, lap/timer, track status and weather into a single header object. */
export function useHeaderData(): UIHeaderData {
  const sessionInfo = useSession(useShallow((s) => s.sessionInfo));
  const lapCount = useLapCount(useShallow((s) => s.lapCount));
  const clock = useClock(useShallow((s) => s.clock));
  const trackStatus = useRaceControl(useShallow((s) => s.trackStatus));
  const rawWeather = useWeather(useShallow((s) => s.weather));

  return useMemo(() => {
    const sessionType = sessionInfo?.Type ?? '';
    const isRace = RACE_SESSION_TYPES.includes(
      sessionType as (typeof RACE_SESSION_TYPES)[number]
    );

    const meetingName = sessionInfo?.Meeting?.Name ?? '';
    const sessionName = sessionInfo?.Name
      ? `${meetingName} — ${sessionInfo.Name}`
      : meetingName || 'Waiting for session...';

    const lapText =
      lapCount ? `Lap ${lapCount.CurrentLap}/${lapCount.TotalLaps}` : null;

    const remainingTime = clock?.Remaining ?? null;

    let weather: UIWeatherData | null = null;
    if (rawWeather) {
      weather = {
        airTemp: parseFloat(rawWeather.AirTemp),
        trackTemp: parseFloat(rawWeather.TrackTemp),
        humidity: parseFloat(rawWeather.Humidity),
        isRaining: rawWeather.Rainfall === '1',
        windSpeed: parseFloat(rawWeather.WindSpeed),
        windDirection: parseFloat(rawWeather.WindDirection),
      };
    }

    return {
      sessionName,
      sessionType,
      isRace,
      lapText,
      remainingTime,
      trackStatus: trackStatus?.Status ?? null,
      trackStatusMessage: trackStatus?.Message ?? null,
      weather,
    };
  }, [sessionInfo, lapCount, clock, trackStatus, rawWeather]);
}
