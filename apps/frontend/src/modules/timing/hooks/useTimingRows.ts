import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SEGMENT_STATUS } from '@f1-telemetry/core';
import type { SectorTime, StintData } from '@f1-telemetry/core';
import driversData from '@/data/drivers.json';
import teamsData from '@/data/teams.json';
import type {
  UITimingRow,
  UISector,
  SectorColorClass,
  SegmentColorClass,
} from '@/modules/timing/types';
import { useTiming } from '@/store/timing';
import { useTimingApp } from '@/store/timing-app';
import type { DriverMeta, TeamsMap } from '@/types/data';

const staticDrivers = driversData as unknown as DriverMeta[];
const teams = teamsData as unknown as TeamsMap;

const SECTOR_INDICES = ['0', '1', '2'] as const;
const EMPTY_SECTOR: UISector = { value: '', previousValue: '', color: 'none', segments: [] };
const NO_POSITION = 999;

function resolveSectorColor(
  value: string | undefined,
  isPersonalBest: boolean | undefined,
  isOverallBest: boolean | undefined
): SectorColorClass {
  if (!value) return 'none';
  if (isOverallBest) return 'purple';
  if (isPersonalBest) return 'green';
  return 'yellow';
}

function resolveSegmentColor(status: number): SegmentColorClass {
  switch (status) {
    case SEGMENT_STATUS.PURPLE:
      return 'purple';
    case SEGMENT_STATUS.GREEN:
      return 'green';
    case SEGMENT_STATUS.YELLOW:
      return 'yellow';
    case SEGMENT_STATUS.STOPPED:
      return 'red';
    default:
      return 'none';
  }
}

function buildSector(sector: SectorTime | undefined): UISector {
  if (!sector) return EMPTY_SECTOR;

  const color = resolveSectorColor(
    sector.Value,
    sector.PersonalFastest,
    sector.OverallFastest
  );

  const segments: SegmentColorClass[] = [];
  if (sector.Segments) {
    const keys = Object.keys(sector.Segments).sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10)
    );
    for (const key of keys) {
      segments.push(resolveSegmentColor(sector.Segments[key].Status));
    }
  }

  return {
    value: sector.Value ?? '',
    previousValue: sector.PreviousValue ?? '',
    color,
    segments,
  };
}

// Merges driverList + timing into sorted UI rows. Skeleton state until data arrives.
export function useTimingRows(): UITimingRow[] {
  const lines = useTiming(useShallow((s) => s.lines));
  const driverList = useTiming(useShallow((s) => s.driverList));
  const appLines = useTimingApp(useShallow((s) => s.lines));

  return useMemo(() => {
    // Always start from static drivers (22 entries) so the list is complete on first render
    const allDriverNos = new Set(staticDrivers.map((d) => d.driverNumber));
    for (const no of Object.keys(driverList)) allDriverNos.add(no);
    for (const no of Object.keys(lines)) allDriverNos.add(no);

    const rows: UITimingRow[] = [];

    for (const driverNo of allDriverNos) {
      const timing = lines[driverNo];
      const wsDriver = driverList[driverNo];
      const staticDriver = staticDrivers.find(
        (d) => d.driverNumber === driverNo
      );
      const appData = appLines[driverNo];

      const tla = wsDriver?.Tla ?? staticDriver?.tla ?? driverNo;
      const teamId = staticDriver?.teamId ?? 'unknown';
      const teamColor = wsDriver?.TeamColour
        ? `#${wsDriver.TeamColour}`
        : (teams[teamId]?.colorHex ?? '#888888');

      // Stints arrives as a keyed object from the WS delta merge, not a true array.
      const stintsRaw = appData?.Stints as unknown as Record<string, StintData> | undefined;
      const lastStintKey = stintsRaw ? Object.keys(stintsRaw).sort((a, b) => Number(b) - Number(a))[0] : undefined;
      const lastStint = lastStintKey !== undefined ? stintsRaw?.[lastStintKey] : undefined;

      const rawPosition = timing ? parseInt(timing.Position, 10) : NaN;
      const hasPosition = !isNaN(rawPosition) && rawPosition > 0;

      const sectors = timing
        ? SECTOR_INDICES.map((idx) => buildSector(timing.Sectors?.[idx]))
        : [EMPTY_SECTOR, EMPTY_SECTOR, EMPTY_SECTOR];

      const lastLapColor = timing
        ? resolveSectorColor(
            timing.LastLapTime?.Value,
            timing.LastLapTime?.PersonalFastest,
            timing.LastLapTime?.OverallFastest
          )
        : 'none';

      rows.push({
        driverNo,
        position: hasPosition ? rawPosition : NO_POSITION,
        tla,
        firstName: wsDriver?.FirstName ?? staticDriver?.firstName ?? '',
        lastName: wsDriver?.LastName ?? staticDriver?.lastName ?? '',
        teamId,
        teamName: teams[teamId]?.name ?? '',
        teamColor,
        driverImageUrl: staticDriver?.imageUrl ?? '',
        carImageUrl: teams[teamId]?.carImageUrl ?? '',
        countryFlag: staticDriver?.countryFlag ?? '',
        gap: timing?.GapToLeader ?? '',
        interval: timing?.IntervalToPositionAhead?.Value ?? '',
        isCatching: timing?.IntervalToPositionAhead?.Catching ?? false,
        lastLap: timing?.LastLapTime?.Value ?? '',
        lastLapColor,
        bestLap: timing?.BestLapTime?.Value ?? '',
        sectors,
        isInPit: timing?.InPit ?? false,
        isPitOut: timing?.PitOut ?? false,
        isRetired: timing?.Retired ?? false,
        currentTyre: lastStint?.Compound ?? 'UNKNOWN',
        isNewTyre: lastStint?.New ?? false,
        tyreAge: lastStint?.TotalLaps ?? 0,
        numberOfPitStops: timing?.NumberOfPitStops ?? 0,
        numberOfLaps: timing?.NumberOfLaps ?? 0,
        isKnockedOut: timing?.KnockedOut ?? false,
      });
    }

    return rows.sort((a, b) => {
      // Position is king when available
      if (a.position !== NO_POSITION && b.position !== NO_POSITION) return a.position - b.position;
      if (a.position !== NO_POSITION) return -1;
      if (b.position !== NO_POSITION) return 1;
      // Both without position: drivers with any timing data come first
      const aHasData = a.lastLap !== '' || a.bestLap !== '' || a.sectors.some((s) => s.value !== '');
      const bHasData = b.lastLap !== '' || b.bestLap !== '' || b.sectors.some((s) => s.value !== '');
      if (aHasData !== bHasData) return aHasData ? -1 : 1;
      // Stable fallback by TLA
      return a.tla.localeCompare(b.tla);
    });
  }, [lines, driverList, appLines]);
}
