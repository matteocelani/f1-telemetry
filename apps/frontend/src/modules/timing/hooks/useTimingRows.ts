import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { DriverMeta } from '@/types/data';
import driversData from '@/data/drivers.json';
import type { UITimingRow, SectorColorClass } from '@/modules/timing/types';
import { useTiming } from '@/store/timing';
import { useTimingApp } from '@/store/timing-app';

const staticDrivers = driversData as unknown as DriverMeta[];

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

/**
 * Transforms raw store state into sorted, UI-ready timing rows.
 * Uses useMemo on the store slices for memoized recalculation.
 */
export function useTimingRows(): UITimingRow[] {
  const lines = useTiming(useShallow((s) => s.lines));
  const driverList = useTiming(useShallow((s) => s.driverList));
  const appLines = useTimingApp(useShallow((s) => s.lines));

  return useMemo(() => {
    const rows: UITimingRow[] = [];

    for (const [driverNo, timing] of Object.entries(lines)) {
      const wsDriver = driverList[driverNo];
      const staticDriver = staticDrivers.find(
        (d) => d.driverNumber === driverNo
      );
      const appData = appLines[driverNo];

      const tla = wsDriver?.Tla ?? staticDriver?.tla ?? driverNo;
      const teamId = staticDriver?.teamId ?? 'unknown';

      const lastStint = appData?.Stints?.[appData.Stints.length - 1];

      const sectorColors: Record<string, SectorColorClass> = {};
      if (timing.Sectors) {
        for (const [idx, sector] of Object.entries(timing.Sectors)) {
          sectorColors[idx] = resolveSectorColor(
            sector.Value,
            sector.PersonalFastest,
            sector.OverallFastest
          );
        }
      }

      rows.push({
        driverNo,
        position: parseInt(timing.Position, 10) || 0,
        tla,
        firstName: wsDriver?.FirstName ?? staticDriver?.firstName ?? '',
        lastName: wsDriver?.LastName ?? staticDriver?.lastName ?? '',
        teamId,
        imageUrl: staticDriver?.imageUrl,
        gap: timing.GapToLeader ?? '',
        interval: timing.IntervalToPositionAhead?.Value ?? '',
        lastLap: timing.LastLapTime?.Value ?? '',
        bestLap: timing.BestLapTime?.Value ?? '',
        sectorColors,
        isInPit: timing.InPit ?? false,
        isPitOut: timing.PitOut ?? false,
        currentTyre: lastStint?.Compound ?? 'UNKNOWN',
        tyreAge: lastStint?.TotalLaps ?? 0,
        numberOfPitStops: timing.NumberOfPitStops ?? 0,
        numberOfLaps: timing.NumberOfLaps ?? 0,
        isKnockedOut: timing.KnockedOut ?? false,
      });
    }

    return rows.sort((a, b) => a.position - b.position);
  }, [lines, driverList, appLines]);
}
