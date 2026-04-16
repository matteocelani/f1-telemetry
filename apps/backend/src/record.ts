/**
 * Records a live F1 session to a JSON file for offline replay.
 * Captures all channels (including TimingDataF1, ExtrapolatedClock, etc.)
 * in the same frame format used by the replay server.
 *
 * Usage: pnpm record [output-file]
 * Default output: data/recording-{timestamp}.json
 *
 * Press Ctrl+C to stop recording and save.
 */

import { writeFileSync, renameSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { WebSocket, ClientOptions } from 'ws';
import { CHANNELS, F1_HUB_NAME, F1_SERVER_URL } from '@f1-telemetry/core';
import { decompressPayload } from '@services/payload-parser';
import { deepMerge } from '@utils/deepMerge';
import { Logger } from '@utils/logger';

const F1_ORIGIN_URL = 'https://www.formula1.com';
const CLIENT_PROTOCOL = '1.5';
const WS_TRANSPORT = 'webSockets';
const CONNECTION_DATA = encodeURIComponent(`[{"name":"${F1_HUB_NAME}"}]`);
const BATCH_INTERVAL_MS = 100;

const SUBSCRIBE_CHANNELS = [
  CHANNELS.TELEMETRY,
  CHANNELS.POSITION,
  CHANNELS.TIMING_F1,
  CHANNELS.TIMING,
  CHANNELS.TIMING_APP_DATA,
  CHANNELS.TIMING_STATS,
  CHANNELS.TRACK_STATUS,
  CHANNELS.SESSION_INFO,
  CHANNELS.DRIVER_LIST,
  CHANNELS.WEATHER_DATA,
  CHANNELS.RACE_CONTROL_MESSAGES,
  CHANNELS.EXTRAPOLATED_CLOCK,
  CHANNELS.LAP_COUNT,
  CHANNELS.SESSION_DATA,
  CHANNELS.HEARTBEAT,
  'TeamRadio',
  'PitLaneTimeCollection',
  'PitStopSeries',
  'ChampionshipPrediction',
  'DriverRaceInfo',
  'LapSeries',
  'TopThree',
  'CurrentTyres',
  'TyreStintSeries',
  'OvertakeSeries',
  'TlaRcm',
] as const;

interface ReplayFrame {
  timestamp: string;
  snapshot?: boolean;
  updates: Record<string, unknown>;
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const fileArg = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
const OUTPUT_PATH = fileArg
  ? resolve(process.cwd(), fileArg)
  : resolve(__dirname, `../data/recording-${timestamp}.json`);

const frames: ReplayFrame[] = [];
let batchQueue: Array<{ channel: string; data: unknown }> = [];
let isRecording = false;
let isSaved = false;
let batchIntervalId: ReturnType<typeof setInterval> | null = null;
let statusIntervalId: ReturnType<typeof setInterval> | null = null;

function flushBatch(): void {
  if (batchQueue.length === 0) return;

  const merged: Record<string, unknown> = {};
  for (const { channel, data } of batchQueue) {
    merged[channel] = channel in merged ? deepMerge(merged[channel], data) : data;
  }

  frames.push({
    timestamp: new Date().toISOString(),
    updates: merged,
  });
  batchQueue = [];
}

function save(): void {
  if (isSaved) return;
  isSaved = true;

  if (batchIntervalId) clearInterval(batchIntervalId);
  if (statusIntervalId) clearInterval(statusIntervalId);

  flushBatch();

  if (frames.length === 0) {
    Logger.warn('No frames captured — nothing to save.');
    return;
  }

  Logger.info(`Saving ${frames.length} frames to ${OUTPUT_PATH}...`);

  const json = JSON.stringify(frames);
  const tmpPath = `${OUTPUT_PATH}.tmp`;

  try {
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(tmpPath, json, 'utf-8');
    renameSync(tmpPath, OUTPUT_PATH);
  } catch (err) {
    Logger.error('Atomic write failed, trying direct write...', err as Error);
    try {
      writeFileSync(OUTPUT_PATH, json, 'utf-8');
      Logger.info('Direct write succeeded.');
    } catch (fallbackErr) {
      Logger.error('All writes failed — data lost', fallbackErr as Error);
    }
  }

  const sizeMb = (json.length / (1024 * 1024)).toFixed(1);
  Logger.info(`Saved ${frames.length} frames (${sizeMb}MB) to ${OUTPUT_PATH}`);
}

type NegotiateResponse = { ConnectionToken: string };
type SignalRMessage = { M: string; A: [string, ...unknown[]] };
type SignalRFrame = { M?: SignalRMessage[]; R?: Record<string, unknown> };

async function connect(): Promise<void> {
  Logger.info(`Negotiating with F1 SignalR at ${F1_SERVER_URL}...`);

  const headers: HeadersInit = {
    'User-Agent': 'BestHTTP',
    'Accept-Encoding': 'gzip, deflate',
    Origin: F1_ORIGIN_URL,
    Referer: `${F1_ORIGIN_URL}/`,
  };

  const negotiateUrl = `${F1_SERVER_URL}/negotiate?clientProtocol=${CLIENT_PROTOCOL}&connectionData=${CONNECTION_DATA}`;
  const negotiateResponse = await fetch(negotiateUrl, {
    method: 'GET',
    headers,
  });

  if (!negotiateResponse.ok) {
    throw new Error(`Negotiate failed — HTTP ${negotiateResponse.status}`);
  }

  const setCookieHeader = negotiateResponse.headers.get('set-cookie');
  const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';
  const negotiateData = (await negotiateResponse.json()) as NegotiateResponse;
  const connectionToken = encodeURIComponent(negotiateData.ConnectionToken);

  const wsBase = F1_SERVER_URL.replace('http', 'ws');
  const connectUrl = `${wsBase}/connect?clientProtocol=${CLIENT_PROTOCOL}&transport=${WS_TRANSPORT}&connectionToken=${connectionToken}&connectionData=${CONNECTION_DATA}`;

  const wsOptions: ClientOptions = {
    headers: { 'User-Agent': 'BestHTTP', Origin: F1_ORIGIN_URL, Cookie: sessionCookie },
  };

  const ws = new WebSocket(connectUrl, wsOptions);

  ws.on('open', async () => {
    Logger.info('Connected to F1 SignalR WebSocket.');

    const startUrl = `${F1_SERVER_URL}/start?clientProtocol=${CLIENT_PROTOCOL}&transport=${WS_TRANSPORT}&connectionToken=${connectionToken}&connectionData=${CONNECTION_DATA}`;
    await fetch(startUrl, { headers: { Cookie: sessionCookie } });

    const subscribeMsg = JSON.stringify({
      H: F1_HUB_NAME,
      M: 'Subscribe',
      A: [SUBSCRIBE_CHANNELS],
      I: 1,
    });
    ws.send(subscribeMsg);
    Logger.info(`Subscribed to: ${SUBSCRIBE_CHANNELS.join(', ')}`);
    Logger.info(`Recording ${SUBSCRIBE_CHANNELS.length} channels... Press Ctrl+C to stop and save.`);
    isRecording = true;
  });

  ws.on('message', (data: Buffer) => {
    if (!isRecording) return;

    try {
      const messageStr = data.toString('utf-8');
      if (messageStr.length < 3) return;

      const frame = JSON.parse(messageStr) as SignalRFrame;

      // Subscribe response: F1 sends full state in the R field — mark as snapshot
      if (frame.R && typeof frame.R === 'object') {
        flushBatch();
        const snapshotUpdates: Record<string, unknown> = {};
        for (const [channel, rawData] of Object.entries(frame.R)) {
          const resolved = resolveChannel(channel, rawData);
          if (resolved) {
            snapshotUpdates[resolved.channel] = resolved.data;
          }
        }
        frames.push({
          timestamp: new Date().toISOString(),
          snapshot: true,
          updates: snapshotUpdates,
        });
      }

      if (!frame.M?.length) return;

      for (const message of frame.M) {
        if (!message.A?.length) continue;

        const firstArg = message.A[0];
        const secondArg = message.A[1];

        if (typeof firstArg === 'string' && secondArg !== undefined && message.A.length >= 2) {
          processUpdate(firstArg, secondArg);
          continue;
        }

        if (typeof firstArg === 'string' && firstArg.startsWith('{')) {
          try {
            const feedPayload = JSON.parse(firstArg) as Record<string, unknown>;
            for (const channelName in feedPayload) {
              processUpdate(channelName, feedPayload[channelName]);
            }
          } catch (err) {
            Logger.warn('Malformed bulk feed payload, skipping', err);
          }
        }
      }
    } catch (err) {
      Logger.warn('Malformed SignalR frame, skipping', err);
    }
  });

  ws.on('close', () => {
    Logger.warn('F1 connection closed.');
    shutdown();
  });

  ws.on('error', (err: Error) => {
    Logger.error('WebSocket error', err);
  });

  batchIntervalId = setInterval(flushBatch, BATCH_INTERVAL_MS);
  batchIntervalId.unref();

  statusIntervalId = setInterval(() => {
    if (isRecording) {
      Logger.info(`Recording: ${frames.length} frames captured`);
    }
  }, 10_000);
  statusIntervalId.unref();
}

// Decompresses .z channels and strips the .z suffix so the output matches
// the channel names the frontend expects (e.g. "CarData" not "CarData.z").
function resolveChannel(channelName: string, rawData: unknown): { channel: string; data: unknown } | null {
  if (channelName.endsWith('.z') && typeof rawData === 'string') {
    const decompressed = decompressPayload(rawData);
    if (decompressed === null) {
      Logger.warn(`Decompression failed for ${channelName} — frame dropped`);
      return null;
    }
    return { channel: channelName.slice(0, -2), data: decompressed };
  }
  return { channel: channelName, data: rawData };
}

function processUpdate(channelName: string, rawData: unknown): void {
  const resolved = resolveChannel(channelName, rawData);
  if (resolved) {
    batchQueue.push(resolved);
  }
}

let isShuttingDown = false;

const shutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  isRecording = false;
  Logger.info('Stopping recording...');
  save();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

connect().catch((err) => {
  Logger.error('Failed to connect', err);
  process.exit(1);
});
