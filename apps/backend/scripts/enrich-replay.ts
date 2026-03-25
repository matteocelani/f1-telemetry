/**
 * Enriches a replay JSON file with synthetic data for channels that were not
 * captured in the original recording. This allows full UI testing without a
 * live F1 session.
 *
 * Time is mapped 1:1 to wall clock — each frame = 100ms of replay time.
 * This ensures the ExtrapolatedClock, LapCount, etc. progress linearly
 * when played back at the default 100ms interval.
 *
 * Usage: npx tsx scripts/enrich-replay.ts [input.json] [output.json]
 * Default: data/china.json → data/china-enriched.json
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface ReplayFrame {
  updates: Record<string, unknown>;
}

const INPUT_PATH = process.argv[2] ?? resolve(__dirname, '../data/china.json');
const OUTPUT_PATH =
  process.argv[3] ?? resolve(__dirname, '../data/china-enriched.json');

function loadInput(path: string): { raw: string; frames: ReplayFrame[] } {
  if (!existsSync(path)) {
    throw new Error(`Input file not found: ${path}`);
  }
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read input file: ${path}`, { cause: err });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in input file: ${path}`, { cause: err });
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Input file must contain a non-empty JSON array: ${path}`);
  }
  return { raw, frames: parsed as ReplayFrame[] };
}

const { raw, frames } = (() => {
  try {
    return loadInput(INPUT_PATH);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return process.exit(1);
  }
})();

const TOTAL_FRAMES = frames.length;
const FRAME_INTERVAL_MS = 100;

// Wall-clock replay duration in seconds (1146 frames × 100ms ≈ 114.6s)
const REPLAY_DURATION_SECONDS = (TOTAL_FRAMES * FRAME_INTERVAL_MS) / 1000;

// Race simulation: 56 laps over the replay duration
const TOTAL_LAPS = 56;
const SECONDS_PER_LAP = REPLAY_DURATION_SECONDS / TOTAL_LAPS;

const SESSION_START = new Date('2026-03-13T15:30:00Z');

// Track status events at specific frame percentages
const TRACK_STATUS_EVENTS: Array<{
  framePct: number;
  status: string;
  message: string;
}> = [
  { framePct: 0.0, status: '1', message: 'AllClear' },
  { framePct: 0.35, status: '2', message: 'Yellow' },
  { framePct: 0.37, status: '1', message: 'AllClear' },
  { framePct: 0.6, status: '6', message: 'VSCDeployed' },
  { framePct: 0.65, status: '7', message: 'VSCEnding' },
  { framePct: 0.67, status: '1', message: 'AllClear' },
];

const DRIVER_NUMBERS = [
  '1', '4', '11', '12', '14', '16', '18', '22', '23', '27',
  '31', '41', '44', '55', '63', '77', '81', '87', '10', '24',
];

function getCircuitPosition(
  progress: number
): { X: number; Y: number; Z: number } {
  const t = progress * Math.PI * 2;
  const X = Math.sin(t) * 4000 + Math.sin(t * 2) * 1500;
  const Y = Math.cos(t) * 3000 + Math.cos(t * 3) * 800;
  return { X: Math.round(X), Y: Math.round(Y), Z: 0 };
}

// Wall-clock seconds elapsed at this frame
function frameToSeconds(frameIndex: number): number {
  return (frameIndex * FRAME_INTERVAL_MS) / 1000;
}

function getTimestamp(frameIndex: number): string {
  const elapsedMs = frameIndex * FRAME_INTERVAL_MS;
  return new Date(SESSION_START.getTime() + elapsedMs).toISOString();
}

function formatRemaining(remainingSeconds: number): string {
  const clamped = Math.max(0, remainingSeconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

let currentTrackStatus = { Status: '1', Message: 'AllClear' };

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const frame = frames[i];
  if (!frame.updates) frame.updates = {};

  const wallSeconds = frameToSeconds(i);
  const pct = i / TOTAL_FRAMES;
  const utc = getTimestamp(i);
  const remaining = REPLAY_DURATION_SECONDS - wallSeconds;

  // Heartbeat every 30 frames (3 seconds)
  if (i % 30 === 0) {
    frame.updates['Heartbeat'] = { Utc: utc };
  }

  // ExtrapolatedClock every 10 frames (1 second) — counts down linearly
  if (i % 10 === 0) {
    frame.updates['ExtrapolatedClock'] = {
      Utc: utc,
      Remaining: formatRemaining(remaining),
      Extrapolating: true,
    };
  }

  // LapCount: progresses linearly through laps
  const currentLap = Math.min(TOTAL_LAPS, Math.floor(wallSeconds / SECONDS_PER_LAP) + 1);
  // Emit LapCount when the lap changes or at frame 0
  if (i === 0 || currentLap !== Math.min(TOTAL_LAPS, Math.floor(frameToSeconds(i - 1) / SECONDS_PER_LAP) + 1)) {
    frame.updates['LapCount'] = { CurrentLap: currentLap, TotalLaps: TOTAL_LAPS };
  }

  // TrackStatus at scripted events
  for (const event of TRACK_STATUS_EVENTS) {
    const eventFrame = Math.floor(event.framePct * TOTAL_FRAMES);
    if (i === eventFrame) {
      currentTrackStatus = { Status: event.status, Message: event.message };
      frame.updates['TrackStatus'] = { ...currentTrackStatus };
    }
  }

  // SessionInfo at frame 0
  if (i === 0 && !frame.updates['SessionInfo']) {
    frame.updates['SessionInfo'] = {
      Meeting: {
        Key: 1280,
        Name: 'Chinese Grand Prix',
        OfficialName: 'FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2026',
        Location: 'Shanghai',
        Number: 2,
        Country: { Key: 53, Code: 'CHN', Name: 'China' },
        Circuit: { Key: 49, ShortName: 'Shanghai' },
      },
      Key: 11236,
      Type: 'Race',
      Name: 'Race',
      StartDate: '2026-03-13T15:30:00',
      EndDate: '2026-03-13T17:30:00',
      GmtOffset: '08:00:00',
      Path: '2026/2026-03-13_Chinese_Grand_Prix/2026-03-13_Race/',
    };
  }

  // SessionData at start and end
  if (i === 0) {
    frame.updates['SessionData'] = {
      Series: [{ Utc: utc, Lap: 0 }],
      StatusSeries: [
        { Utc: utc, TrackStatus: 'AllClear', SessionStatus: 'Started' },
      ],
    };
  }
  if (i === TOTAL_FRAMES - 1) {
    frame.updates['SessionData'] = {
      Series: [{ Utc: utc }],
      StatusSeries: [{ Utc: utc, SessionStatus: 'Finalised' }],
    };
  }

  // Position.z — car positions on the circuit, every 3 frames (~3.7 Hz)
  if (i % 3 === 0) {
    const entries: Record<string, { X: number; Y: number; Z: number }> = {};
    DRIVER_NUMBERS.forEach((driverNo, idx) => {
      const driverOffset = idx / DRIVER_NUMBERS.length;
      const speedFactor = 1 + (DRIVER_NUMBERS.length - idx) * 0.001;
      const progress =
        ((pct * 15 * speedFactor + driverOffset) % 1 + 1) % 1;
      const pos = getCircuitPosition(progress);
      pos.X += Math.round((Math.random() - 0.5) * 20);
      pos.Y += Math.round((Math.random() - 0.5) * 20);
      entries[driverNo] = pos;
    });

    frame.updates['Position.z'] = {
      Position: [{ Timestamp: utc, Entries: entries }],
    };
  }

  // CarData.z — telemetry for all cars, every 3 frames (~3.7 Hz)
  if (i % 3 === 0) {
    const cars: Record<string, { Channels: Record<string, number> }> = {};
    DRIVER_NUMBERS.forEach((driverNo) => {
      const phase = (pct * 50 + Math.random() * 0.1) % 1;
      const isInCorner = Math.sin(phase * Math.PI * 8) > 0.3;
      const isBraking = Math.sin(phase * Math.PI * 8 + 1) > 0.7;

      const speed = isInCorner
        ? 120 + Math.random() * 80
        : 280 + Math.random() * 60;
      const throttle = isInCorner ? 30 + Math.random() * 40 : 90 + Math.random() * 10;
      const brake = isBraking ? 60 + Math.random() * 40 : 0;
      const rpm = 6000 + (speed / 370) * 7500;
      const gear = Math.min(8, Math.max(1, Math.ceil(speed / 45)));

      cars[driverNo] = {
        Channels: {
          '0': Math.round(rpm),
          '2': Math.round(speed),
          '3': gear,
          '4': Math.round(throttle),
          '5': Math.round(brake),
          '45': 0,
        },
      };
    });

    frame.updates['CarData.z'] = {
      Entries: [{ Cars: cars }],
    };
  }
}

const output = JSON.stringify(frames);

try {
  writeFileSync(OUTPUT_PATH, output, 'utf-8');
} catch (err) {
  console.error(`Failed to write output file: ${OUTPUT_PATH}`, err);
  process.exit(1);
}

const inputSize = (raw.length / 1024).toFixed(0);
const outputSize = (output.length / 1024).toFixed(0);
console.info(
  `Enriched ${TOTAL_FRAMES} frames: ${inputSize}KB → ${outputSize}KB`
);
console.info(`Replay duration: ${REPLAY_DURATION_SECONDS.toFixed(1)}s (${TOTAL_FRAMES} frames × ${FRAME_INTERVAL_MS}ms)`);
console.info(`Clock: counts down from ${formatRemaining(REPLAY_DURATION_SECONDS)} to 00:00:00`);
console.info(`Laps: 1→${TOTAL_LAPS} (~${SECONDS_PER_LAP.toFixed(1)}s per lap)`);
console.info(`Session type: Race (for lap sync testing)`);
console.info(`Output: ${OUTPUT_PATH}`);
