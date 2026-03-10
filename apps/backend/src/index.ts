import { WebSocketServer } from 'ws';
import { F1_SERVER_URL, CHANNELS } from '@f1-telemetry/core';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[Backend] WebSocket server started on ws://localhost:${PORT}`);

// Mock connection logic to F1 SignalR
console.log(`[Backend] Connecting to F1 Live Timing at ${F1_SERVER_URL}...`);

wss.on('connection', (ws) => {
  console.log('[Backend] Client connected to local WebSocket.');

  // Simulate pushing a telemetry event every 2 seconds
  const interval = setInterval(() => {
    const mockTelemetry = {
      channel: CHANNELS.TELEMETRY,
      data: {
        rpm: Math.floor(Math.random() * (12000 - 10000 + 1)) + 10000,
        speed: Math.floor(Math.random() * (320 - 250 + 1)) + 250,
        gear: 8,
        throttle: 100,
        brake: false,
      },
    };
    ws.send(JSON.stringify(mockTelemetry));
  }, 2000);

  ws.on('close', () => {
    console.log('[Backend] Client disconnected.');
    clearInterval(interval);
  });
});
