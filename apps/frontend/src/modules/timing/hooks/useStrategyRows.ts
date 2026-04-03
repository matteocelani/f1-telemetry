import { useMemo, useRef } from 'react';
import { NO_POSITION } from '@/constants/numbers';
import driversData from '@/data/drivers.json';
import { MIN_PIT_CONFIRM_LAPS } from '@/modules/timing/constants';
import type { StrategyDriverRow, UIStint } from '@/modules/timing/types';
import { useLapCount } from '@/store/lap-count';
import { useTiming } from '@/store/timing';
import { useTimingApp } from '@/store/timing-app';

const DRIVER_TLA_MAP = new Map(
  driversData.map((d) => [d.driverNumber, d.tla])
);

// Extracts only Position and InPit per driver; stabilizes the reference so
// high-frequency timing updates (gaps, sectors) don't trigger stint re-renders.
function usePositionMap(): Record<string, { position: number; isInPit: boolean }> {
  const timingLines = useTiming((s) => s.lines);
  const prevRef = useRef<Record<string, { position: number; isInPit: boolean }>>({});

  return useMemo(() => {
    const next: Record<string, { position: number; isInPit: boolean }> = {};
    let hasChanged = false;

    for (const [driverNo, timing] of Object.entries(timingLines)) {
      const pos = timing.Position ? parseInt(timing.Position, 10) : NO_POSITION;
      const position = isNaN(pos) ? NO_POSITION : pos;
      const isInPit = Boolean(timing.InPit);
      next[driverNo] = { position, isInPit };

      const prev = prevRef.current[driverNo];
      if (!prev || prev.position !== position || prev.isInPit !== isInPit) {
        hasChanged = true;
      }
    }

    if (Object.keys(prevRef.current).length !== Object.keys(next).length) {
      hasChanged = true;
    }

    if (!hasChanged) return prevRef.current;
    prevRef.current = next;
    return next;
  }, [timingLines]);
}

export function useStrategyRows(): {
  rows: StrategyDriverRow[];
  currentLap: number;
  totalLaps: number;
} {
  const positionMap = usePositionMap();
  const driverList = useTiming((s) => s.driverList);
  const appLines = useTimingApp((s) => s.lines);
  const lapCount = useLapCount((s) => s.lapCount);

  return useMemo(() => {
    const currentLap = lapCount?.CurrentLap ?? 0;
    const totalLaps = lapCount?.TotalLaps ?? 0;

    const rows: StrategyDriverRow[] = [];

    for (const [driverNo, driverInfo] of Object.entries(driverList)) {
      const pos = positionMap[driverNo];
      const app = appLines[driverNo];

      const rawStints = app?.Stints ?? [];

      // F1 sends StartLaps=0 for every stint; compute start positions cumulatively.
      let cumulativeStart = 0;
      const stints: UIStint[] = rawStints.map((s) => {
        const startLap = cumulativeStart;
        cumulativeStart += s.TotalLaps ?? 0;
        return {
          compound: s.Compound ?? 'UNKNOWN',
          isNew: Boolean(s.New),
          totalLaps: s.TotalLaps ?? 0,
          startLap,
        };
      });

      // FIA B6.3.6: must use ≥2 different dry-weather specs (wet/inter don't count).
      const dryCompounds = new Set(
        stints
          .map((s) => s.compound)
          .filter((c) => c !== 'INTERMEDIATE' && c !== 'WET' && c !== 'UNKNOWN')
      );
      const hasMandatoryStop = dryCompounds.size < 2;

      rows.push({
        driverNo,
        position: pos?.position ?? NO_POSITION,
        tla: driverInfo.Tla ?? DRIVER_TLA_MAP.get(driverNo) ?? driverNo,
        teamColor: driverInfo.TeamColour
          ? `#${driverInfo.TeamColour}`
          : '#666666',
        // F1 sometimes sends InPit:true but never the corresponding false.
        // If the active stint has ≥2 laps, the driver is clearly on track.
        isInPit: (pos?.isInPit ?? false) && (stints.at(-1)?.totalLaps ?? 0) < MIN_PIT_CONFIRM_LAPS,
        stints,
        hasMandatoryStop,
      });
    }

    rows.sort((a, b) => a.position - b.position);

    return { rows, currentLap, totalLaps };
  }, [positionMap, driverList, appLines, lapCount]);
}
