import { readFileSync } from 'fs';
import { resolve } from 'path';
import { SocketServer } from '@services/socket-server';
import { Logger } from '@utils/logger';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const REPLAY_INTERVAL_MS = parseInt(process.env.REPLAY_INTERVAL ?? '100', 10);

interface ReplayFrame {
  snapshot?: boolean;
  updates: Record<string, unknown>;
}

function loadReplayData(): ReplayFrame[] {
  const filePath =
    process.argv[2] ?? resolve(__dirname, '../data/suzuka-race-dev.json');
  Logger.info(`Loading replay data from ${filePath}`);

  const raw = readFileSync(filePath, 'utf-8');
  const frames = JSON.parse(raw) as ReplayFrame[];

  Logger.info(`Loaded ${frames.length} frames`);
  return frames;
}

function startReplay(socketServer: SocketServer, frames: ReplayFrame[]): void {
  let index = 0;

  const tick = () => {
    const frame = frames[index];

    if (frame?.updates) {
      // Snapshot frames replace the entire server state atomically
      if (frame.snapshot) {
        socketServer.replaceState(frame.updates);
      } else {
        for (const [channel, data] of Object.entries(frame.updates)) {
          socketServer.broadcast(channel, data);
        }
      }
    }

    index = (index + 1) % frames.length;

    if (index === 0) {
      Logger.info('Replay loop restarting from beginning');
      socketServer.clearCache();
    }
  };

  setInterval(tick, REPLAY_INTERVAL_MS);
  Logger.info(
    `Replaying at ${REPLAY_INTERVAL_MS}ms per frame (${frames.length} frames, loops forever)`
  );
}

const socketServer = new SocketServer(PORT);
socketServer.setHealthChecks(() => true);
socketServer.start();

const frames = loadReplayData();
startReplay(socketServer, frames);

const shutdown = (signal: string) => {
  Logger.info(`Received ${signal}. Shutting down...`);
  socketServer.stop();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
