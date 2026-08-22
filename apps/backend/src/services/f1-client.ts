import { WebSocket, ClientOptions } from 'ws';
import { CHANNELS } from '@f1-telemetry/core';
import { decompressPayload } from '@services/payload-parser';
import { SocketServer } from '@services/socket-server';
import { Logger } from '@utils/logger';

// F1 migrated from legacy ASP.NET SignalR to SignalR Core in 2025
const F1_ORIGIN_URL = 'https://www.formula1.com';
const F1_HTTP_URL = 'https://livetiming.formula1.com/signalrcore';
const F1_WS_URL = 'wss://livetiming.formula1.com/signalrcore';

const BASE_RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 60_000;
const NEGOTIATE_VERSION = '1';
const SESSION_INFO_CHANNEL = 'SessionInfo';
const SUBSCRIBE_INVOCATION_ID = '0';

// SignalR Core text protocol: messages delimited by record separator (0x1E)
const RECORD_SEP = '\x1e';

// SignalR Core message type constants per spec
const MSG_INVOCATION = 1;
const MSG_COMPLETION = 3;
const MSG_PING = 6;
const MSG_CLOSE = 7;

const SUBSCRIBE_CHANNELS = [
  CHANNELS.TELEMETRY,
  CHANNELS.POSITION,
  CHANNELS.TIMING,
  CHANNELS.TIMING_F1,
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
] as const;

// Handshake is sent once after WebSocket open to agree on JSON text protocol
const HANDSHAKE_MESSAGE = `{"protocol":"json","version":1}${RECORD_SEP}`;

type SignalRFrame = {
  type?: number;
  invocationId?: string;
  target?: string;
  arguments?: unknown[];
  result?: Record<string, unknown>;
  error?: string;
};

type NegotiateResponse = {
  connectionToken: string;
  connectionId: string;
};

export class F1Client {
  private ws: WebSocket | null = null;
  private isHandshakeComplete: boolean = false;
  private isConnected: boolean = false;
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private awsAlbCors: string = '';
  private currentSessionPath: string = '';
  private readonly localSocketServer: SocketServer;

  constructor(localSocketServer: SocketServer) {
    this.localSocketServer = localSocketServer;
  }

  public async connect(): Promise<void> {
    if (this.isReconnecting) return;

    try {
      // Step 1: OPTIONS pre-negotiate to obtain AWS ALB sticky session cookie
      Logger.info('Pre-negotiating with F1 SignalR Core...');
      const preNegResp = await fetch(`${F1_HTTP_URL}/negotiate`, {
        method: 'OPTIONS',
        headers: { 'User-Agent': 'BestHTTP', Origin: F1_ORIGIN_URL },
      });
      const rawCookie = preNegResp.headers.get('set-cookie') ?? '';
      const awsMatch = rawCookie.match(/AWSALBCORS=([^;]+)/);
      this.awsAlbCors = awsMatch?.[1] ?? '';

      // Step 2: POST negotiate to get connection token
      const negotiateHeaders: Record<string, string> = {
        'User-Agent': 'BestHTTP',
        Origin: F1_ORIGIN_URL,
        'Content-Type': 'text/plain',
      };
      if (this.awsAlbCors) {
        negotiateHeaders['Cookie'] = `AWSALBCORS=${this.awsAlbCors}`;
      }

      const negotiateResp = await fetch(
        `${F1_HTTP_URL}/negotiate?negotiateVersion=${NEGOTIATE_VERSION}`,
        { method: 'POST', headers: negotiateHeaders },
      );

      if (!negotiateResp.ok) {
        throw new Error(`Negotiate failed — HTTP ${negotiateResp.status}`);
      }

      const negotiateData = (await negotiateResp.json()) as NegotiateResponse;
      const connectionToken = encodeURIComponent(negotiateData.connectionToken);

      // Step 3: Build WebSocket URL. The endpoint is unauthenticated — no
      // Authorization header and no access_token query param. What the upgrade
      // does require is the AWS ALB sticky cookie from the negotiate above:
      // without it the upgrade lands on a target that never issued this
      // connectionToken and is rejected, which looks like an auth failure but
      // is not. See issue #24.
      const wsUrl = `${F1_WS_URL}?id=${connectionToken}`;

      const wsHeaders: Record<string, string> = {
        'User-Agent': 'BestHTTP',
        Origin: F1_ORIGIN_URL,
      };
      if (this.awsAlbCors) {
        wsHeaders['Cookie'] = `AWSALBCORS=${this.awsAlbCors}`;
      }

      const wsOptions: ClientOptions = { headers: wsHeaders };

      Logger.info('Connecting to F1 SignalR Core WebSocket...');
      this.ws = new WebSocket(wsUrl, wsOptions);
      this.isHandshakeComplete = false;
      this.setupListeners();
    } catch (err) {
      Logger.error('Failed to connect to F1 SignalR Core', err);
      this.scheduleReconnect();
    }
  }

  private setupListeners(): void {
    if (!this.ws) return;

    this.ws.on('open', () => {
      Logger.info('WebSocket open — sending SignalR Core handshake...');
      this.ws?.send(HANDSHAKE_MESSAGE);
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const raw = data.toString('utf-8');
        // Messages are delimited by RECORD_SEP; filter empty segments
        for (const segment of raw.split(RECORD_SEP)) {
          if (segment.length === 0) continue;
          const frame = JSON.parse(segment) as SignalRFrame;
          this.handleFrame(frame);
        }
      } catch (err) {
        Logger.error('Error processing SignalR Core message', err);
      }
    });

    this.ws.on('close', (code: number) => {
      this.isConnected = false;
      Logger.warn(`F1 SignalR Core closed (code ${code}). Scheduling reconnect...`);
      this.localSocketServer.broadcastControl({ control: 'f1_disconnected' });
      this.scheduleReconnect();
    });

    this.ws.on('error', (err: Error) => {
      // 'error' always precedes 'close' — log here, reconnect there
      Logger.error('F1 WebSocket error', err);
    });
  }

  private handleFrame(frame: SignalRFrame): void {
    // First message after open is the handshake response ({} or {error:...})
    if (!this.isHandshakeComplete) {
      if (frame.error) {
        Logger.error(`SignalR Core handshake rejected: ${frame.error}`);
        this.ws?.close();
        return;
      }
      this.isHandshakeComplete = true;
      this.isConnected = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      Logger.info('SignalR Core handshake complete. Subscribing...');
      this.sendSubscribe();
      return;
    }

    if (frame.type === MSG_PING) return;

    if (frame.type === MSG_CLOSE) {
      Logger.warn(`F1 sent Close: ${frame.error ?? 'no message'}`);
      return;
    }

    // Completion of our Subscribe invoke — carries the initial state snapshot in result
    if (frame.type === MSG_COMPLETION && frame.invocationId === SUBSCRIBE_INVOCATION_ID) {
      if (frame.result) {
        this.handleSubscribeSnapshot(frame.result);
      }
      return;
    }

    // Server-push invocation: incremental update [channelName, data, timestamp]
    if (frame.type === MSG_INVOCATION && frame.target === 'feed') {
      const args = frame.arguments;
      if (!args || args.length < 2) return;
      const channelName = args[0];
      const rawData = args[1];
      if (typeof channelName === 'string') {
        this.processUpdate(channelName, rawData);
      }
    }
  }

  private sendSubscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const msg = JSON.stringify({
      type: MSG_INVOCATION,
      invocationId: SUBSCRIBE_INVOCATION_ID,
      target: 'Subscribe',
      arguments: [SUBSCRIBE_CHANNELS],
    });

    try {
      this.ws.send(`${msg}${RECORD_SEP}`);
      Logger.info(`Subscribed to ${SUBSCRIBE_CHANNELS.length} channels`);
    } catch (err) {
      Logger.error('Failed to send Subscribe', err);
    }
  }

  // Handles the Subscribe completion snapshot: decompresses .z channels, then
  // atomically replaces the entire server state and notifies all clients.
  private handleSubscribeSnapshot(snapshot: Record<string, unknown>): void {
    const processed: Record<string, unknown> = {};

    for (const [channel, rawData] of Object.entries(snapshot)) {
      if (channel.endsWith('.z') && typeof rawData === 'string') {
        const decompressed = decompressPayload(rawData);
        if (decompressed !== null) {
          processed[channel] = decompressed;
        }
      } else {
        processed[channel] = rawData;
      }
    }

    this.updateSessionPath(processed[SESSION_INFO_CHANNEL]);
    this.localSocketServer.replaceState(processed);
    this.localSocketServer.broadcastControl({ control: 'f1_reconnected' });
    Logger.info(`Subscribe snapshot applied (${Object.keys(processed).length} channels)`);
  }

  private processUpdate(channelName: string, rawData: unknown): void {
    if (channelName === SESSION_INFO_CHANNEL) {
      this.checkSessionChange(rawData);
    }

    if (channelName.endsWith('.z') && typeof rawData === 'string') {
      const decompressed = decompressPayload(rawData);
      if (decompressed !== null) {
        this.localSocketServer.broadcast(channelName, decompressed);
      }
    } else {
      this.localSocketServer.broadcast(channelName, rawData);
    }
  }

  private updateSessionPath(sessionInfo: unknown): void {
    if (
      sessionInfo !== null &&
      sessionInfo !== undefined &&
      typeof sessionInfo === 'object' &&
      'Path' in (sessionInfo as Record<string, unknown>)
    ) {
      const path = (sessionInfo as Record<string, unknown>)['Path'];
      if (typeof path === 'string') {
        this.currentSessionPath = path;
      }
    }
  }

  // Compares incoming SessionInfo.Path to stored value; reconnects on session transition.
  private checkSessionChange(rawData: unknown): void {
    if (rawData === null || rawData === undefined || typeof rawData !== 'object') return;

    const data = rawData as Record<string, unknown>;
    if (!('Path' in data) || typeof data['Path'] !== 'string') return;

    const newPath = data['Path'];
    if (this.currentSessionPath === '' || newPath === this.currentSessionPath) {
      this.currentSessionPath = newPath;
      return;
    }

    Logger.warn(`Session changed: "${this.currentSessionPath}" → "${newPath}". Reconnecting...`);
    this.currentSessionPath = newPath;
    this.localSocketServer.clearCache();
    this.forceReconnect();
  }

  private forceReconnect(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.connect();
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.isConnected = false;
    this.ws = null;

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempts++;

    Logger.info(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => {
      this.isReconnecting = false;
      this.connect();
    }, delay);
  }

  public get isConnectedToF1(): boolean {
    return this.isConnected;
  }
}
