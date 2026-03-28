import { useMemo, useRef } from 'react';
import type { DriverTiming } from '@f1-telemetry/core';
import { MS_PER_DAY } from '@/constants/numbers';
import calendarData from '@/data/calendar.json';
import circuitsData from '@/data/circuits.json';
import driversData from '@/data/drivers.json';
import teamsData from '@/data/teams.json';
import type {
  CircuitData,
  TrackDot,
  TrackMapData,
} from '@/modules/timing/types';
import { useSession } from '@/store/session';
import { useTiming } from '@/store/timing';
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

interface DriverMotionState {
  segIndex: number;
  segChangeTime: number;
  lapTimeMs: number;
  // Cumulative (lapCount * PERCENT_PER_LAP + rawPercent): strictly increases, never wraps.
  prevCumulative: number;
  lapCount: number;
}

interface GpsDriverState {
  prevCumulative: number;
  lapCount: number;
}

// Constants
const MIN_DRIVERS_FOR_BOUNDS = 5;
const WARMUP_FRAMES = 3;
// Curvature weight: 0 = uniform, 4 = ~5x density in corners vs straights.
const CURVATURE_WEIGHT = 4;
const SMOOTHING_WINDOW = 5;
const DEFAULT_LAP_TIME_MS = 90_000;
// Cap forward interpolation to prevent overshooting into the next segment.
const MAX_INTERPOLATION_RATIO = 0.85;
// Each completed lap advances the cumulative offset-distance by exactly one full path length.
const PERCENT_PER_LAP = 100;

// Module-level data
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

// Helper functions

function findCurrentRace(): RaceEntry | undefined {
  const now = Date.now();
  const WEEKEND_BUFFER_DAYS = 2;
  const WEEKEND_BUFFER_MS = WEEKEND_BUFFER_DAYS * MS_PER_DAY;

  for (const race of races) {
    const sessionDates = Object.values(race.sessions).map((s) =>
      new Date(s).getTime()
    );
    const earliest = Math.min(...sessionDates);
    const latest = Math.max(...sessionDates);
    if (
      now >= earliest - WEEKEND_BUFFER_MS &&
      now <= latest + WEEKEND_BUFFER_MS
    ) {
      return race;
    }
  }

  return races.find((race) => {
    const sessionDates = Object.values(race.sessions).map((s) =>
      new Date(s).getTime()
    );
    return Math.max(...sessionDates) > now;
  });
}

function findCircuit(meetingName: string | undefined): CircuitData | null {
  let race: RaceEntry | undefined;

  if (meetingName) {
    const nameLower = meetingName.toLowerCase();
    race = races.find((r) => r.name.toLowerCase().includes(nameLower));
  }

  if (!race) {
    race = findCurrentRace();
  }

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

// Discrete unsigned curvature |dθ/ds| smoothed with moving average.
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
    // |cross| / (|a||b|) = sin(angle), divided by avg edge length = curvature
    raw[i] = Math.abs(ax * by - ay * bx) / (la * lb * ((la + lb) / 2));
  }
  raw[0] = raw[1];
  raw[n - 1] = raw[n - 2];

  // Smoothing pass
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

// Linear interpolation lookup in a monotonic table.
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

// Curvature-weighted boundary mapping: denser in corners, sparser on straights.
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

  // Cumulative curvature-weighted distance along the SVG path
  const wDist = [0];
  for (let i = 1; i < points.length; i++) {
    const ds = arcDist[i] - arcDist[i - 1];
    const avgCurv = (curvatures[i - 1] + curvatures[i]) / 2;
    const weight = 1 + CURVATURE_WEIGHT * (avgCurv / maxCurv);
    wDist.push(wDist[i - 1] + ds * weight);
  }
  const totalW = wDist[wDist.length - 1];

  // Weighted distance at the start/finish line
  const startArc = (startOffsetPercent / 100) * totalArc;
  const startW = lerpLookup(arcDist, wDist, startArc);

  // Distribute evenly in weighted space; monotonic to prevent backwards CSS animation.
  const boundaries: number[] = [];
  for (let k = 0; k <= totalSegments; k++) {
    const targetW = startW + (k / totalSegments) * totalW;
    const wrappedW = targetW > totalW ? targetW - totalW : targetW;
    const arc = lerpLookup(wDist, arcDist, wrappedW);
    let pct = (arc / totalArc) * 100;
    // Ensure monotonic: after the path wraps, add 100%
    if (targetW > totalW) pct += 100;
    boundaries.push(pct);
  }

  return boundaries;
}

function countSegments(driver: DriverTiming): number {
  const sectors = driver.Sectors;
  if (!sectors) return 0;
  let n = 0;
  for (const sKey of Object.keys(sectors)) {
    const segs = sectors[sKey]?.Segments;
    if (segs) n += Object.keys(segs).length;
  }
  return n;
}

function parseLapTimeMs(value: string | undefined): number | null {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs)) return null;
    return (mins * 60 + secs) * 1000;
  }
  return null;
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

function indexToPercent(index: number, distances: number[]): number {
  const total = distances[distances.length - 1];
  if (total === 0) return 0;
  return (distances[index] / total) * 100;
}

// Flattens all sector segment statuses into a single ordered array.
function flattenSegmentStatuses(driver: DriverTiming): number[] {
  const sectors = driver.Sectors;
  if (!sectors) return [];
  const statuses: number[] = [];
  for (const sKey of Object.keys(sectors).sort()) {
    const segs = sectors[sKey]?.Segments;
    if (!segs) continue;
    for (const segKey of Object.keys(segs).sort(
      (a, b) => Number(a) - Number(b)
    )) {
      statuses.push(segs[segKey]?.Status ?? 0);
    }
  }
  return statuses;
}

// Returns the furthest consecutive non-zero segment index; stale deep-merge data from prior laps is unreachable.
function scanForwardSegment(statuses: number[], startIndex: number): number {
  let furthest = startIndex;
  for (let i = startIndex; i < statuses.length; i++) {
    if (statuses[i] > 0) {
      furthest = i;
    } else {
      break;
    }
  }
  return furthest;
}

// Hook

export function useTrackMap(): TrackMapData {
  const positions = useTrack((s) => s.positions);
  const timingLines = useTiming((s) => s.lines);
  const sessionInfo = useSession((s) => s.sessionInfo);
  const transformRef = useRef<AffineTransform | null>(null);
  const accumRef = useRef({
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    frameCount: 0,
  });
  const segMotionRef = useRef<Record<string, DriverMotionState>>({});
  const gpsMotionRef = useRef<Record<string, GpsDriverState>>({});

  const circuit = useMemo(
    () => findCircuit(sessionInfo?.Meeting?.Name),
    [sessionInfo]
  );

  const arcDistances = useMemo(
    () => (circuit ? computeArcDistances(circuit.points) : []),
    [circuit]
  );

  const startOffsetPct = circuit?.startOffset ?? 0;

  // Detect segment count from first driver with data
  const totalSegments = useMemo(() => {
    for (const timing of Object.values(timingLines)) {
      const n = countSegments(timing);
      if (n > 0) return n;
    }
    return 0;
  }, [timingLines]);

  // Precompute curvature-weighted boundaries (per circuit + segment count)
  const boundaries = useMemo(() => {
    if (!circuit || totalSegments === 0 || arcDistances.length === 0) return [];
    return computeSegmentBoundaries(
      circuit.points,
      arcDistances,
      totalSegments,
      startOffsetPct
    );
  }, [circuit, totalSegments, arcDistances, startOffsetPct]);

  // GPS transform accumulation
  const gpsEntries = Object.entries(positions);
  const hasGps = gpsEntries.length >= MIN_DRIVERS_FOR_BOUNDS;

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

  if (!transformRef.current && hasGps && circuit) {
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

  return useMemo(() => {
    if (!circuit || arcDistances.length === 0) {
      return {
        dots: [],
        circuit,
        hasData: false,
        isSegmentMode: false,
        startPercent: startOffsetPct,
      };
    }

    // GPS mode: use real Position.z coordinates when available
    const transform = transformRef.current;
    if (hasGps && transform) {
      const dots: TrackDot[] = gpsEntries.map(([driverNo, pos]) => {
        const meta = DRIVER_META[driverNo];
        const timing = timingLines[driverNo];
        const currentLap = timing?.NumberOfLaps ?? 0;

        const approxX =
          transform.svgCX + (pos.X - transform.gpsCX) * transform.scale;
        const approxY =
          transform.svgCY - (pos.Y - transform.gpsCY) * transform.scale;
        const idx = findNearestPointIndex(approxX, approxY, circuit.points);
        const rawPercent = indexToPercent(idx, arcDistances);

        // Cumulative unwrap: a new lap contributes >= 100, so lap crossings are always forward.
        const candidate = currentLap * PERCENT_PER_LAP + rawPercent;
        const prev = gpsMotionRef.current[driverNo];
        const prevCumulative = prev?.prevCumulative ?? candidate;

        // Forward-only: GPS spatial jitter cannot produce a valid candidate < prevCumulative.
        const cumulative =
          candidate >= prevCumulative ? candidate : prevCumulative;
        gpsMotionRef.current[driverNo] = {
          prevCumulative: cumulative,
          lapCount: currentLap,
        };

        return {
          driverNo,
          tla: meta?.tla ?? driverNo,
          teamColor: meta?.color ?? '#888888',
          percent: cumulative,
          inPit: false,
          isWrapping: false,
        };
      });
      return {
        dots,
        circuit,
        hasData: true,
        isSegmentMode: false,
        startPercent: startOffsetPct,
      };
    }

    // Segment mode: estimate from TimingData when GPS is unavailable
    const timingEntries = Object.entries(timingLines);
    if (timingEntries.length === 0 || boundaries.length === 0) {
      return {
        dots: [],
        circuit,
        hasData: false,
        isSegmentMode: true,
        startPercent: startOffsetPct,
      };
    }

    const now = Date.now();
    const dots: TrackDot[] = [];

    for (const [driverNo, timing] of timingEntries) {
      if (timing.Retired || timing.Stopped) continue;

      const meta = DRIVER_META[driverNo];
      if (!meta) continue;

      const currentLap = timing.NumberOfLaps ?? 0;

      if (timing.InPit) {
        // Reset motion state so the driver starts fresh when leaving the pit
        delete segMotionRef.current[driverNo];
        dots.push({
          driverNo,
          tla: meta.tla,
          teamColor: meta.color,
          percent: currentLap * PERCENT_PER_LAP + startOffsetPct,
          inPit: true,
          isWrapping: false,
        });
        continue;
      }

      let motion: DriverMotionState | undefined =
        segMotionRef.current[driverNo];

      // Reset only on confirmed lap change to prevent false backwards teleports.
      const isLapReset = !!motion && currentLap > motion.lapCount;
      if (isLapReset) {
        delete segMotionRef.current[driverNo];
        motion = undefined;
      }

      // Skip drivers whose segment count doesn't match the precomputed boundaries
      const driverSegCount = countSegments(timing);
      if (driverSegCount !== totalSegments) continue;

      const statuses = flattenSegmentStatuses(timing);

      // Start scan from 0 after lap reset; stale segments from prior laps exist only at higher indices.
      const scanStart = motion?.segIndex ?? 0;
      const leadSeg = scanForwardSegment(statuses, scanStart);
      const hasValidSegment = statuses.length > 0 && statuses[leadSeg] > 0;

      if (!hasValidSegment) {
        if (!motion) {
          // No segment data yet after lap reset: anchor visually to the lap entry boundary.
          dots.push({
            driverNo,
            tla: meta.tla,
            teamColor: meta.color,
            percent:
              currentLap * PERCENT_PER_LAP + (boundaries[1] ?? boundaries[0]),
            inPit: false,
            isWrapping: false,
          });
        } else {
          // Data gap or regression: hold the last confirmed cumulative position.
          dots.push({
            driverNo,
            tla: meta.tla,
            teamColor: meta.color,
            percent: motion.prevCumulative,
            inPit: false,
            isWrapping: false,
          });
        }
        continue;
      }

      if (!motion || motion.segIndex !== leadSeg) {
        const lapTime = parseLapTimeMs(timing.LastLapTime?.Value);
        // Carry prevCumulative forward on segment advancement; seed from boundary on first init.
        const prevCumulative =
          motion?.prevCumulative ??
          currentLap * PERCENT_PER_LAP +
            (boundaries[leadSeg + 1] ?? boundaries[0]);
        motion = {
          segIndex: leadSeg,
          segChangeTime: now,
          lapTimeMs: lapTime ?? motion?.lapTimeMs ?? DEFAULT_LAP_TIME_MS,
          prevCumulative,
          lapCount: currentLap,
        };
        segMotionRef.current[driverNo] = motion;
      }

      const base = boundaries[leadSeg + 1] ?? boundaries[boundaries.length - 1];
      const baseCumulative = currentLap * PERCENT_PER_LAP + base;

      // Duration proportional to arc-length span, not uniform across segments.
      let rawCumulative = baseCumulative;
      if (leadSeg + 2 < boundaries.length) {
        const nextBound = boundaries[leadSeg + 2];
        const segArcSpan = nextBound - base;
        const totalArcSpan = boundaries[boundaries.length - 1] - boundaries[0];
        const segDurationMs =
          totalArcSpan > 0
            ? motion.lapTimeMs * (segArcSpan / totalArcSpan)
            : motion.lapTimeMs / totalSegments;
        const elapsed = now - motion.segChangeTime;
        const ratio = Math.min(
          elapsed / segDurationMs,
          MAX_INTERPOLATION_RATIO
        );
        rawCumulative = baseCumulative + ratio * segArcSpan;
      }

      // Strictly monotonic: clamp any backward movement to the last known cumulative position.
      const cumulative =
        rawCumulative >= motion.prevCumulative
          ? rawCumulative
          : motion.prevCumulative;
      motion.prevCumulative = cumulative;

      dots.push({
        driverNo,
        tla: meta.tla,
        teamColor: meta.color,
        percent: cumulative,
        inPit: false,
        isWrapping: false,
      });
    }

    return {
      dots,
      circuit,
      hasData: dots.length > 0,
      isSegmentMode: true,
      startPercent: startOffsetPct,
    };
  }, [
    gpsEntries,
    timingLines,
    circuit,
    hasGps,
    arcDistances,
    boundaries,
    totalSegments,
    startOffsetPct,
  ]);
}
