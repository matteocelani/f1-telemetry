/**
 * Data-driven Track Map positioning engine.
 * Computes driver positions from real F1 micro-sector data with smooth lerp
 * interpolation via a 60fps rAF loop that writes directly to SVG DOM refs.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DriverTiming } from '@f1-telemetry/core';
import { MS_PER_DAY } from '@/constants/numbers';
import calendarData from '@/data/calendar.json';
import circuitsData from '@/data/circuits.json';
import driversData from '@/data/drivers.json';
import teamsData from '@/data/teams.json';
import { MIN_PIT_CONFIRM_LAPS } from '@/modules/timing/constants';
import type {
  CircuitData,
  DriverDotMeta,
  TrackMapData,
} from '@/modules/timing/types';
import { useSession } from '@/store/session';
import { useTiming } from '@/store/timing';
import { useTimingApp } from '@/store/timing-app';
import { useTrack } from '@/store/track';
import type { RaceEntry } from '@/types/data';

// Interfaces

interface TeamData {
  colorHex: string;
  textColorHex: string;
}

interface AffineTransform {
  svgCX: number;
  svgCY: number;
  gpsCX: number;
  gpsCY: number;
  scale: number;
}

interface DriverTrackState {
  anchorPercent: number;
  anchorTime: number;
  nextBoundaryPercent: number;
  estimatedDwellMs: number;
  visualPercent: number;
  lapCount: number;
  completedSegments: number;
}

// Constants
const MIN_DRIVERS_FOR_BOUNDS = 5;
const WARMUP_FRAMES = 3;
const CURVATURE_WEIGHT = 4;
const SMOOTHING_WINDOW = 5;
const PERCENT_PER_LAP = 100;
const LERP_FACTOR = 0.15;
const LERP_SNAP_THRESHOLD = 0.01;
const DEFAULT_LAP_TIME_MS = 90_000;
const MAX_PROJECTION_RATIO = 0.95;
// F1 resets segments to 0 before incrementing lap count; ignore drops larger than this threshold.
const LAP_BOUNDARY_SEG_DROP = 3;

// Sector/segment key arrays: avoids Object.keys().sort() on every call.
const SECTOR_KEYS = ['0', '1', '2'] as const;
const SEGMENT_KEYS = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
] as const;

// F1 segment completion statuses (2048=normal, 2049=purple, 2051=green+sector).
// Status 2064 means "not yet reached" or "yellow flag" and must NOT count as completed.
const COMPLETED_STATUSES = new Set([2048, 2049, 2051]);

// Module-level data — precomputed once at import time.
const races = calendarData as unknown as RaceEntry[];
const circuits = circuitsData as unknown as CircuitData[];
const teams = teamsData as Record<string, TeamData>;

const DRIVER_META: Record<string, { tla: string; color: string }> = {};
for (const driver of driversData) {
  const team = teams[driver.teamId];
  if (team) {
    DRIVER_META[driver.driverNumber] = {
      tla: driver.tla,
      color: team.colorHex,
    };
  }
}

// Precompute race date ranges so findCurrentRace avoids creating Date objects per call.
const RACE_DATE_RANGES: {
  race: RaceEntry;
  earliest: number;
  latest: number;
}[] = races.map((race) => {
  const timestamps = Object.values(race.sessions).map((s) =>
    new Date(s).getTime()
  );
  return {
    race,
    earliest: Math.min(...timestamps),
    latest: Math.max(...timestamps),
  };
});

// Geometry helpers

function findCurrentRace(): RaceEntry | undefined {
  const now = Date.now();
  const WEEKEND_BUFFER_MS = 2 * MS_PER_DAY;

  for (const { race, earliest, latest } of RACE_DATE_RANGES) {
    if (
      now >= earliest - WEEKEND_BUFFER_MS &&
      now <= latest + WEEKEND_BUFFER_MS
    ) {
      return race;
    }
  }
  return RACE_DATE_RANGES.find(({ latest }) => latest > Date.now())?.race;
}

function findCircuit(meetingName: string | undefined): CircuitData | null {
  let race: RaceEntry | undefined;

  if (meetingName) {
    const nameLower = meetingName.toLowerCase();
    race = races.find((r) => r.name.toLowerCase().includes(nameLower));
  }

  if (!race) race = findCurrentRace();
  if (!race) return null;
  return circuits.find((c) => c.circuitId === race!.id) ?? null;
}

function parseViewBox(vb: string): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const [x, y, w, h] = vb.split(' ').map(Number);
  return { x, y, w, h };
}

function computeArcDistances(points: [number, number][]): number[] {
  const d = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    d.push(d[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return d;
}

function computeSmoothedCurvatures(points: [number, number][]): number[] {
  const n = points.length;
  if (n < 3) return new Array(n).fill(0);

  const raw: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const ax = points[i][0] - points[i - 1][0];
    const ay = points[i][1] - points[i - 1][1];
    const bx = points[i + 1][0] - points[i][0];
    const by = points[i + 1][1] - points[i][1];
    const la = Math.sqrt(ax * ax + ay * ay);
    const lb = Math.sqrt(bx * bx + by * by);
    if (la < 1e-6 || lb < 1e-6) continue;
    raw[i] = Math.abs(ax * by - ay * bx) / (la * lb * ((la + lb) / 2));
  }
  raw[0] = raw[1];
  raw[n - 1] = raw[n - 2];

  const half = Math.floor(SMOOTHING_WINDOW / 2);
  const smoothed: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      sum += raw[j];
      count++;
    }
    smoothed[i] = sum / count;
  }
  return smoothed;
}

function lerpLookup(xs: number[], ys: number[], targetX: number): number {
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] >= targetX) {
      const denom = xs[i] - xs[i - 1];
      const t = denom > 1e-9 ? (targetX - xs[i - 1]) / denom : 0;
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

function computeSegmentBoundaries(
  points: [number, number][],
  arcDist: number[],
  totalSegments: number,
  startOffsetPercent: number
): number[] {
  if (totalSegments === 0 || points.length < 3) return [];

  const curvatures = computeSmoothedCurvatures(points);
  const totalArc = arcDist[arcDist.length - 1];
  if (totalArc === 0) return [];

  const maxCurv = Math.max(...curvatures, 1e-6);

  const wDist = [0];
  for (let i = 1; i < points.length; i++) {
    const ds = arcDist[i] - arcDist[i - 1];
    const avgCurv = (curvatures[i - 1] + curvatures[i]) / 2;
    const weight = 1 + CURVATURE_WEIGHT * (avgCurv / maxCurv);
    wDist.push(wDist[i - 1] + ds * weight);
  }
  const totalW = wDist[wDist.length - 1];

  const startArc = (startOffsetPercent / 100) * totalArc;
  const startW = lerpLookup(arcDist, wDist, startArc);

  const boundaries: number[] = [];
  for (let k = 0; k <= totalSegments; k++) {
    const targetW = startW + (k / totalSegments) * totalW;
    const wrappedW = targetW > totalW ? targetW - totalW : targetW;
    const arc = lerpLookup(wDist, arcDist, wrappedW);
    let pct = (arc / totalArc) * 100;
    if (targetW > totalW) pct += 100;
    boundaries.push(pct);
  }

  return boundaries;
}

function countSegments(driver: DriverTiming): number {
  const sectors = driver.Sectors;
  if (!sectors) return 0;
  let n = 0;
  for (const sKey of SECTOR_KEYS) {
    const segs = sectors[sKey]?.Segments;
    if (segs) n += Object.keys(segs).length;
  }
  return n;
}

function findNearestPointIndex(
  x: number,
  y: number,
  points: [number, number][]
): number {
  let bestDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < points.length; i++) {
    const dx = x - points[i][0];
    const dy = y - points[i][1];
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function parseLapTimeMs(value: string | undefined): number | null {
  if (!value) return null;
  const colonIdx = value.indexOf(':');
  if (colonIdx === -1) return null;
  const mins = parseInt(value.substring(0, colonIdx), 10);
  const secs = parseFloat(value.substring(colonIdx + 1));
  if (isNaN(mins) || isNaN(secs)) return null;
  return (mins * 60 + secs) * 1000;
}

function indexToPercent(index: number, distances: number[]): number {
  const total = distances[distances.length - 1];
  if (total === 0) return 0;
  return (distances[index] / total) * 100;
}

// Counts completed micro-sectors using pre-sorted key arrays (no Object.keys().sort()).
function countCompletedSegments(driver: DriverTiming): number {
  const sectors = driver.Sectors;
  if (!sectors) return 0;

  let completed = 0;
  for (const sKey of SECTOR_KEYS) {
    const segs = sectors[sKey]?.Segments;
    if (!segs) continue;
    for (const segKey of SEGMENT_KEYS) {
      const seg = segs[segKey];
      if (!seg) continue;
      if (COMPLETED_STATUSES.has(seg.Status ?? 0)) {
        completed++;
      } else {
        return completed;
      }
    }
  }
  return completed;
}

// Hook

export function useTrackMap(): TrackMapData {
  const positions = useTrack((s) => s.positions);
  const timingLines = useTiming((s) => s.lines);
  const appLines = useTimingApp((s) => s.lines);
  const sessionInfo = useSession((s) => s.sessionInfo);

  const transformRef = useRef<AffineTransform | null>(null);
  const accumRef = useRef({
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    frameCount: 0,
  });
  const trackStateRef = useRef<Record<string, DriverTrackState>>({});
  const driversRef = useRef<Record<string, DriverDotMeta>>({});
  const prevGpsModeRef = useRef(false);
  const driverRevRef = useRef(0);
  const prevDriverRevRef = useRef(-1);
  // Reusable object for projectAll output — avoids creating a new object every frame.
  const projectedRef = useRef<Record<string, number>>({});
  const [drivers, setDrivers] = useState<DriverDotMeta[]>([]);

  const circuit = useMemo(
    () => findCircuit(sessionInfo?.Meeting?.Name),
    [sessionInfo]
  );

  const arcDistances = useMemo(
    () => (circuit ? computeArcDistances(circuit.points) : []),
    [circuit]
  );

  const startOffsetPct = circuit?.startOffset ?? 0;

  const totalSegments = useMemo(() => {
    for (const timing of Object.values(timingLines)) {
      const n = countSegments(timing);
      if (n > 0) return n;
    }
    return 0;
  }, [timingLines]);

  const boundaries = useMemo(() => {
    if (!circuit || totalSegments === 0 || arcDistances.length === 0) return [];
    return computeSegmentBoundaries(
      circuit.points,
      arcDistances,
      totalSegments,
      startOffsetPct
    );
  }, [circuit, totalSegments, arcDistances, startOffsetPct]);

  const hasGps = Object.keys(positions).length >= MIN_DRIVERS_FOR_BOUNDS;
  const isSegmentMode = !hasGps;

  // Compute target positions from real data and update structural driver list.
  useEffect(() => {
    if (!circuit || arcDistances.length === 0) return;

    if (prevGpsModeRef.current !== hasGps) {
      trackStateRef.current = {};
      prevGpsModeRef.current = hasGps;
    }

    const newDrivers: Record<string, DriverDotMeta> = {};
    const gpsEntries = Object.entries(positions);

    // GPS transform calibration
    if (gpsEntries.length === 0 && transformRef.current) {
      transformRef.current = null;
      accumRef.current = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        frameCount: 0,
      };
    }

    if (!transformRef.current && hasGps) {
      const acc = accumRef.current;
      for (const [, pos] of gpsEntries) {
        acc.minX = Math.min(acc.minX, pos.X);
        acc.maxX = Math.max(acc.maxX, pos.X);
        acc.minY = Math.min(acc.minY, pos.Y);
        acc.maxY = Math.max(acc.maxY, pos.Y);
      }
      acc.frameCount++;

      if (acc.frameCount >= WARMUP_FRAMES && circuit.points.length > 0) {
        let pathMinX = Infinity,
          pathMaxX = -Infinity;
        let pathMinY = Infinity,
          pathMaxY = -Infinity;
        for (const [px, py] of circuit.points) {
          pathMinX = Math.min(pathMinX, px);
          pathMaxX = Math.max(pathMaxX, px);
          pathMinY = Math.min(pathMinY, py);
          pathMaxY = Math.max(pathMaxY, py);
        }
        const gpsW = acc.maxX - acc.minX || 1;
        const gpsH = acc.maxY - acc.minY || 1;
        const vb = parseViewBox(circuit.viewBox);
        transformRef.current = {
          svgCX: vb.x + vb.w / 2,
          svgCY: vb.y + vb.h / 2,
          gpsCX: (acc.minX + acc.maxX) / 2,
          gpsCY: (acc.minY + acc.maxY) / 2,
          scale: Math.min(
            (pathMaxX - pathMinX) / gpsW,
            (pathMaxY - pathMinY) / gpsH
          ),
        };
      }
    }

    const transform = transformRef.current;

    if (hasGps && transform) {
      for (const [driverNo, pos] of gpsEntries) {
        const meta = DRIVER_META[driverNo];
        const timing = timingLines[driverNo];
        const currentLap = timing?.NumberOfLaps ?? 0;

        const approxX =
          transform.svgCX + (pos.X - transform.gpsCX) * transform.scale;
        const approxY =
          transform.svgCY - (pos.Y - transform.gpsCY) * transform.scale;
        const idx = findNearestPointIndex(approxX, approxY, circuit.points);
        const rawPercent = indexToPercent(idx, arcDistances);
        const anchorPercent = currentLap * PERCENT_PER_LAP + rawPercent;

        const prev = trackStateRef.current[driverNo];

        trackStateRef.current[driverNo] = {
          anchorPercent,
          anchorTime: Date.now(),
          nextBoundaryPercent: anchorPercent,
          estimatedDwellMs: 0,
          visualPercent: prev?.visualPercent ?? anchorPercent,
          lapCount: currentLap,
          completedSegments: 0,
        };

        newDrivers[driverNo] = {
          driverNo,
          tla: meta?.tla ?? driverNo,
          teamColor: meta?.color ?? '#888888',
          inPit: false,
        };
      }
    } else if (boundaries.length > 0) {
      for (const [driverNo, timing] of Object.entries(timingLines)) {
        if (timing.Retired || timing.Stopped) continue;

        const meta = DRIVER_META[driverNo];
        if (!meta) continue;

        const currentLap = timing.NumberOfLaps ?? 0;

        const activeStints = appLines[driverNo]?.Stints ?? [];
        const lastStintLaps =
          activeStints.length > 0
            ? (activeStints[activeStints.length - 1]?.TotalLaps ?? 0)
            : 0;
        const isInPit =
          Boolean(timing.InPit) && lastStintLaps < MIN_PIT_CONFIRM_LAPS;

        if (isInPit) {
          delete trackStateRef.current[driverNo];
          newDrivers[driverNo] = {
            driverNo,
            tla: meta.tla,
            teamColor: meta.color,
            inPit: true,
          };
          continue;
        }

        const completed = countCompletedSegments(timing);
        const prev = trackStateRef.current[driverNo];

        // Lap boundary guard: F1 resets segments to 0 BEFORE incrementing NumberOfLaps.
        // If completed drops significantly on the same lap, this is a segment reset — hold the old anchor.
        const segDrop = prev ? prev.completedSegments - completed : 0;
        const isLapBoundaryReset =
          prev &&
          prev.lapCount === currentLap &&
          segDrop > LAP_BOUNDARY_SEG_DROP;

        if (isLapBoundaryReset) {
          // Keep the previous state — don't move the dot backward
          newDrivers[driverNo] = {
            driverNo,
            tla: meta.tla,
            teamColor: meta.color,
            inPit: false,
          };
          continue;
        }

        const anchorBoundary =
          completed < boundaries.length
            ? boundaries[completed]
            : boundaries[boundaries.length - 1];
        const anchorPercent = currentLap * PERCENT_PER_LAP + anchorBoundary;

        const nextIdx = Math.min(completed + 1, boundaries.length - 1);
        const nextBoundaryPercent =
          currentLap * PERCENT_PER_LAP + boundaries[nextIdx];

        const lapTimeMs =
          parseLapTimeMs(timing.LastLapTime?.Value) ?? DEFAULT_LAP_TIME_MS;
        const totalSegs = boundaries.length - 1;
        const estimatedDwellMs =
          totalSegs > 0 ? lapTimeMs / totalSegs : DEFAULT_LAP_TIME_MS;

        const isNewAnchor =
          !prev ||
          prev.completedSegments !== completed ||
          prev.lapCount !== currentLap;

        trackStateRef.current[driverNo] = {
          anchorPercent,
          anchorTime: isNewAnchor ? Date.now() : prev.anchorTime,
          nextBoundaryPercent,
          estimatedDwellMs,
          visualPercent: prev?.visualPercent ?? anchorPercent,
          lapCount: currentLap,
          completedSegments: completed,
        };

        newDrivers[driverNo] = {
          driverNo,
          tla: meta.tla,
          teamColor: meta.color,
          inPit: false,
        };
      }
    }

    driversRef.current = newDrivers;

    for (const key of Object.keys(trackStateRef.current)) {
      if (!newDrivers[key]) delete trackStateRef.current[key];
    }

    // Cheap structural change detection: increment revision on any change.
    const driverKeys = Object.keys(newDrivers);
    let hasChanged =
      driverKeys.length !== Object.keys(driversRef.current).length;
    if (!hasChanged) {
      for (const k of driverKeys) {
        const prev = driversRef.current[k];
        const next = newDrivers[k];
        if (!prev || prev.inPit !== next.inPit) {
          hasChanged = true;
          break;
        }
      }
    }

    if (hasChanged) {
      driverRevRef.current++;
    }

    if (driverRevRef.current !== prevDriverRevRef.current) {
      prevDriverRevRef.current = driverRevRef.current;
      setDrivers(Object.values(newDrivers));
    }
  }, [
    positions,
    timingLines,
    appLines,
    circuit,
    arcDistances,
    boundaries,
    hasGps,
    startOffsetPct,
  ]);

  // Projects ALL drivers with forward projection + lerp. Zero allocations in the hot path.
  // Called once per rAF frame. NaN-safe: corrupted values fall back to anchor or 0.
  const projectAll = useCallback((): Record<string, number> => {
    const states = trackStateRef.current;
    const now = Date.now();
    const result = projectedRef.current;

    // Clear previous keys that no longer exist
    for (const key in result) {
      if (!(key in states)) delete result[key];
    }

    for (const driverNo in states) {
      const state = states[driverNo];

      // Forward projection between segment boundaries using elapsed time
      let targetPercent = state.anchorPercent;
      if (state.estimatedDwellMs > 0) {
        const elapsed = now - state.anchorTime;
        const span = state.nextBoundaryPercent - state.anchorPercent;
        const progress = Math.min(
          elapsed / state.estimatedDwellMs,
          MAX_PROJECTION_RATIO
        );
        targetPercent =
          state.anchorPercent + span * (progress > 0 ? progress : 0);
      }

      // Lerp toward the projected target
      const delta = targetPercent - state.visualPercent;
      if (Math.abs(delta) < LERP_SNAP_THRESHOLD) {
        state.visualPercent = targetPercent;
      } else {
        state.visualPercent += delta * LERP_FACTOR;
      }

      // NaN guard
      if (!Number.isFinite(state.visualPercent)) {
        state.visualPercent = Number.isFinite(state.anchorPercent)
          ? state.anchorPercent
          : 0;
      }

      result[driverNo] = state.visualPercent;
    }

    return result;
  }, []);

  return {
    circuit,
    drivers,
    hasData: drivers.length > 0,
    isSegmentMode,
    startPercent: startOffsetPct,
    projectAll,
  };
}
