import { WebSocket, WebSocketServer } from 'ws';
import { Logger } from '@utils/logger';

// Batch window: flush accumulated updates every 50ms (≈20fps) to avoid high-frequency frame storms
const BATCH_INTERVAL_MS = 50;

// Drop frames to slow clients to prevent unbounded memory growth on the server
const MAX_BUFFERED_BYTES = 1024 * 64; // 64 KiB

export class SocketServer {
  private wss: WebSocketServer | null = null;
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private readonly port: number;

  // Accumulates the latest value per channel within the current batch window
  private readonly batchBuffer = new Map<string, unknown>();

  // Holds the last serialised value per channel for delta comparison
  private readonly deltaCache = new Map<string, string>();

  constructor(port: number = 8080) {
    this.port = port;
  }

  public start() {
    this.wss = new WebSocketServer({ port: this.port });
    Logger.info(`WebSocket server listening on ws://localhost:${this.port}`);

    this.wss.on('connection', (ws: WebSocket) => {
      Logger.info(`Client connected. Active: ${this.wss!.clients.size}`);

      // Send a snapshot of the latest known state so the client doesn't wait for delta changes
      this.sendSnapshot(ws);

      ws.on('close', () => {
        Logger.info(
          `Client disconnected. Active: ${this.wss?.clients.size ?? 0}`
        );
      });

      ws.on('error', (err: Error) => {
        Logger.error('Client WebSocket error', err);
      });
    });

    this.wss.on('error', (err: Error) => {
      Logger.error('WebSocket Server error', err);
    });

    // Periodic batch flush is the backbone of the throttling strategy
    this.batchTimer = setInterval(() => this.flush(), BATCH_INTERVAL_MS);
  }

  public stop() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    if (!this.wss) return;
    Logger.info('Closing WebSocket server...');
    this.wss.close();
    this.wss = null;
  }

  // Accumulates the update — the flush cycle decides what to actually send
  public broadcast(channel: string, data: unknown) {
    this.batchBuffer.set(channel, data);
  }

  private flush() {
    if (this.batchBuffer.size === 0) return;

    // Always update the delta cache so snapshots work even if no clients are connected yet
    const updates: Record<string, unknown> = {};
    let hasChanges = false;

    for (const [channel, data] of this.batchBuffer) {
      const serialised = JSON.stringify(data);
      if (this.deltaCache.get(channel) === serialised) continue;
      this.deltaCache.set(channel, serialised);
      updates[channel] = data;
      hasChanges = true;
    }

    this.batchBuffer.clear();

    if (!hasChanges || !this.wss || this.wss.clients.size === 0) return;

    // Serialise once — shared across all clients in this flush cycle
    const frame = JSON.stringify({ updates });

    for (const client of this.wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;

      // Backpressure guard: skip clients that are consuming data too slowly
      if (client.bufferedAmount > MAX_BUFFERED_BYTES) {
        Logger.warn(
          `Dropping frame for slow client (buffered: ${client.bufferedAmount} bytes)`
        );
        continue;
      }

      client.send(frame);
    }
  }

  public get clientCount(): number {
    return this.wss?.clients.size ?? 0;
  }

  // Sends the full cached state to a newly connected client
  private sendSnapshot(ws: WebSocket): void {
    if (this.deltaCache.size === 0) return;

    const updates: Record<string, unknown> = {};
    for (const [channel, serialised] of this.deltaCache) {
      updates[channel] = JSON.parse(serialised);
    }

    const frame = JSON.stringify({ updates });
    ws.send(frame);
    Logger.info(`Sent snapshot (${this.deltaCache.size} channels) to new client`);
  }
}
