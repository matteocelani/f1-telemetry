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

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { WebSocket, ClientOptions } from 'ws';
import { CHANNELS, F1_SERVER_URL, F1_HUB_NAME } from '@f1-telemetry/core';
import { decompressPayload } from '@services/payload-parser';
import { Logger } from '@utils/logger';

const F1_ORIGIN_URL = 'https://www.formula1.com';
const CLIENT_PROTOCOL = '1.5';
const WS_TRANSPORT = 'webSockets';
const CONNECTION_DATA = encodeURIComponent(`[{"name":"${F1_HUB_NAME}"}]`);
const BATCH_INTERVAL_MS = 100;

// Subscribe to every known channel so recordings are complete for future use.
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
  updates: Record<string, unknown>;
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUTPUT_PATH =
  process.argv[2] ?? resolve(__dirname, `../data/recording-${timestamp}.json`);

const frames: ReplayFrame[] = [];
let batchBuffer = new Map<string, unknown>();
let isRecording = false;

function flushBatch(): void {
  if (batchBuffer.size === 0) return;

  const updates: Record<string, unknown> = {};
  for (const [channel, data] of batchBuffer) {
    updates[channel] = data;
  }
  frames.push({ updates });
  batchBuffer = new Map();
}

function save(): void {
  flushBatch();
  Logger.info(`Saving ${frames.length} frames to ${OUTPUT_PATH}...`);
  writeFileSync(OUTPUT_PATH, JSON.stringify(frames), 'utf-8');
  const sizeKb = (JSON.stringify(frames).length / 1024).toFixed(0);
  Logger.info(`Saved ${frames.length} frames (${sizeKb}KB) to ${OUTPUT_PATH}`);
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
    Logger.info('Recording... Press Ctrl+C to stop and save.');
    isRecording = true;
  });

  ws.on('message', (data: Buffer) => {
    if (!isRecording) return;

    try {
      const messageStr = data.toString('utf-8');
      if (messageStr.length < 3) return;

      const frame = JSON.parse(messageStr) as SignalRFrame;

      // Handle initial subscribe snapshot (F1 sends full state in the R field)
      if (frame.R && typeof frame.R === 'object') {
        for (const [channel, data] of Object.entries(frame.R)) {
          processUpdate(channel, data);
        }
        flushBatch();
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
          } catch {
            // Skip malformed bulk payloads
          }
        }
      }
    } catch {
      // Skip malformed frames
    }
  });

  ws.on('close', () => {
    Logger.warn('F1 connection closed.');
    save();
    process.exit(0);
  });

  ws.on('error', (err: Error) => {
    Logger.error('WebSocket error', err);
  });

  // Batch flush interval
  setInterval(flushBatch, BATCH_INTERVAL_MS);

  // Status updates every 10 seconds
  setInterval(() => {
    if (isRecording) {
      Logger.info(`Recording: ${frames.length} frames captured`);
    }
  }, 10_000);
}

function processUpdate(channelName: string, rawData: unknown): void {
  if (channelName.endsWith('.z') && typeof rawData === 'string') {
    const decompressed = decompressPayload(rawData);
    if (decompressed !== null) {
      batchBuffer.set(channelName, decompressed);
    }
  } else {
    batchBuffer.set(channelName, rawData);
  }
}

const shutdown = () => {
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
