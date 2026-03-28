import { useMemo } from 'react';
import { NO_POSITION } from '@/constants/numbers';
import type { StrategyDriverRow, UIStint } from '@/modules/timing/types';
import { useLapCount } from '@/store/lap-count';
import { useTiming } from '@/store/timing';
import { useTimingApp } from '@/store/timing-app';

export function useStrategyRows(): {
  rows: StrategyDriverRow[];
  currentLap: number;
  totalLaps: number;
} {
  const timingLines = useTiming((s) => s.lines);
  const driverList = useTiming((s) => s.driverList);
  const appLines = useTimingApp((s) => s.lines);
  const lapCount = useLapCount((s) => s.lapCount);

  return useMemo(() => {
    const currentLap = lapCount?.CurrentLap ?? 0;
    const totalLaps = lapCount?.TotalLaps ?? 0;

    const rows: StrategyDriverRow[] = [];

    for (const [driverNo, driverInfo] of Object.entries(driverList)) {
      const timing = timingLines[driverNo];
      const app = appLines[driverNo];

      const position = timing?.Position
        ? parseInt(timing.Position, 10)
        : NO_POSITION;

      const rawStints = app?.Stints ?? [];

      const stints: UIStint[] = rawStints.map((s) => ({
        compound: s.Compound ?? 'UNKNOWN',
        isNew: Boolean(s.New),
        totalLaps: s.TotalLaps ?? 0,
        startLap: s.StartLaps ?? 0,
      }));

      rows.push({
        driverNo,
        position: isNaN(position) ? NO_POSITION : position,
        tla: driverInfo.Tla ?? driverNo,
        teamColor: driverInfo.TeamColour
          ? `#${driverInfo.TeamColour}`
          : '#666666',
        isInPit: Boolean(timing?.InPit),
        stints,
      });
    }

    rows.sort((a, b) => a.position - b.position);

    return { rows, currentLap, totalLaps };
  }, [timingLines, driverList, appLines, lapCount]);
}
