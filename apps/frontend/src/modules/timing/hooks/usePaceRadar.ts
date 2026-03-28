import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_LAP_HISTORY } from '@/modules/timing/constants';
import type { LapSnapshot, SectorColorClass } from '@/modules/timing/types';
import type { UITimingRow } from '@/modules/timing/types';
import { lapTimeToMs } from '@/modules/timing/utils';

interface DriverLapHistory {
  driverNo: string;
  tla: string;
  teamColor: string;
  isKnockedOut: boolean;
  laps: LapSnapshot[];
}

// Ring buffer persists lap history across re-renders without triggering them.
export function usePaceRadar(rows: UITimingRow[]): DriverLapHistory[] {
  const bufferRef = useRef<
    Map<string, { lastSeen: string; laps: LapSnapshot[] }>
  >(new Map());

  // Only triggers re-render when a genuinely new lap is recorded.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let changed = false;
    const buffer = bufferRef.current;

    for (const row of rows) {
      const lapTime = row.lastLap;
      if (!lapTime) continue;

      const entry = buffer.get(row.driverNo);

      if (entry && entry.lastSeen === lapTime) continue;

      const ms = lapTimeToMs(lapTime);
      if (!isFinite(ms) || ms <= 0) continue;

      const snapshot: LapSnapshot = {
        lapTimeMs: ms,
        color: row.lastLapColor,
        compound: row.currentTyre,
      };

      if (entry) {
        entry.lastSeen = lapTime;
        entry.laps.push(snapshot);
        if (entry.laps.length > MAX_LAP_HISTORY) {
          entry.laps.shift();
        }
      } else {
        buffer.set(row.driverNo, { lastSeen: lapTime, laps: [snapshot] });
      }

      changed = true;
    }

    if (changed) {
      setRevision((r) => r + 1);
    }
  }, [rows]);

  return useMemo(() => {
    // Required as a dependency to re-derive when new laps arrive.
    void revision;

    const buffer = bufferRef.current;
    const result: DriverLapHistory[] = [];

    for (const row of rows) {
      const entry = buffer.get(row.driverNo);
      if (!entry || entry.laps.length === 0) continue;

      result.push({
        driverNo: row.driverNo,
        tla: row.tla,
        teamColor: row.teamColor,
        isKnockedOut: row.isKnockedOut,
        laps: entry.laps,
      });
    }

    return result;
  }, [rows, revision]);
}

export function getMetricValue(
  row: UITimingRow,
  metric: 's1' | 's2' | 's3' | 'st' | 'fl'
): { value: string; numericValue: number; color: SectorColorClass } {
  if (metric === 's1' || metric === 's2' || metric === 's3') {
    const idx = metric === 's1' ? 0 : metric === 's2' ? 1 : 2;
    const sector = row.sectors[idx];
    if (!sector) return { value: '', numericValue: Infinity, color: 'none' };
    const num = parseFloat(sector.value);
    return {
      value: sector.value,
      numericValue: isNaN(num) ? Infinity : num,
      color: sector.color,
    };
  }

  const speed = row.speeds[metric];
  if (!speed) return { value: '', numericValue: -Infinity, color: 'none' };
  const num = parseFloat(speed.value);
  return {
    value: speed.value ? `${speed.value} km/h` : '',
    numericValue: isNaN(num) ? -Infinity : num,
    color: speed.color,
  };
}
