/**
 * Enriches a replay JSON file with synthetic data for channels that were not
 * captured in the original recording. This allows full UI testing without a
 * live F1 session.
 *
 * Usage: npx tsx scripts/enrich-replay.ts [input.json] [output.json]
 * Default: data/china.json → data/china-enriched.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface ReplayFrame {
  updates: Record<string, unknown>;
}

const INPUT_PATH = process.argv[2] ?? resolve(__dirname, '../data/china.json');
const OUTPUT_PATH =
  process.argv[3] ?? resolve(__dirname, '../data/china-enriched.json');

const raw = readFileSync(INPUT_PATH, 'utf-8');
const frames: ReplayFrame[] = JSON.parse(raw);

const TOTAL_FRAMES = frames.length;
const FRAME_INTERVAL_MS = 100;

// Sprint Qualifying is ~44 minutes (2640 seconds)
const SESSION_DURATION_SECONDS = 2640;
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

// 20 drivers with realistic circuit positions (Shanghai approximate coordinates)
const DRIVER_NUMBERS = [
  '1', '4', '11', '12', '14', '16', '18', '22', '23', '27',
  '31', '41', '44', '55', '63', '77', '81', '87', '10', '24',
];

const TEAM_COLOURS: Record<string, string> = {
  '1': 'FF0000', '16': 'FF0000',
  '4': 'FF8000', '81': 'FF8000',
  '11': '3671C6', '22': '3671C6',
  '44': '27F4D2', '63': '27F4D2',
  '14': '229971', '18': '229971',
  '31': 'B6BABD', '87': 'B6BABD',
  '10': 'FF87BC', '41': 'FF87BC',
  '23': '6692FF', '12': '6692FF',
  '55': '64C4FF', '77': '64C4FF',
  '27': 'FFD700', '24': 'FFD700',
};

// Shanghai circuit path — rough oval for GPS simulation
const CIRCUIT_POINTS = 200;

function getCircuitPosition(
  progress: number
): { X: number; Y: number; Z: number } {
  // Shanghai-like figure-8 path
  const t = progress * Math.PI * 2;
  const X = Math.sin(t) * 4000 + Math.sin(t * 2) * 1500;
  const Y = Math.cos(t) * 3000 + Math.cos(t * 3) * 800;
  return { X: Math.round(X), Y: Math.round(Y), Z: 0 };
}

function getTimestamp(frameIndex: number): string {
  const elapsed =
    (frameIndex / TOTAL_FRAMES) * SESSION_DURATION_SECONDS * 1000;
  return new Date(SESSION_START.getTime() + elapsed).toISOString();
}

function getRemainingTime(frameIndex: number): string {
  const elapsed = (frameIndex / TOTAL_FRAMES) * SESSION_DURATION_SECONDS;
  const remaining = Math.max(0, SESSION_DURATION_SECONDS - elapsed);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = Math.floor(remaining % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Current track status based on frame
let currentTrackStatus = { Status: '1', Message: 'AllClear' };

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const frame = frames[i];
  if (!frame.updates) frame.updates = {};

  const pct = i / TOTAL_FRAMES;
  const utc = getTimestamp(i);

  // Heartbeat every ~30 frames (~3 seconds)
  if (i % 30 === 0) {
    frame.updates['Heartbeat'] = { Utc: utc };
  }

  // ExtrapolatedClock every ~10 frames (~1 second)
  if (i % 10 === 0) {
    frame.updates['ExtrapolatedClock'] = {
      Utc: utc,
      Remaining: getRemainingTime(i),
      Extrapolating: true,
    };
  }

  // TrackStatus at scripted events
  for (const event of TRACK_STATUS_EVENTS) {
    const eventFrame = Math.floor(event.framePct * TOTAL_FRAMES);
    if (i === eventFrame) {
      currentTrackStatus = { Status: event.status, Message: event.message };
      frame.updates['TrackStatus'] = { ...currentTrackStatus };
    }
  }

  // SessionInfo at start so the header has session data immediately
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
      Type: 'Qualifying',
      Name: 'Sprint Qualifying',
      StartDate: '2026-03-13T15:30:00',
      EndDate: '2026-03-13T16:14:00',
      GmtOffset: '08:00:00',
      Path: '2026/2026-03-13_Chinese_Grand_Prix/2026-03-13_Sprint_Qualifying/',
    };
  }

  // LapCount every ~50 frames to keep lap data fresh
  if (i % 50 === 0) {
    const currentLap = Math.min(56, Math.floor(pct * 56) + 1);
    frame.updates['LapCount'] = { CurrentLap: currentLap, TotalLaps: 56 };
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
      // Each driver has an offset so they're spread around the circuit
      const driverOffset = idx / DRIVER_NUMBERS.length;
      // Speed variance per driver (leaders are faster)
      const speedFactor = 1 + (DRIVER_NUMBERS.length - idx) * 0.001;
      const progress =
        ((pct * 15 * speedFactor + driverOffset) % 1 + 1) % 1;
      // Add some noise for realism
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
      // Simulate realistic telemetry patterns
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
writeFileSync(OUTPUT_PATH, output, 'utf-8');

const inputSize = (raw.length / 1024).toFixed(0);
const outputSize = (output.length / 1024).toFixed(0);
console.info(
  `Enriched ${TOTAL_FRAMES} frames: ${inputSize}KB → ${outputSize}KB`
);
console.info(`Added: ExtrapolatedClock, Heartbeat, TrackStatus, SessionData, Position.z, CarData.z`);
console.info(`Output: ${OUTPUT_PATH}`);
