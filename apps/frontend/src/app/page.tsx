'use client';

import { useEffect } from 'react';
import { useF1Store } from '@/store/useF1Store';

const WS_URL = 'ws://localhost:8080';
const HEALTH_URL = 'http://localhost:8081/health';
const HEALTH_POLL_MS = 5_000;

export default function Home() {
  const {
    isWsConnected,
    isApiHealthy,
    lastFrame,
    setWsConnected,
    setApiHealthy,
    setLastFrame,
  } = useF1Store();

  // WebSocket connection to the backend
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const frame = JSON.parse(event.data) as {
          updates: Record<string, unknown>;
        };
        if (frame.updates) {
          console.info('[F1 WS] frame received', frame.updates);
          setLastFrame(frame.updates);
        }
      } catch {
        // Malformed frame — discard silently in the test page
      }
    };

    return () => ws.close();
  }, [setWsConnected, setLastFrame]);

  // Health polling every 5s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(HEALTH_URL);
        setApiHealthy(res.ok);
      } catch {
        setApiHealthy(false);
      }
    };

    poll();
    const id = setInterval(poll, HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [setApiHealthy]);

  return (
    <main
      style={{
        fontFamily: 'monospace',
        padding: '2rem',
        background: '#0a0a0a',
        minHeight: '100vh',
        color: '#fff',
      }}
    >
      <h1>🏎️ F1 Telemetry — Pipe Test</h1>

      <p>
        API Health:{' '}
        <strong style={{ color: isApiHealthy ? '#22c55e' : '#ef4444' }}>
          {isApiHealthy ? '🟢 OK' : '🔴 Offline'}
        </strong>
      </p>

      <p>
        WebSocket:{' '}
        <strong style={{ color: isWsConnected ? '#22c55e' : '#ef4444' }}>
          {isWsConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </strong>
      </p>

      <hr style={{ borderColor: '#333', margin: '1rem 0' }} />

      <h2>Last batch frame</h2>
      <pre
        style={{
          background: '#111',
          padding: '1rem',
          borderRadius: '8px',
          overflowX: 'auto',
          fontSize: '0.75rem',
        }}
      >
        {lastFrame ? JSON.stringify(lastFrame, null, 2) : 'Waiting for data...'}
      </pre>
    </main>
  );
}
