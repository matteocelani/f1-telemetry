/**
 * Kinematic Dead-Reckoning Engine for the F1 Track Map.
 * Uses per-segment EWMA dwell profiles to project non-uniform car velocity,
 * rubber-band correction for seamless anchor transitions, and a 60fps rAF loop
 * that writes directly to SVG DOM refs — fully bypassing React's render cycle.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DriverTiming } from '@f1-telemetry/core';
import { MS_PER_DAY } from '@/constants/numbers';
import calendarData from '@/data/calendar.json';
import circuitsData from '@/data/circuits.json';
import driversData from '@/data/drivers.json';
import teamsData from '@/data/teams.json';
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

// Per-driver motion state anchored to the last confirmed micro-sector crossing.
interface DriverKinematicState {
  anchorPercent: number;
  anchorTime: number;
  // Visual offset applied at anchor time to prevent jumps; decays to 0 over CORRECTION_DECAY_MS.
  correctionOffset: number;
  prevCumulative: number;
  lapCount: number;
  segIndex: number;
}

// Track-wide learned timing profile: dwells[k] = expected ms to traverse segment k.
// Shared across all drivers since the track geometry is identical for everyone.
interface SegmentDwellProfile {
  dwells: number[];
  // Fastest observed dwell per segment; used in timed sessions to reject out-lap data.
  bests: number[];
  observations: number;
  lapTimeMs: number;
  isTimedSession: boolean;
}

// Constants

const MIN_DRIVERS_FOR_BOUNDS = 5;
const WARMUP_FRAMES = 3;
const CURVATURE_WEIGHT = 4;
const SMOOTHING_WINDOW = 5;
const DEFAULT_LAP_TIME_MS = 90_000;
const PERCENT_PER_LAP = 100;

// Kinematic engine
const CORRECTION_DECAY_MS = 1000;
const MIN_ANCHOR_DELTA_MS = 50;
const SEGMENT_HEADROOM = 0.05;
const SHOCK_DECAY_RATE = 2;

// Adaptive EWMA for segment profile learning
const COLD_START_ALPHA = 0.5;
const BASE_EWMA_ALPHA = 0.3;
const MAX_EWMA_ALPHA = 0.8;
const WARM_LAP_THRESHOLD = 3;

// In Practice/Qualifying, reject segment dwells slower than best × this ratio (out-laps).
const OUTLAP_REJECTION_RATIO = 1.2;
const TIMED_SESSIONS = new Set(['Practice', 'Qualifying', 'Sprint Qualifying']);

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

// Geometry helpers

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

// Kinematic engine

// Adaptive EWMA alpha: corners learn slowly (stable), straights learn fast (predictable).
function computeAdaptiveAlpha(
  profile: SegmentDwellProfile,
  segIdx: number
): number {
  const totalSegs = profile.dwells.length;
  const isWarm =
    profile.observations >= totalSegs * WARM_LAP_THRESHOLD;
  if (!isWarm) return COLD_START_ALPHA;

  const uniformDwell = profile.lapTimeMs / Math.max(1, totalSegs);
  const segDwell = profile.dwells[segIdx] ?? uniformDwell;
  return Math.min(MAX_EWMA_ALPHA, BASE_EWMA_ALPHA * (uniformDwell / Math.max(segDwell, 1)));
}

// Segment-based projection: non-uniform velocity per micro-sector with pace shock damping.
function projectSegmentPosition(
  kin: DriverKinematicState,
  profile: SegmentDwellProfile,
  boundaries: number[]
): number {
  if (boundaries.length < 2) return kin.prevCumulative;

  const now = Date.now();
  const elapsed = now - kin.anchorTime;
  const totalSegs = boundaries.length - 1;

  // Projecting through the segment AFTER the last completed one
  const projSegIdx = kin.segIndex + 1;
  const projSegWrapped = ((projSegIdx % totalSegs) + totalSegs) % totalSegs;

  // Segment span from the anchor to the next boundary
  const segEnd = boundaries[Math.min(projSegIdx + 1, boundaries.length - 1)];
  const segStart = boundaries[Math.min(projSegIdx, boundaries.length - 1)];
  const span = segEnd - segStart;

  // Expected dwell from the learned profile (cold start: uniform distribution)
  const defaultDwell = profile.lapTimeMs / Math.max(1, totalSegs);
  const expectedDwell =
    profile.dwells[projSegWrapped] > 0
      ? profile.dwells[projSegWrapped]
      : defaultDwell;

  // Progress ratio within segment
  let ratio: number;
  if (expectedDwell <= 0) {
    ratio = 0;
  } else if (elapsed <= expectedDwell) {
    ratio = elapsed / expectedDwell;
  } else {
    // Pace shock (Safety Car, rain, incident): the car is taking longer than expected.
    // Instead of overshooting into the next segment, we asymptotically approach 95%
    // of the boundary. The dot decelerates naturally and "waits" for the real anchor.
    const overrun = elapsed / expectedDwell - 1;
    ratio = 1 - SEGMENT_HEADROOM / (1 + overrun * SHOCK_DECAY_RATE);
  }

  const basePercent = kin.anchorPercent + span * ratio;

  // Rubber-band correction: at anchor time the dot was at a different visual position.
  // This offset bridges the gap and linearly decays to 0, preventing visible jumps.
  const corrDecay = Math.max(0, 1 - elapsed / CORRECTION_DECAY_MS);
  const corrected = basePercent + kin.correctionOffset * corrDecay;

  // Monotonic constraint: position can never decrease (prevents backward teleports).
  return Math.max(corrected, kin.prevCumulative);
}

// Updates kinematic state and segment profile when a new anchor arrives from F1 data.
function applyAnchor(
  prev: DriverKinematicState | undefined,
  anchorPercent: number,
  now: number,
  currentLap: number,
  segIndex: number,
  profile: SegmentDwellProfile,
  boundaries: number[]
): DriverKinematicState {
  if (!prev) {
    return {
      anchorPercent,
      anchorTime: now,
      correctionOffset: 0,
      prevCumulative: anchorPercent,
      lapCount: currentLap,
      segIndex,
    };
  }

  const dt = now - prev.anchorTime;
  if (dt < MIN_ANCHOR_DELTA_MS) {
    return { ...prev, segIndex, lapCount: currentLap };
  }

  // Snapshot where the dot appears right now so we can bridge from it seamlessly.
  const currentVisual = projectSegmentPosition(prev, profile, boundaries);

  // Learn from real data: update the dwell profile with the actual time this segment took.
  if (segIndex >= 0 && segIndex < profile.dwells.length && dt > MIN_ANCHOR_DELTA_MS) {
    // Always track the fastest observed dwell for out-lap filtering.
    if (dt < profile.bests[segIndex]) {
      profile.bests[segIndex] = dt;
    }

    // In Practice/Qualifying, out-laps and in-laps are 2-3x slower than push-laps.
    // Only update the EWMA when the observed dwell is within tolerance of the best,
    // so the profile converges to representative push-lap pace, not polluted averages.
    const isBestKnown = isFinite(profile.bests[segIndex]);
    const isRepresentative = !profile.isTimedSession
      || !isBestKnown
      || dt <= profile.bests[segIndex] * OUTLAP_REJECTION_RATIO;

    if (isRepresentative) {
      const alpha = computeAdaptiveAlpha(profile, segIndex);
      profile.dwells[segIndex] =
        alpha * dt + (1 - alpha) * profile.dwells[segIndex];
      profile.observations++;
    }
  }

  // correction = currentVisual - anchor ensures s(0) = currentVisual (no jump).
  const correctionOffset = currentVisual - anchorPercent;

  return {
    anchorPercent,
    anchorTime: now,
    correctionOffset,
    prevCumulative: Math.max(prev.prevCumulative, anchorPercent),
    lapCount: currentLap,
    segIndex,
  };
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
  const kinematicRef = useRef<Record<string, DriverKinematicState>>({});
  const segmentProfileRef = useRef<SegmentDwellProfile>({
    dwells: [],
    bests: [],
    observations: 0,
    lapTimeMs: DEFAULT_LAP_TIME_MS,
    isTimedSession: false,
  });
  const boundariesRef = useRef<number[]>([]);
  const driversRef = useRef<Record<string, DriverDotMeta>>({});
  const prevGpsModeRef = useRef(false);
  const prevDriverKeyRef = useRef('');
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

  // Sync boundaries to ref for the rAF projection function
  boundariesRef.current = boundaries;

  // Initialize segment profile when segment count or session type changes
  useEffect(() => {
    if (totalSegments === 0) return;
    const profile = segmentProfileRef.current;
    const sessionType = sessionInfo?.Type ?? 'Race';
    profile.isTimedSession = TIMED_SESSIONS.has(sessionType);
    if (profile.dwells.length !== totalSegments) {
      const uniform = profile.lapTimeMs / totalSegments;
      profile.dwells = new Array(totalSegments).fill(uniform);
      profile.bests = new Array(totalSegments).fill(Infinity);
      profile.observations = 0;
    }
  }, [totalSegments, sessionInfo]);

  const hasGps = Object.keys(positions).length >= MIN_DRIVERS_FOR_BOUNDS;
  const isSegmentMode = !hasGps;

  // Process anchors when data changes
  useEffect(() => {
    if (!circuit || arcDistances.length === 0) return;

    const now = Date.now();
    const profile = segmentProfileRef.current;

    // Reset kinematic states on mode switch
    if (prevGpsModeRef.current !== hasGps) {
      kinematicRef.current = {};
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
      // GPS mode: each position update is a kinematic anchor
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

        const prev = kinematicRef.current[driverNo];
        if (!prev || anchorPercent >= prev.anchorPercent) {
          kinematicRef.current[driverNo] = applyAnchor(
            prev,
            anchorPercent,
            now,
            currentLap,
            -1,
            profile,
            boundaries
          );
        }

        newDrivers[driverNo] = {
          driverNo,
          tla: meta?.tla ?? driverNo,
          teamColor: meta?.color ?? '#888888',
          inPit: false,
        };
      }
    } else if (boundaries.length > 0) {
      // Segment mode: detect micro-sector changes as kinematic anchors
      for (const [driverNo, timing] of Object.entries(timingLines)) {
        if (timing.Retired || timing.Stopped) continue;

        const meta = DRIVER_META[driverNo];
        if (!meta) continue;

        const currentLap = timing.NumberOfLaps ?? 0;

        // Update segment profile lap time from driver's latest lap
        const lapTime = parseLapTimeMs(timing.LastLapTime?.Value);
        if (lapTime) {
          profile.lapTimeMs =
            BASE_EWMA_ALPHA * lapTime +
            (1 - BASE_EWMA_ALPHA) * profile.lapTimeMs;
        }

        // F1 sometimes sends InPit:true but never the corresponding false.
        // Cross-reference with stint data: if the active stint has ≥2 laps, driver is on track.
        const activeStints = appLines[driverNo]?.Stints ?? [];
        const lastStintLaps = activeStints.length > 0
          ? (activeStints[activeStints.length - 1]?.TotalLaps ?? 0)
          : 0;
        const isInPit = Boolean(timing.InPit) && lastStintLaps < 2;

        if (isInPit) {
          delete kinematicRef.current[driverNo];
          newDrivers[driverNo] = {
            driverNo,
            tla: meta.tla,
            teamColor: meta.color,
            inPit: true,
          };
          continue;
        }

        const prev = kinematicRef.current[driverNo];

        // Lap reset: preserve segment profile knowledge, reset segment tracking
        if (prev && currentLap > prev.lapCount) {
          const startPercent =
            currentLap * PERCENT_PER_LAP +
            (boundaries[1] ?? boundaries[0]);
          kinematicRef.current[driverNo] = {
            anchorPercent: startPercent,
            anchorTime: now,
            correctionOffset: 0,
            prevCumulative: prev.prevCumulative,
            lapCount: currentLap,
            segIndex: -1,
          };
        }

        const driverSegCount = countSegments(timing);
        if (driverSegCount !== totalSegments) continue;

        const statuses = flattenSegmentStatuses(timing);
        const currentState = kinematicRef.current[driverNo];
        const scanStart = Math.max(0, currentState?.segIndex ?? 0);
        const leadSeg = scanForwardSegment(statuses, scanStart);
        const hasValidSegment = statuses.length > 0 && statuses[leadSeg] > 0;

        if (
          hasValidSegment &&
          (!currentState || currentState.segIndex !== leadSeg)
        ) {
          const anchorPercent =
            currentLap * PERCENT_PER_LAP +
            (boundaries[leadSeg + 1] ?? boundaries[boundaries.length - 1]);
          kinematicRef.current[driverNo] = applyAnchor(
            currentState,
            anchorPercent,
            now,
            currentLap,
            leadSeg,
            profile,
            boundaries
          );
        } else if (!currentState) {
          // Cold start: no segment data yet, initialize at lap start
          const startPercent =
            currentLap * PERCENT_PER_LAP +
            (boundaries[1] ?? boundaries[0]);
          kinematicRef.current[driverNo] = applyAnchor(
            undefined,
            startPercent,
            now,
            currentLap,
            -1,
            profile,
            boundaries
          );
        }

        newDrivers[driverNo] = {
          driverNo,
          tla: meta.tla,
          teamColor: meta.color,
          inPit: false,
        };
      }
    }

    driversRef.current = newDrivers;

    // Clean up stale kinematic states
    for (const key of Object.keys(kinematicRef.current)) {
      if (!newDrivers[key]) delete kinematicRef.current[key];
    }

    // Only trigger React re-render on structural driver changes
    const driverKey = Object.keys(newDrivers)
      .sort()
      .map((k) => `${k}:${newDrivers[k].inPit ? 1 : 0}`)
      .join('|');

    if (driverKey !== prevDriverKeyRef.current) {
      prevDriverKeyRef.current = driverKey;
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
    totalSegments,
    startOffsetPct,
  ]);

  // Called by TrackMap's rAF loop at 60fps. Reads from refs only (no React state),
  // so it never triggers a re-render. TrackMap writes the result to el.style.offsetDistance.
  const projectPercent = useCallback(
    (driverNo: string): number => {
      const kin = kinematicRef.current[driverNo];
      if (!kin) return 0;
      return projectSegmentPosition(
        kin,
        segmentProfileRef.current,
        boundariesRef.current
      );
    },
    []
  );

  return {
    circuit,
    drivers,
    hasData: drivers.length > 0,
    isSegmentMode,
    startPercent: startOffsetPct,
    projectPercent,
  };
}
