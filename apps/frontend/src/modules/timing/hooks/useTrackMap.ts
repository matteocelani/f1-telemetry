import { useMemo, useRef } from 'react';
import { MS_PER_DAY } from '@/constants/numbers';
import calendarData from '@/data/calendar.json';
import circuitsData from '@/data/circuits.json';
import driversData from '@/data/drivers.json';
import teamsData from '@/data/teams.json';
import { useSession } from '@/store/session';
import { useTrack } from '@/store/track';
import type { RaceEntry } from '@/types/data';

interface CircuitData {
  circuitId: string;
  name: string;
  viewBox: string;
  path: string;
  points: [number, number][];
}

interface TeamData {
  colorHex: string;
  textColorHex: string;
}

interface TrackDot {
  driverNo: string;
  tla: string;
  teamColor: string;
  x: number;
  y: number;
}

interface AffineTransform {
  svgCX: number;
  svgCY: number;
  gpsCX: number;
  gpsCY: number;
  scale: number;
}

interface TrackMapData {
  dots: TrackDot[];
  circuit: CircuitData | null;
  hasData: boolean;
}

const MIN_DRIVERS_FOR_BOUNDS = 5;
const WARMUP_FRAMES = 3;
// Max distance (in SVG units) to snap a dot to the nearest path point.
const SNAP_RADIUS = 40;

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

// Finds the closest race happening now or next based on session dates.
function findCurrentRace(): RaceEntry | undefined {
  const now = Date.now();
  // Window around a race weekend where we consider it "current"
  const WEEKEND_BUFFER_DAYS = 2;
  const WEEKEND_BUFFER_MS = WEEKEND_BUFFER_DAYS * MS_PER_DAY;

  for (const race of races) {
    const sessionDates = Object.values(race.sessions).map((s) => new Date(s).getTime());
    const earliest = Math.min(...sessionDates);
    const latest = Math.max(...sessionDates);
    if (now >= earliest - WEEKEND_BUFFER_MS && now <= latest + WEEKEND_BUFFER_MS) {
      return race;
    }
  }

  // Fallback: next upcoming race
  return races.find((race) => {
    const sessionDates = Object.values(race.sessions).map((s) => new Date(s).getTime());
    return Math.max(...sessionDates) > now;
  });
}

function findCircuit(meetingName: string | undefined): CircuitData | null {
  let race: RaceEntry | undefined;

  if (meetingName) {
    const nameLower = meetingName.toLowerCase();
    race = races.find((r) => r.name.toLowerCase().includes(nameLower));
  }

  // Fallback to current/next race when session info is unavailable
  if (!race) {
    race = findCurrentRace();
  }

  if (!race) return null;
  return circuits.find((c) => c.circuitId === race.id) ?? null;
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

// Finds the nearest pre-sampled path point to an approximate SVG position.
function snapToPath(
  approxX: number,
  approxY: number,
  points: [number, number][]
): { x: number; y: number } {
  let bestDist = Infinity;
  let bestX = approxX;
  let bestY = approxY;

  for (const [px, py] of points) {
    const dx = approxX - px;
    const dy = approxY - py;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestX = px;
      bestY = py;
    }
  }

  // If too far from any path point, keep the approximate position.
  if (bestDist > SNAP_RADIUS * SNAP_RADIUS) {
    return { x: approxX, y: approxY };
  }

  return { x: bestX, y: bestY };
}

export function useTrackMap(): TrackMapData {
  const positions = useTrack((s) => s.positions);
  const sessionInfo = useSession((s) => s.sessionInfo);
  const transformRef = useRef<AffineTransform | null>(null);
  const accumRef = useRef({
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    frameCount: 0,
  });

  const circuit = useMemo(
    () => findCircuit(sessionInfo?.Meeting?.Name),
    [sessionInfo]
  );

  const entries = Object.entries(positions);

  // Clear stale transform when positions are wiped (store reset between sessions)
  if (entries.length === 0 && transformRef.current) {
    transformRef.current = null;
    accumRef.current = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, frameCount: 0 };
  }

  // Accumulate GPS bounds across frames, then lock the affine transform.
  if (!transformRef.current && entries.length >= MIN_DRIVERS_FOR_BOUNDS && circuit) {
    const acc = accumRef.current;

    for (const [, pos] of entries) {
      acc.minX = Math.min(acc.minX, pos.X);
      acc.maxX = Math.max(acc.maxX, pos.X);
      acc.minY = Math.min(acc.minY, pos.Y);
      acc.maxY = Math.max(acc.maxY, pos.Y);
    }
    acc.frameCount++;

    if (acc.frameCount >= WARMUP_FRAMES && circuit.points.length > 0) {
      // Compute SVG path bounding box from pre-sampled points.
      let pathMinX = Infinity;
      let pathMaxX = -Infinity;
      let pathMinY = Infinity;
      let pathMaxY = -Infinity;
      for (const [px, py] of circuit.points) {
        pathMinX = Math.min(pathMinX, px);
        pathMaxX = Math.max(pathMaxX, px);
        pathMinY = Math.min(pathMinY, py);
        pathMaxY = Math.max(pathMaxY, py);
      }

      const gpsW = acc.maxX - acc.minX || 1;
      const gpsH = acc.maxY - acc.minY || 1;
      const pathW = pathMaxX - pathMinX || 1;
      const pathH = pathMaxY - pathMinY || 1;

      // Scale GPS bbox to match the actual SVG path bbox (not the viewBox).
      const vb = parseViewBox(circuit.viewBox);
      transformRef.current = {
        svgCX: vb.x + vb.w / 2,
        svgCY: vb.y + vb.h / 2,
        gpsCX: (acc.minX + acc.maxX) / 2,
        gpsCY: (acc.minY + acc.maxY) / 2,
        scale: Math.min(pathW / gpsW, pathH / gpsH),
      };
    }
  }

  return useMemo(() => {
    const transform = transformRef.current;
    if (entries.length === 0 || !circuit || !transform) {
      return { dots: [], circuit, hasData: false };
    }

    const dots: TrackDot[] = entries.map(([driverNo, pos]) => {
      const meta = DRIVER_META[driverNo];

      // Approximate GPS→SVG mapping, then snap to nearest path point.
      const approxX = transform.svgCX + (pos.X - transform.gpsCX) * transform.scale;
      const approxY = transform.svgCY - (pos.Y - transform.gpsCY) * transform.scale;
      const snapped = snapToPath(approxX, approxY, circuit.points);

      return {
        driverNo,
        tla: meta?.tla ?? driverNo,
        teamColor: meta?.color ?? '#888888',
        x: snapped.x,
        y: snapped.y,
      };
    });

    return { dots, circuit, hasData: true };
  }, [entries, circuit]);
}
