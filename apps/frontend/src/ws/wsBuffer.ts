import type { ChannelValue } from '@f1-telemetry/core';
import { MS_PER_SECOND } from '@/constants/numbers';
import { dispatchToStores } from '@/ws/wsHandler';

// Drop frames older than offset + margin, so the buffer never outgrows the active delay window.
const BUFFER_MARGIN_MS = 5_000;
// Cap dispatch per rAF tick to avoid render storms when the delay shrinks with a full buffer.
const MAX_DISPATCH_PER_FRAME = 20;

interface BufferedFrame {
  localTimestamp: number;
  payload: { channel: ChannelValue; data: unknown };
}

/**
 * Ring-buffer implementing TV-sync delay.
 * Holds incoming frames and releases them after the configured offset,
 * so the dashboard stays in sync with the user's broadcast feed.
 */
class StreamDelayBuffer {
  private buffer: BufferedFrame[] = [];
  private offsetMs = 0;
  private isRunning = false;
  private rafId: number | null = null;
  // Tracks when we started receiving frames, used to clamp the UI delay slider to available history.
  private firstFrameAt: number | null = null;

  constructor() {
    this.loop = this.loop.bind(this);
  }

  public setDelay(seconds: number): void {
    this.offsetMs = seconds * MS_PER_SECOND;
  }

  public getDelaySeconds(): number {
    return this.offsetMs / MS_PER_SECOND;
  }

  public getMaxDelaySeconds(): number {
    if (this.firstFrameAt === null) return 0;
    return Math.floor((Date.now() - this.firstFrameAt) / MS_PER_SECOND);
  }

  public push(channel: ChannelValue, data: unknown): void {
    if (this.firstFrameAt === null) {
      this.firstFrameAt = Date.now();
    }
    if (this.offsetMs === 0) {
      // Zero-delay bypass: dispatch immediately for minimum latency
      dispatchToStores({ channel, data });
      return;
    }
    // Time-based cap: drop frames already outside the active delay window.
    const cutoff = Date.now() - (this.offsetMs + BUFFER_MARGIN_MS);
    while (this.buffer.length > 0 && this.buffer[0].localTimestamp < cutoff) {
      this.buffer.shift();
    }
    this.buffer.push({
      localTimestamp: Date.now(),
      payload: { channel, data },
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    // Reset the stream-history tracker on disconnect, but keep it across flush() calls.
    this.firstFrameAt = null;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public flush(): void {
    this.buffer = [];
  }

  // Pause the rAF loop without tearing down state, so an external driver (e.g. setInterval) can run tick().
  public pauseRaf(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resumeRaf(): void {
    if (this.isRunning && this.rafId === null) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  // Runs one drain cycle; callers outside rAF (e.g. background setInterval) can omit the cap.
  public tick(maxDispatch: number = Infinity): void {
    const targetTime = Date.now() - this.offsetMs;
    let dispatched = 0;

    while (
      this.buffer.length > 0 &&
      this.buffer[0].localTimestamp <= targetTime &&
      dispatched < maxDispatch
    ) {
      const frame = this.buffer.shift()!;
      dispatchToStores(frame.payload);
      dispatched++;
    }
  }

  private loop(): void {
    if (!this.isRunning) return;
    this.tick(MAX_DISPATCH_PER_FRAME);
    this.rafId = requestAnimationFrame(this.loop);
  }
}

export const delayBuffer = new StreamDelayBuffer();
