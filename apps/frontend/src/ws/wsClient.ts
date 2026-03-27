import { SESSION_ACTIVITY_CHANNELS, type ChannelValue } from '@f1-telemetry/core';
import { useConnection } from '@/store/connection';
import { delayBuffer } from '@/ws/wsBuffer';
import { dispatchToStores, resetAllStores } from '@/ws/wsHandler';

const MAX_RETRY_DELAY_MS = 10_000;
const BASE_RETRY_DELAY_MS = 1_000;

/**
 * Singleton WebSocket client living entirely outside React.
 * Handles connection lifecycle with exponential backoff reconnect,
 * parsing, and forwarding to the StreamDelayBuffer.
 */
class F1WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public connect(): void {
    const connStore = useConnection.getState();
    connStore.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      console.error('[WS] Failed to create WebSocket');
      connStore.setStatus('disconnected');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      useConnection.getState().setConnected();
      delayBuffer.start();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : '';
        const parsed = JSON.parse(raw) as {
          snapshot?: boolean;
          updates?: Record<string, unknown>;
        };

        if (!parsed.updates) return;

        // Snapshot: reset all stores then apply full state synchronously (no delay buffer)
        if (parsed.snapshot) {
          resetAllStores();
          for (const [channel, data] of Object.entries(parsed.updates)) {
            dispatchToStores({ channel: channel as ChannelValue, data });
          }
          useConnection.getState().setHasActivity(true);
          return;
        }

        const channels = Object.keys(parsed.updates);
        const hasSessionData = channels.some((ch) =>
          SESSION_ACTIVITY_CHANNELS.has(ch)
        );

        // Only flag live activity when the frame carries real session data
        if (hasSessionData) {
          useConnection.getState().setHasActivity(true);
        }

        for (const [channel, data] of Object.entries(parsed.updates)) {
          delayBuffer.push(channel as ChannelValue, data);
        }
      } catch (error) {
        // Malformed frame — drop and continue
        console.error('[WS] Frame Drop (Malformed):', error);
      }
    };

    this.ws.onclose = () => {
      useConnection.getState().setStatus('reconnecting');
      useConnection.getState().setHasActivity(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
      this.ws?.close();
    };
  }

  public disconnect(): void {
    this.clearReconnect();
    delayBuffer.stop();
    delayBuffer.flush();

    if (this.ws) {
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    const connStore = useConnection.getState();
    connStore.setStatus('disconnected');
    connStore.resetRetry();
    connStore.setHasActivity(false);
  }

  public setUrl(url: string): void {
    this.url = url;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const connStore = useConnection.getState();
    connStore.incrementRetry();

    const delay = Math.min(
      BASE_RETRY_DELAY_MS * Math.pow(2, connStore.retryCount),
      MAX_RETRY_DELAY_MS
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080/ws';

export const wsClient = new F1WebSocketClient(WS_URL);
