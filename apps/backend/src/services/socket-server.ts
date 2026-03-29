import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { deepMerge } from '@utils/deepMerge';
import { Logger } from '@utils/logger';

// Batch window: flush accumulated updates every 50ms (≈20fps) to avoid high-frequency frame storms
const BATCH_INTERVAL_MS = 50;

// Drop frames to slow clients to prevent unbounded memory growth on the server
const MAX_BUFFERED_BYTES = 1024 * 64; // 64 KiB

const HEALTH_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

export class SocketServer {
  private httpServer: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private readonly port: number;
  private getIsF1Connected: () => boolean = () => false;

  // Accumulates the latest value per channel within the current batch window
  private readonly batchBuffer = new Map<string, unknown>();

  // Holds the last serialised value per channel for delta comparison
  private readonly deltaCache = new Map<string, string>();

  // Deep-merged accumulated state per channel — used for complete snapshots on new connections
  private readonly stateCache = new Map<string, unknown>();

  constructor(port: number = 8080) {
    this.port = port;
  }

  public setHealthChecks(getIsF1Connected: () => boolean) {
    this.getIsF1Connected = getIsF1Connected;
  }

  public start() {
    this.httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.url === '/health' && req.method === 'GET') {
        const isF1Connected = this.getIsF1Connected();
        const payload = {
          status: isF1Connected ? 'ok' : 'degraded',
          uptime: Math.floor(process.uptime()),
          connectedClients: this.clientCount,
          isF1Connected,
          timestamp: new Date().toISOString(),
        };
        res.writeHead(200, HEALTH_HEADERS);
        res.end(JSON.stringify(payload));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    this.wss = new WebSocketServer({ server: this.httpServer });
    this.httpServer.listen(this.port, () => {
      Logger.info(`Server listening on port ${this.port} (HTTP + WebSocket)`);
    });

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

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    if (this.httpServer) {
      this.httpServer.close(() => Logger.info('Server closed.'));
      this.httpServer = null;
    }
  }

  // Deep-merges incoming deltas within the batch window to prevent overwrites.
  public broadcast(channel: string, data: unknown) {
    const existing = this.batchBuffer.get(channel);
    this.batchBuffer.set(channel, existing !== undefined ? deepMerge(existing, data) : data);
  }

  // Replaces the entire stateCache with a fresh F1 snapshot and broadcasts it
  // to all connected clients as a snapshot frame, forcing frontend store resets.
  // Used on F1 reconnect and session changes to prevent stale ghost data.
  public replaceState(channels: Record<string, unknown>): void {
    this.batchBuffer.clear();
    this.deltaCache.clear();
    this.stateCache.clear();

    for (const [channel, data] of Object.entries(channels)) {
      this.stateCache.set(channel, data);
      this.deltaCache.set(channel, JSON.stringify(data));
    }

    Logger.info(`State replaced (${this.stateCache.size} channels)`);
    this.broadcastSnapshotToAll();
  }

  private flush() {
    if (this.batchBuffer.size === 0) return;

    // Always update caches so snapshots work even if no clients are connected yet
    const updates: Record<string, unknown> = {};
    let hasChanges = false;

    for (const [channel, data] of this.batchBuffer) {
      const serialised = JSON.stringify(data);
      if (this.deltaCache.get(channel) === serialised) continue;
      this.deltaCache.set(channel, serialised);

      // Deep-merge into stateCache so snapshots contain the full accumulated state
      const existing = this.stateCache.get(channel);
      this.stateCache.set(channel, deepMerge(existing, data));

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

  // Discards all cached state so new clients start with a clean slate
  public clearCache(): void {
    this.batchBuffer.clear();
    this.deltaCache.clear();
    this.stateCache.clear();
    Logger.info('State cache cleared');
  }

  // Sends a control frame to all connected clients (connection status signals)
  public broadcastControl(payload: Record<string, unknown>): void {
    if (!this.wss || this.wss.clients.size === 0) return;

    const frame = JSON.stringify(payload);
    for (const client of this.wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      client.send(frame);
    }
  }

  public get clientCount(): number {
    return this.wss?.clients.size ?? 0;
  }

  // Sends the full accumulated state to a newly connected client
  private sendSnapshot(ws: WebSocket): void {
    if (this.stateCache.size === 0) return;

    const updates: Record<string, unknown> = {};
    for (const [channel, state] of this.stateCache) {
      updates[channel] = state;
    }

    // Mark as snapshot so the frontend can reset stale stores before applying
    const frame = JSON.stringify({ snapshot: true, updates });
    ws.send(frame);
    Logger.info(`Sent snapshot (${this.stateCache.size} channels) to new client`);
  }

  // Sends the full accumulated state to ALL connected clients (used after state replacement)
  private broadcastSnapshotToAll(): void {
    if (!this.wss || this.wss.clients.size === 0 || this.stateCache.size === 0) return;

    const updates: Record<string, unknown> = {};
    for (const [channel, state] of this.stateCache) {
      updates[channel] = state;
    }

    const frame = JSON.stringify({ snapshot: true, updates });
    for (const client of this.wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      client.send(frame);
    }

    Logger.info(`Broadcast snapshot (${this.stateCache.size} channels) to ${this.wss.clients.size} clients`);
  }
}
