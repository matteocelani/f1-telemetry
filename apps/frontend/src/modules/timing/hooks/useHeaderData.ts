import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RAINFALL_INDICATOR } from '@/constants/numbers';
import { RACE_SESSION_TYPES } from '@/modules/timing/constants';
import { useCountdown } from '@/modules/timing/hooks/useCountdown';
import type { UIHeaderData, UIWeatherData } from '@/modules/timing/types';
import { useLapCount } from '@/store/lap-count';
import { useRaceControl } from '@/store/race-control';
import { useSession } from '@/store/session';
import { useWeather } from '@/store/weather';

export function useHeaderData(): UIHeaderData {
  const sessionInfo = useSession(useShallow((s) => s.sessionInfo));
  const lapCount = useLapCount(useShallow((s) => s.lapCount));
  const remainingTime = useCountdown();
  const trackStatus = useRaceControl(useShallow((s) => s.trackStatus));
  const rawWeather = useWeather(useShallow((s) => s.weather));

  return useMemo(() => {
    const sessionType = sessionInfo?.Type ?? '';
    const isRace = RACE_SESSION_TYPES.includes(
      sessionType as (typeof RACE_SESSION_TYPES)[number]
    );

    const meetingName = sessionInfo?.Meeting?.Name ?? '';
    const sessionTypeName = sessionInfo?.Name ?? '';
    const countryCode = sessionInfo?.Meeting?.Country?.Code ?? '';

    const lapText =
      lapCount?.CurrentLap != null
        ? `${lapCount.CurrentLap}/${lapCount.TotalLaps ?? '—'}`
        : null;

    let weather: UIWeatherData | null = null;
    if (rawWeather) {
      weather = {
        airTemp: parseFloat(rawWeather.AirTemp),
        trackTemp: parseFloat(rawWeather.TrackTemp),
        humidity: parseFloat(rawWeather.Humidity),
        isRaining: rawWeather.Rainfall === RAINFALL_INDICATOR,
        windSpeed: parseFloat(rawWeather.WindSpeed),
        windDirection: parseFloat(rawWeather.WindDirection),
      };
    }

    return {
      meetingName,
      sessionTypeName,
      sessionType,
      countryCode,
      isRace,
      lapText,
      remainingTime,
      trackStatus: trackStatus?.Status ?? null,
      trackStatusMessage: trackStatus?.Message ?? null,
      weather,
    };
  }, [sessionInfo, lapCount, remainingTime, trackStatus, rawWeather]);
}
