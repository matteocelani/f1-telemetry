import { WebSocket, ClientOptions } from 'ws';
import { CHANNELS, F1_SERVER_URL, F1_HUB_NAME } from '@f1-telemetry/core';
import { decompressPayload } from '@services/payload-parser';
import { SocketServer } from '@services/socket-server';
import { Logger } from '@utils/logger';

// F1 Live Timing runs on legacy ASP.NET SignalR — Origin must match the official site
const F1_ORIGIN_URL = 'https://www.formula1.com';
const BASE_RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 60_000;
const CLIENT_PROTOCOL = '1.5';
const WS_TRANSPORT = 'webSockets';
const SESSION_INFO_CHANNEL = 'SessionInfo';

// Pre-encoded once at module load to avoid runtime encodeURIComponent on every reconnect
const CONNECTION_DATA = encodeURIComponent(`[{"name":"${F1_HUB_NAME}"}]`);

const NEGOTIATE_HEADERS: HeadersInit = {
  'User-Agent': 'BestHTTP',
  'Accept-Encoding': 'gzip, deflate',
  Origin: F1_ORIGIN_URL,
  Referer: `${F1_ORIGIN_URL}/`,
};

const WS_BASE_HEADERS: Record<string, string> = {
  'User-Agent': 'BestHTTP',
  Origin: F1_ORIGIN_URL,
};

// All available F1 Live Timing channels — extend CHANNELS in @f1-telemetry/core to add more
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

// Pre-serialised SignalR invocation message — built once, sent on every (re)connect
const SUBSCRIBE_MESSAGE = JSON.stringify({
  H: F1_HUB_NAME,
  M: 'Subscribe',
  A: [SUBSCRIBE_CHANNELS],
  I: 1,
});

type NegotiateResponse = {
  ConnectionToken: string;
};

type SignalRMessage = {
  M: string;
  A: [string, ...unknown[]];
};

type SignalRFrame = {
  M?: SignalRMessage[];
  R?: Record<string, unknown>;
};

export class F1Client {
  private ws: WebSocket | null = null;
  private connectionToken: string = '';
  private sessionCookie: string = '';
  private isReconnecting: boolean = false;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly localSocketServer: SocketServer;

  // Session watchdog: tracks the current F1 session path to detect session transitions
  private currentSessionPath: string = '';

  constructor(localSocketServer: SocketServer) {
    this.localSocketServer = localSocketServer;
  }

  public async connect() {
    if (this.isReconnecting) return;

    try {
      Logger.info(`Negotiating with F1 SignalR at ${F1_SERVER_URL}...`);

      const negotiateUrl = `${F1_SERVER_URL}/negotiate?clientProtocol=${CLIENT_PROTOCOL}&connectionData=${CONNECTION_DATA}`;
      const negotiateResponse = await fetch(negotiateUrl, {
        method: 'GET',
        headers: NEGOTIATE_HEADERS,
      });

      if (!negotiateResponse.ok) {
        throw new Error(`Negotiate failed — HTTP ${negotiateResponse.status}`);
      }

      // The Set-Cookie from negotiate must be forwarded to authenticate the WS upgrade
      const setCookieHeader = negotiateResponse.headers.get('set-cookie');
      this.sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';

      const negotiateData =
        (await negotiateResponse.json()) as NegotiateResponse;
      if (!negotiateData.ConnectionToken) {
        throw new Error('Missing ConnectionToken in negotiate response');
      }

      this.connectionToken = encodeURIComponent(negotiateData.ConnectionToken);

      const wsBase = F1_SERVER_URL.replace('http', 'ws');
      const connectUrl = `${wsBase}/connect?clientProtocol=${CLIENT_PROTOCOL}&transport=${WS_TRANSPORT}&connectionToken=${this.connectionToken}&connectionData=${CONNECTION_DATA}`;

      const wsOptions: ClientOptions = {
        headers: { ...WS_BASE_HEADERS, Cookie: this.sessionCookie },
      };

      this.ws = new WebSocket(connectUrl, wsOptions);
      this.setupListeners();
    } catch (err) {
      Logger.error('Failed to connect to F1 SignalR', err);
      this.scheduleReconnect();
    }
  }

  private setupListeners() {
    if (!this.ws) return;

    this.ws.on('open', async () => {
      Logger.info('Connected to F1 SignalR WebSocket.');
      this.isReconnecting = false;
      this.isConnected = true;
      this.reconnectAttempts = 0;

      try {
        // SignalR requires an explicit /start call after the WebSocket is open
        const startUrl = `${F1_SERVER_URL}/start?clientProtocol=${CLIENT_PROTOCOL}&transport=${WS_TRANSPORT}&connectionToken=${this.connectionToken}&connectionData=${CONNECTION_DATA}`;
        const startResponse = await fetch(startUrl, {
          headers: { Cookie: this.sessionCookie },
        });

        if (!startResponse.ok) {
          throw new Error(
            `SignalR /start failed — HTTP ${startResponse.status}`
          );
        }

        Logger.info('SignalR transport started.');
        this.sendSubscribe();
      } catch (err) {
        Logger.error('Failed to start SignalR transport', err);
      }
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const messageStr = data.toString('utf-8');

        // SignalR sends '{}' as a keep-alive heartbeat — discard silently
        if (messageStr.length < 3) return;

        const frame = JSON.parse(messageStr) as SignalRFrame;

        // Subscribe response: F1 sends full state in the R field.
        // Replace (not merge) the entire stateCache to prevent ghost data from
        // stale sessions or pre-reconnect state leaking through.
        if (frame.R && typeof frame.R === 'object') {
          this.handleSubscribeSnapshot(frame.R);
        }

        if (!frame.M?.length) return;

        for (const message of frame.M) {
          if (!message.A?.length) continue;

          const firstArg = message.A[0];
          const secondArg = message.A[1];

          // Case 1: Direct channel update [ChannelName, Payload]
          if (
            typeof firstArg === 'string' &&
            secondArg !== undefined &&
            message.A.length >= 2
          ) {
            this.processUpdate(firstArg, secondArg);
            continue;
          }

          // Case 2: Bulk feed payload [JSON_String_of_Object]
          if (typeof firstArg === 'string' && firstArg.startsWith('{')) {
            try {
              const feedPayload = JSON.parse(firstArg) as Record<
                string,
                unknown
              >;
              for (const channelName in feedPayload) {
                this.processUpdate(channelName, feedPayload[channelName]);
              }
            } catch (err) {
              Logger.error(
                `Failed to parse bulk feed payload: ${firstArg.substring(0, 50)}...`,
                err
              );
            }
          }
        }
      } catch (err) {
        Logger.error('Error processing SignalR message', err);
      }
    });

    this.ws.on('close', (code: number) => {
      this.isConnected = false;
      Logger.warn(`F1 SignalR closed (code ${code}). Scheduling reconnect...`);
      this.localSocketServer.broadcastControl({ control: 'f1_disconnected' });
      this.scheduleReconnect();
    });

    this.ws.on('error', (err: Error) => {
      // 'error' is always followed by 'close' — log here, reconnect there
      Logger.error('F1 WebSocket error', err);
    });
  }

  // Handles the Subscribe R-field snapshot: decompresses .z channels, then
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

    // Extract session path for the watchdog before replacing state
    this.updateSessionPath(processed[SESSION_INFO_CHANNEL]);

    this.localSocketServer.replaceState(processed);
    this.localSocketServer.broadcastControl({ control: 'f1_reconnected' });
    Logger.info(`Subscribe snapshot applied (${Object.keys(processed).length} channels)`);
  }

  private processUpdate(channelName: string, rawData: unknown) {
    // Session watchdog: detect session transitions on incremental updates
    if (channelName === SESSION_INFO_CHANNEL) {
      this.checkSessionChange(rawData);
    }

    // Channels ending in '.z' are raw DEFLATE-compressed blobs
    if (channelName.endsWith('.z') && typeof rawData === 'string') {
      const decompressed = decompressPayload(rawData);
      if (decompressed !== null) {
        this.localSocketServer.broadcast(channelName, decompressed);
      }
    } else {
      this.localSocketServer.broadcast(channelName, rawData);
    }
  }

  // Extracts and stores the session path from a SessionInfo payload
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

  // Compares incoming SessionInfo.Path to the stored value. If it changed,
  // the F1 timing system switched sessions (e.g. Qualifying → Race).
  // Clear all state and reconnect to get a clean snapshot for the new session.
  private checkSessionChange(rawData: unknown): void {
    if (
      rawData === null ||
      rawData === undefined ||
      typeof rawData !== 'object'
    ) {
      return;
    }

    const data = rawData as Record<string, unknown>;
    if (!('Path' in data) || typeof data['Path'] !== 'string') return;

    const newPath = data['Path'];
    if (this.currentSessionPath === '' || newPath === this.currentSessionPath) {
      this.currentSessionPath = newPath;
      return;
    }

    Logger.warn(
      `Session changed: "${this.currentSessionPath}" → "${newPath}". Clearing state and reconnecting.`
    );
    this.currentSessionPath = newPath;
    this.localSocketServer.clearCache();
    this.forceReconnect();
  }

  // Tears down the current F1 connection and initiates a fresh reconnect
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

  private sendSubscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      // SUBSCRIBE_MESSAGE is pre-serialised at module load to avoid per-call JSON.stringify
      this.ws.send(SUBSCRIBE_MESSAGE);
      Logger.info(`Subscribed to: ${SUBSCRIBE_CHANNELS.join(', ')}`);
    } catch (err) {
      Logger.error('Failed to send Subscribe message', err);
    }
  }

  private scheduleReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.isConnected = false;
    this.ws = null;

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY_MS
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
